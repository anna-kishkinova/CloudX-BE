import { Handler } from 'aws-lambda';
import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { addItemToProductTable, generateId, getProductByIdFromDB, getProductsFromDB } from './product.service';
import { allStaticProducts } from './mocks/products.mock';
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const dynamoDB = new DynamoDBClient({ region: process.env.AWS_REGION });

export const productsTableName = process.env.PRODUCTS_TABLE_NAME as string;
export const stockTableName = process.env.STOCK_TABLE_NAME as string;
export const bucketName = process.env.BUCKET_NAME as string;
export const bucketKey = process.env.BUCKET_KEY as string;

export async function main(event: any) {
    const productId = event.pathParameters ? event.pathParameters.id : null;

    return {
        statusCode: 200,
        headers: {
            "Access-Control-Allow-Headers": "Content-Type",
            "Access-Control-Allow-Origin": "https://d3l8dacur07qr1.cloudfront.net",
            "Access-Control-Allow-Methods": "OPTIONS, GET",
        },
        body: JSON.stringify(productId ? await getProductByIdFromDB(productId) : await getProductsFromDB()),
    };
}

export async function addProduct(event: any) {
    return {
        statusCode: 200,
        headers: {
            "Access-Control-Allow-Headers": "Content-Type",
            "Access-Control-Allow-Origin": "https://d3l8dacur07qr1.cloudfront.net",
            "Access-Control-Allow-Methods": "OPTIONS, POST",
        },
        body: JSON.stringify(await addItemToProductTable(JSON.parse(event.body))),
    };
}

export const createData: Handler = async (): Promise<void> => {
    try {
        for (const item of allStaticProducts) {
            const productId = generateId();
            const createProductCommand = new PutItemCommand({
                TableName: productsTableName,
                Item: {
                    id: { S: productId },
                    title: { S: item.title },
                    description: { S: item.description },
                    price: { N: item.price.toString() },
                }
            });

            const productResult = await dynamoDB.send(createProductCommand);
            console.log('createProductCommand succeeded:', JSON.stringify(productResult, null, 2));

            const createStockCommand = new PutItemCommand({
                TableName: stockTableName,
                Item: {
                    product_id: { S: productId },
                    count: { N: item.count.toString() },
                }
            });
            const stockResult = await dynamoDB.send(createStockCommand);
            console.log('createStockCommand succeeded:', JSON.stringify(stockResult, null, 2));
        }
    } catch (error) {
        console.error('Error:', error);
        throw new Error('Error adding item to DynamoDB table');
    }
};

export async function importProductsFile(event: any) {
    const filePath = `${ bucketKey }/${ event.pathParameters.fileName }`;
    const client = new S3Client({});
    const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: filePath,
    });

    try {
        const signedUrl = await getSignedUrl(client, command);

        return {
            statusCode: 200,
            headers: {
                "Access-Control-Allow-Headers": "Content-Type",
                "Access-Control-Allow-Origin": "https://d3l8dacur07qr1.cloudfront.net",
                "Access-Control-Allow-Methods": "OPTIONS, GET",
            },
            body: JSON.stringify(signedUrl),
        };
    } catch (error) {
        console.error('Error importing file to bucket: ', error);

        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Could not import file to bucket and generate signed URL' }),
        };
    }
}
export async function importFileParser(event: any) {
    console.log('Event: ------- ', event);

    return {
        statusCode: 200,
        body: JSON.stringify({ message: 'File parsed successfully' }),
    };
}
