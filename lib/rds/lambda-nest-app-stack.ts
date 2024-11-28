import * as rds from 'aws-cdk-lib/aws-rds';
import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { aws_secretsmanager as secretsmanager } from 'aws-cdk-lib';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import { join } from 'path';

export class LambdaNestAppStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        const dbCredentialsSecret = new secretsmanager.Secret(this, 'DBCartSecret', {
                secretName: 'DBCartSecretName',
                generateSecretString: {
                    secretStringTemplate: JSON.stringify({ username: 'myadminuser' }),
                    excludePunctuation: true,
                    includeSpace: false,
                    generateStringKey: 'password'
                }
            },
        );

        const vpc = new ec2.Vpc(this, 'CartVpc', { maxAzs: 3, natGateways: 1 });

        const dbInstance = new rds.DatabaseInstance(this, 'CartDBInstance', {
            engine: rds.DatabaseInstanceEngine.postgres({
                version: rds.PostgresEngineVersion.VER_16_4,
            }),
            instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
            vpc,
            multiAz: false,
            publiclyAccessible: true,
            deletionProtection: false,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            databaseName: 'cartDB',
            allocatedStorage: 20,
            maxAllocatedStorage: 100,
            allowMajorVersionUpgrade: false,
            autoMinorVersionUpgrade: true,
            backupRetention: cdk.Duration.days(7),
            deleteAutomatedBackups: true,
            credentials: rds.Credentials.fromSecret(dbCredentialsSecret),
        });

        const lambdaFunction = new lambdaNodejs.NodejsFunction(this, 'NestJsLambdaFunction', {
            runtime: lambda.Runtime.NODEJS_20_X,
            entry: join(__dirname, '..', '..', 'nodejs-aws-cart-api', 'dist', 'main.js'),
            handler: 'handler',
            bundling: {
                externalModules: [ 'aws-sdk', '@nestjs/microservices', 'class-transformer', '@nestjs/websockets/socket-module', 'cache-manager', 'class-validator' ], // Exclude non-runtime dependencies
            },
            timeout: cdk.Duration.seconds(30),
            vpc,
            allowPublicSubnet: true,
            securityGroups: [ dbInstance.connections.securityGroups[0] ],
            environment: {
                DB_HOST: dbInstance.dbInstanceEndpointAddress,
                DB_PORT: dbInstance.dbInstanceEndpointPort,
                DB_NAME: 'cartDB',
                DB_USER: 'myadminuser',
                DB_PASSWORD_SECRET: dbCredentialsSecret.secretValueFromJson('password').unsafeUnwrap(),
            },
        });

        dbInstance.connections.allowDefaultPortFrom(lambdaFunction);
        dbCredentialsSecret.grantRead(lambdaFunction);

        const api = new apigateway.RestApi(this, 'NestApi', {
            restApiName: 'Nest Service',
            description: 'This service serves a Nest.js application.',
        });

        const lambdaIntegration = new apigateway.LambdaIntegration(lambdaFunction);

        dbInstance.secret!.grantRead(lambdaFunction);
        dbInstance.secret!.grantWrite(lambdaFunction);
        dbInstance.connections.allowDefaultPortFrom(lambdaFunction);

        const resource = api.root.addResource('api').addResource('profile').addResource('cart');
        resource.addMethod('GET', lambdaIntegration);
        resource.addMethod('PUT', lambdaIntegration);
    }
}
