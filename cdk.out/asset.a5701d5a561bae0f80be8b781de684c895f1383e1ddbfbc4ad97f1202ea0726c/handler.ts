import { getProducts } from './product.service';

export async function main() {
    return {
        statusCode: 200,
        // You have to handle CORS headers on your own
        headers: {
            "Access-Control-Allow-Headers" : "Content-Type",
            "Access-Control-Allow-Origin": "YOUR_URL",
            "Access-Control-Allow-Methods": "GET"
        },
        body: JSON.stringify(getProducts()),
    }
}
