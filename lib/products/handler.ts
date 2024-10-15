import { getOneProductById, getProducts } from './product.service';

export async function main(event: any) {
    const productId = event.pathParameters ? event.pathParameters.id : null;
    const requestType = event.httpMethod;

    return {
        statusCode: 200,
        headers: {
            "Access-Control-Allow-Headers" : "Content-Type",
            "Access-Control-Allow-Origin": "https://d215txe1wllrtv.cloudfront.net",
            "Access-Control-Allow-Methods": "GET"
        },
        body: JSON.stringify(productId ? getOneProductById(productId) : getProducts()),
    };
}
