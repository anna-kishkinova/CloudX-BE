import { getProducts } from './product.service';

export async function main() {
    return {
        body: JSON.stringify(getProducts()),
        statusCode: 200,
    };
}
