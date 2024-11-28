#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { ProductsLambdaStack } from '../lib/products/products-lambda-stack';
import { ImportServiceStack } from '../lib/products/import-service-stack';
import { ProductSqsStack } from '../lib/products/product-sqs-stack';
import { ProductSnsStack } from '../lib/product-sns/product-sns-stack';
import { AuthorizationServiceStack } from '../lib/products/authorization-service-stack';
import { LambdaNestAppStack } from '../lib/rds/lambda-nest-app-stack';

const app = new cdk.App();
const envAPS  = { account: '597088041300', region: 'us-east-1' };
// new AuthorizationServiceStack(app, 'AuthorizationServiceStack');
// new ProductsLambdaStack(app, 'ProductsLambdaStack');
// new ProductSqsStack(app, "ProductSqsStack");
// new ImportServiceStack(app, 'ImportServiceStack', {});
// new ProductSnsStack(app, "ProductSnsStack");
new LambdaNestAppStack(app, "LambdaNestAppStack", { env: envAPS });





