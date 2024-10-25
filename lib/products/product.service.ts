import { DynamoDBClient, ScanCommand } from "@aws-sdk/client-dynamodb";
import { ProductDTO } from './models/product.model';

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
