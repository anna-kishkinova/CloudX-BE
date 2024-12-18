import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as path from 'node:path';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as s3Notifications from 'aws-cdk-lib/aws-s3-notifications';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import { importProductsFileApiId } from './constants/constants';
import * as iam from 'aws-cdk-lib/aws-iam';


export class ImportServiceStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        const existingQueueArn = 'arn:aws:sqs:us-east-1:597088041300:CatalogItemsQueue';
        const authorizationLambdaArn = 'arn:aws:lambda:us-east-1:597088041300:function:AuthorizationServiceStack-authorizationlambda16478-5alkJEBxyNvh';
        const catalogItemsQueue = sqs.Queue.fromQueueArn(this, 'ExistingCatalogItemsQueue', existingQueueArn);

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
            handler: 'import-service-handler.importProductsFile',
            code: lambda.Code.fromAsset(path.join(__dirname, './')),
            environment: {
                BUCKET_NAME: bucket.bucketName,
                BUCKET_KEY: 'uploaded',
            }
        });

        bucket.grantReadWrite(importProductsFile);

        const ProductsLambdaIntegration = new apigateway.LambdaIntegration(importProductsFile);

        // add authorization to the lambda function
        const existingAuthorizationLambda = lambda.Function.fromFunctionArn(
            this,
            'ImportedAuthorizationLambda',
            authorizationLambdaArn
        );

        const api = new apigateway.RestApi(this, importProductsFileApiId, {
            restApiName: "importProductsFile API Gateway",
            description: "This API serves the Lambda functions."
        });

        existingAuthorizationLambda.addPermission('AllowAPIGatewayInvoke', {
            principal: new iam.ServicePrincipal('apigateway.amazonaws.com'),
            action: 'lambda:InvokeFunction',
            sourceArn: api.arnForExecuteApi(),
        });

        const lambdaAuthorizer = new apigateway.RequestAuthorizer(this, 'LambdaAuthorizerFn', {
            handler: existingAuthorizationLambda,
            identitySources: [apigateway.IdentitySource.header('Authorization')],
            assumeRole: new iam.Role(this, 'LambdaAuthorizerRole', {
                assumedBy: new iam.ServicePrincipal('apigateway.amazonaws.com'),
            }),
        });

        // add GET method
        const importProductsFileResource = api.root.addResource("import");
        const importProductsFileNameResource = importProductsFileResource.addResource('{fileName}');
        importProductsFileNameResource.addMethod('GET', ProductsLambdaIntegration,
            {
                authorizer: lambdaAuthorizer,
                authorizationType: apigateway.AuthorizationType.CUSTOM,
            },
        );

        // trigger the lambda function when a file is uploaded to the bucket
        const importFileParserLambda = new lambda.Function(this, 'import-file-parser', {
            runtime: lambda.Runtime.NODEJS_20_X,
            memorySize: 1024,
            timeout: cdk.Duration.seconds(10),
            handler: 'import-service-handler.importFileParser',
            code: lambda.Code.fromAsset(path.join(__dirname, './')),
            environment: {
                CATALOG_ITEMS_QUEUE_URL: catalogItemsQueue.queueUrl,
            },
        });

        bucket.grantReadWrite(importFileParserLambda);
        catalogItemsQueue.grantSendMessages(importFileParserLambda);

        // trigger the lambda function when a file is copied from uploaded to parsed folder
        const removeFileLambda = new lambda.Function(this, 'remove-file', {
            runtime: lambda.Runtime.NODEJS_20_X,
            memorySize: 1024,
            timeout: cdk.Duration.seconds(5),
            handler: 'import-service-handler.removeFile',
            code: lambda.Code.fromAsset(path.join(__dirname, './')),
        });

        bucket.grantDelete(removeFileLambda);

        bucket.addEventNotification(
            s3.EventType.OBJECT_CREATED_PUT,
            new s3Notifications.LambdaDestination(importFileParserLambda),
            { prefix: 'uploaded' },
        );

        bucket.addEventNotification(
            s3.EventType.OBJECT_CREATED,
            new s3Notifications.LambdaDestination(removeFileLambda),
            { prefix: 'parsed' },
        );
    }
}
