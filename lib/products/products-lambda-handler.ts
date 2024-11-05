import { Handler } from 'aws-lambda';
import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { addItemToProductTable, getProductByIdFromDB, getProductsFromDB } from './services/product.service';
import { allStaticProducts } from './mocks/products.mock';
import { v4 as uuidv4 } from 'uuid';

const dynamoDB = new DynamoDBClient({ region: process.env.AWS_REGION });

export const productsTableName = process.env.PRODUCTS_TABLE_NAME as string;
export const stockTableName = process.env.STOCK_TABLE_NAME as string;

export async function main(event: any) {
    const productId = event.pathParameters ? event.pathParameters.id : null;

    return {
        statusCode: 200,
        headers: {
            "Access-Control-Allow-Headers": "Content-Type",
            "Access-Control-Allow-Origin": "https://dek2phf9zw8te.cloudfront.net",
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
            "Access-Control-Allow-Origin": "https://dek2phf9zw8te.cloudfront.net",
            "Access-Control-Allow-Methods": "OPTIONS, POST",
        },
        body: JSON.stringify(await addItemToProductTable(JSON.parse(event.body))),
    };
}

export const createData: Handler = async (): Promise<void> => {
    try {
        for (const item of allStaticProducts) {
            const productId = uuidv4();
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
