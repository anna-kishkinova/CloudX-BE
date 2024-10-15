import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as cdk from 'aws-cdk-lib';
import * as path from 'path';
import { Construct } from 'constructs';
import * as apigateway from "aws-cdk-lib/aws-apigateway";

export class ProductsLambdaStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        const lambdaFunction = new lambda.Function(this, 'getProductsList', {
            runtime: lambda.Runtime.NODEJS_20_X,
            memorySize: 1024,
            timeout: cdk.Duration.seconds(5),
            handler: 'handler.main',
            code: lambda.Code.fromAsset(path.join(__dirname, './')),
        });

        const api = new apigateway.RestApi(this, "products-api", {
            restApiName: "Products API Gateway",
            description: "This API serves the Lambda functions."
        });

        const ProductsLambdaIntegration = new apigateway.LambdaIntegration(lambdaFunction, {});
        const productsResource = api.root.addResource("products");
        productsResource.addMethod('GET', ProductsLambdaIntegration);
    }
}

