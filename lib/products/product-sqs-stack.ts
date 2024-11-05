import * as path from "path";
import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as sqs from "aws-cdk-lib/aws-sqs";
import { SqsEventSource } from "aws-cdk-lib/aws-lambda-event-sources";
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { productsTableName, stockTableName } from './constants/constants';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as subscriptions from 'aws-cdk-lib/aws-sns-subscriptions';

export class ProductSqsStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        // Create the SQS queue
        const catalogItemsQueue = new sqs.Queue(this, 'CatalogItemsQueue', {
            queueName: 'CatalogItemsQueue',
            retentionPeriod: cdk.Duration.days(14),
        });

        // Create the SNS queue
        const createProductTopic = new sns.Topic(this, 'CreateProductTopic', {
            displayName: 'Create Product Topic',
        });
        createProductTopic.addSubscription(new subscriptions.EmailSubscription('anna.kishkinova@gmail.com'));

        const productsTable = dynamodb.Table.fromTableName(this, 'ExistingProductsTable', productsTableName);
        const stockTable = dynamodb.Table.fromTableName(this, 'ExistingStockTable', stockTableName);

        // Create the Lambda function
        const catalogBatchProcess = new lambda.Function(this, 'CatalogBatchProcess', {
            runtime: lambda.Runtime.NODEJS_20_X,
            memorySize: 1024,
            timeout: cdk.Duration.seconds(5),
            handler: "product-sqs-handler.catalogBatchProcess",
            code: lambda.Code.fromAsset(path.join(__dirname, "./")),
            environment: {
                PRODUCTS_TABLE_NAME: productsTableName,
                STOCK_TABLE_NAME: stockTableName,
                CREATE_PRODUCT_TOPIC_ARN: createProductTopic.topicArn,
            }
        });

        // Grant the Lambda function permissions to read messages from the queue
        catalogItemsQueue.grantConsumeMessages(catalogBatchProcess);

        catalogBatchProcess.addEventSource(new SqsEventSource(catalogItemsQueue, { batchSize: 5 }));

        productsTable.grantWriteData(catalogBatchProcess);
        productsTable.grantFullAccess(catalogBatchProcess);
        stockTable.grantWriteData(catalogBatchProcess);
        stockTable.grantFullAccess(catalogBatchProcess);

        // Grant the Lambda function permission to publish to the SNS topic
        createProductTopic.grantPublish(catalogBatchProcess);
    }
}
