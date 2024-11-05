import { DynamoDBClient, PutItemCommand, ScanCommand, BatchWriteItemCommand } from "@aws-sdk/client-dynamodb";
import { ProductDTO, ProductModel } from '../models/product.model';
import { v4 as uuidv4 } from 'uuid';

const dynamoDB = new DynamoDBClient({ region: process.env.AWS_REGION });
export const productsTableName = process.env.PRODUCTS_TABLE_NAME as string;
export const stockTableName = process.env.STOCK_TABLE_NAME as string;

export async function getProductsFromDB(): Promise<ProductDTO[]> {
    try {
        const products = await dynamoDB.send(new ScanCommand({ TableName: productsTableName }));
        const stockData = await dynamoDB.send(new ScanCommand({ TableName: stockTableName }));

        if (products.Items && stockData.Items) {
            console.log('Data retrieved:', products.Items);

            return products.Items.map((item) => {
                const stockItem = stockData.Items?.find((stock) => stock.product_id.S === item.id.S);

                return {
                    count: stockItem?.count.N ? Number(stockItem?.count.N) : 0,
                    description: item.description.S,
                    id: item.id.S,
                    price: Number(item.price.N),
                    title: item.title.S,
                } as ProductDTO;
            }) as ProductDTO[];
        } else {
            console.log('Item not found');
        }
    } catch (error) {
        console.error('Error fetching data:', error);
    }
    return [] as ProductDTO[];
}

export async function getProductByIdFromDB(id: string): Promise<ProductDTO> {
    try {
        const products = await dynamoDB.send(new ScanCommand({
            TableName: productsTableName,
            FilterExpression: 'id = :id',
            ExpressionAttributeValues: { ':id': { S: id } },
        }));

        const stockData = await dynamoDB.send(new ScanCommand({
            TableName: stockTableName,
            FilterExpression: 'product_id = :id',
            ExpressionAttributeValues: { ':id': { S: id } },
        }));

        if (products.Items) {
            return {
                count: stockData.Items ? Number(stockData.Items[0].count.N) : 0,
                description: products.Items[0].description.S || '',
                id: products.Items[0].id.S || '',
                price: Number(products.Items[0].price.N),
                title: products.Items[0].title.S || '',
            }
        }

    } catch (error) {
        console.error('Error fetching data:', error);
    }
    return {} as ProductDTO;
}

export async function addItemToProductTable(item: ProductModel): Promise<ProductDTO> {
    try {
        const productId = uuidv4();
        const addProductCommand = new PutItemCommand({
            TableName: productsTableName,
            Item: {
                id: { S: productId },
                title: { S: item.title },
                description: { S: item.description },
                price: { N: item.price.toString() },
            }
        });
        const productResult = await dynamoDB.send(addProductCommand);
        console.log('add product command succeeded:', JSON.stringify(productResult, null, 2));

        const addStockCommand = new PutItemCommand({
            TableName: stockTableName,
            Item: {
                product_id: { S: productId },
                count: { N: item.count.toString() },
            }
        });
        const stockResult = await dynamoDB.send(addStockCommand);
        console.log('createStockCommand succeeded:', JSON.stringify(stockResult, null, 2));

        return {
            id: productId,
            title: item.title,
            description: item.description,
            price: item.price,
            count: item.count,
        }
    } catch (error) {
        console.error('Error:', error);
        throw new Error('Error adding item to DynamoDB table');
    }
}

export async function addItemsToProductTable(items: ProductModel[]): Promise<ProductDTO[]> {
    const preparedProductItems = items.map((item) => {
        const productId = uuidv4();
        return {
            PutRequest: {
                Item: {
                    id: { S: productId },
                    title: { S: item.title },
                    description: { S: item.description },
                    price: { N: item.price.toString() },
                    count: { N: item.count.toString() },
                }
            }
        }
    });
    const preparedStockItems = preparedProductItems.map((item) => {
        return {
            PutRequest: {
                Item: {
                    product_id: { S: item.PutRequest.Item.id.S },
                    count: { S: item.PutRequest.Item.count.N },
                }
            }
        }
    });
    try {
        const addProductsParams = { RequestItems: { productsTableName: [...preparedProductItems] } };
        const addProductsCommand = new BatchWriteItemCommand(addProductsParams);
        const addProductsResult = await dynamoDB.send(addProductsCommand);
        console.log('add product command succeeded:', JSON.stringify(addProductsResult, null, 2));

        const addStockParams = { RequestItems: { stockTableName: [...preparedStockItems] } };
        const addStocksCommand = new BatchWriteItemCommand(addStockParams);
        const addStockResult = await dynamoDB.send(addStocksCommand);
        console.log('createStockCommand succeeded:', JSON.stringify(addStockResult, null, 2));

        return preparedProductItems.map((item) => {
            return {
                id: item.PutRequest.Item.id.S,
                title: item.PutRequest.Item.title.S,
                description: item.PutRequest.Item.description.S,
                price: Number(item.PutRequest.Item.price.N),
                count: Number(item.PutRequest.Item.count.N),
            }
        });
    } catch (error) {
        console.error('Error:', error);
        throw new Error('Error adding item to DynamoDB table');
    }
}
