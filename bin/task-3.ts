#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { ProductsLambdaStack } from '../lib/products/products-lambda-stack';
import { ImportServiceStack } from '../lib/products/import-service-stack';

const app = new cdk.App();
// new ProductsLambdaStack(app, 'ProductsLambdaStack');
new ImportServiceStack(app, 'ImportServiceStack', {});




