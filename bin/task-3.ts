#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { ProductsLambdaStack } from '../lib/products/products-lambda-stack';

const app = new cdk.App();
new ProductsLambdaStack(app, 'ProductsLambdaStack');



