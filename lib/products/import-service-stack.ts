import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as path from 'node:path';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as s3Notifications from 'aws-cdk-lib/aws-s3-notifications';

export class ImportServiceStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        const bucket = new s3.Bucket(this, 'ImportBucket', {
            versioned: true,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            cors: [
                {
                    allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.PUT, s3.HttpMethods.POST, s3.HttpMethods.HEAD],
                    allowedOrigins: ['*'],
                    allowedHeaders: ['*'],
                },
            ],
        });

        const importProductsFile = new lambda.Function(this, 'import-products-file', {
            runtime: lambda.Runtime.NODEJS_20_X,
            memorySize: 1024,
            timeout: cdk.Duration.seconds(5),
            handler: 'handler.importProductsFile',
            code: lambda.Code.fromAsset(path.join(__dirname, './')),
            environment: {
                BUCKET_NAME: bucket.bucketName,
                BUCKET_KEY: 'uploaded',
            }
        });

        bucket.grantReadWrite(importProductsFile);

        const api = new apigateway.RestApi(this, "importProductsFile-api", {
            restApiName: "importProductsFile API Gateway",
            description: "This API serves the Lambda functions."
        });

        const ProductsLambdaIntegration = new apigateway.LambdaIntegration(importProductsFile);

        // add GET method
        const importProductsFileResource = api.root.addResource("import");
        const importProductsFileNameResource = importProductsFileResource.addResource('{fileName}');
        importProductsFileNameResource.addMethod('GET', ProductsLambdaIntegration);

        // trigger the lambda function when a file is uploaded to the bucket
        const importFileParserLambda = new lambda.Function(this, 'import-file-parser', {
            runtime: lambda.Runtime.NODEJS_20_X,
            memorySize: 1024,
            timeout: cdk.Duration.seconds(5),
            handler: 'handler.importFileParser',
            code: lambda.Code.fromAsset(path.join(__dirname, './')),
            environment: {
                BUCKET_NAME: bucket.bucketName,
            }
        });

        // addEventNotification is a method that allows you to add a notification configuration to the bucket
        bucket.addEventNotification(
            s3.EventType.OBJECT_CREATED,
            new s3Notifications.LambdaDestination(importFileParserLambda),
        );
    }
}
