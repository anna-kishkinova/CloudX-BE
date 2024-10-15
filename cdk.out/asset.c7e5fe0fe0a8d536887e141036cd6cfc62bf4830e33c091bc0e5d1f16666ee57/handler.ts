import { getOneProductById, getProducts } from './product.service';

export async function main(event: any) {

    const productId = event.pathParameters ? event.pathParameters.id : null;
    if (event.httpMethod === 'GET' && productId) {
        return {
            statusCode: 200,
            headers: {
                "Access-Control-Allow-Headers" : "Content-Type",
                "Access-Control-Allow-Origin": "https://d215txe1wllrtv.cloudfront.net",
                "Access-Control-Allow-Methods": "GET"
            },
            body: JSON.stringify(getOneProductById(productId)),
        }
    } else {
        return {
            statusCode: 200,
            headers: {
                "Access-Control-Allow-Headers" : "Content-Type",
                "Access-Control-Allow-Origin": "https://d215txe1wllrtv.cloudfront.net",
                "Access-Control-Allow-Methods": "GET"
            },
            body: JSON.stringify(getProducts()),
        }
    }
}
