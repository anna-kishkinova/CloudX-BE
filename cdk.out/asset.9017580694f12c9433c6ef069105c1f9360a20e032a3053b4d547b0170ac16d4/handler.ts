import { getOneProductById, getProducts } from './product.service';

export async function main() {
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

export async function getOneProduct(id: string) {
    return {
        statusCode: 200,
        headers: {
            "Access-Control-Allow-Headers" : "Content-Type",
            "Access-Control-Allow-Origin": "https://d215txe1wllrtv.cloudfront.net",
            "Access-Control-Allow-Methods": "GET"
        },
        body: JSON.stringify(getOneProductById(id)),
    }
}
