#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { ProductsLambdaStack } from '../lib/products/products-lambda-stack';
import { ImportServiceStack } from '../lib/products/import-service-stack';
import { ProductSqsStack } from '../lib/products/product-sqs-stack';
import { ProductSnsStack } from '../lib/product-sns/product-sns-stack';
import { AuthorizationServiceStack } from '../lib/products/authorization-service-stack';

const app = new cdk.App();
new AuthorizationServiceStack(app, 'AuthorizationServiceStack');
new ProductsLambdaStack(app, 'ProductsLambdaStack');
new ProductSqsStack(app, "ProductSqsStack");
new ImportServiceStack(app, 'ImportServiceStack', {});
new ProductSnsStack(app, "ProductSnsStack");





