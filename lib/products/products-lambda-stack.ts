import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as cdk from 'aws-cdk-lib';
import * as path from 'path';
import { Construct } from 'constructs';
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { join } from 'path';

const productsTableName = 'products';
const stockTableName = 'stock';

export class ProductsLambdaStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        const productsTable = new dynamodb.Table(this, "products", {
            tableName: productsTableName,
            partitionKey: {
                name: "id",
                type: dynamodb.AttributeType.STRING,
            },
            sortKey: {
                name: "title",
                type: dynamodb.AttributeType.STRING,
            },
        });

        const stockTable = new dynamodb.Table(this, "stock", {
            tableName: stockTableName,
            partitionKey: {
                name: "product_id",
                type: dynamodb.AttributeType.STRING,
            },
            sortKey: {
                name: "count",
                type: dynamodb.AttributeType.NUMBER,
            },
        });

        const createDataLambda = new lambda.Function(this, 'create-data-lambda-function', {
            runtime: lambda.Runtime.NODEJS_20_X,
            memorySize: 1024,
            timeout: cdk.Duration.seconds(5),
            handler: 'handler.createData',
            code: lambda.Code.fromAsset(join(__dirname, './')),
            environment: {
                PRODUCTS_TABLE_NAME: productsTableName,
                STOCK_TABLE_NAME: stockTableName,
            }
        });

        productsTable.grantWriteData(createDataLambda);
        stockTable.grantWriteData(createDataLambda);

        const getProductsLambda = new lambda.Function(this, 'getProductsList', {
            runtime: lambda.Runtime.NODEJS_20_X,
            memorySize: 1024,
            timeout: cdk.Duration.seconds(5),
            handler: 'handler.main',
            code: lambda.Code.fromAsset(path.join(__dirname, './')),
            environment: {
                PRODUCTS_TABLE_NAME: productsTableName,
                STOCK_TABLE_NAME: stockTableName,
            }
        });

        productsTable.grantReadData(getProductsLambda);
        stockTable.grantReadData(getProductsLambda);

        const addProductLambda = new lambda.Function(this, 'addProductLambda', {
            runtime: lambda.Runtime.NODEJS_20_X,
            memorySize: 1024,
            timeout: cdk.Duration.seconds(5),
            handler: 'handler.addProduct',
            code: lambda.Code.fromAsset(path.join(__dirname, './')),
            environment: {
                PRODUCTS_TABLE_NAME: productsTableName,
                STOCK_TABLE_NAME: stockTableName,
            }
        });

        productsTable.grantWriteData(addProductLambda);
        stockTable.grantWriteData(addProductLambda);

        const api = new apigateway.RestApi(this, "products-api", {
            restApiName: "Products API Gateway",
            description: "This API serves the Lambda functions."
        });

        const ProductsLambdaIntegration = new apigateway.LambdaIntegration(getProductsLambda);

        // add GET method
        const productsResource = api.root.addResource("products");
        productsResource.addMethod('GET', ProductsLambdaIntegration);

        // add GET/:id method
        const productIdResource = productsResource.addResource('{id}');
        productIdResource.addMethod('GET', ProductsLambdaIntegration);

        // add POST/:id method
        const AddProductLambdaIntegration = new apigateway.LambdaIntegration(addProductLambda);
        productsResource.addMethod('POST', AddProductLambdaIntegration);
    }
}

