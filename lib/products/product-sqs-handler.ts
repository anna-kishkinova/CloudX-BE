import { SQSEvent } from "aws-lambda";
import { addItemsToProductTable } from './services/product.service';
import { ProductDTO } from './models/product.model';
const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');

const CREATE_PRODUCT_TOPIC_ARN = process.env.CREATE_PRODUCT_TOPIC_ARN;
const snsClient = new SNSClient({ region: process.env.AWS_REGION });

export async function catalogBatchProcess(event: SQSEvent) {
    console.log("Received message:", event.Records[0].body);

    for (const record of event.Records) {
        const products = JSON.parse(record.body);

        console.log('body-------', products);

        try {
            const res = await addItemsToProductTable(products);
            console.log(`Products created: ${ JSON.stringify(products) }`);

            await sendSnsMessage(res);
            console.log(`Notification sent: ${ JSON.stringify(res) }`);

        } catch (error: any) {
            console.error(`Error creating product: ${ error.message }`);

            throw new Error(`Failed to create product: ${ JSON.stringify(products) }`);
        }
    }

    return {
        statusCode: 200,
        body: JSON.stringify({ message: 'Products processed successfully' }),
    };
}

async function sendSnsMessage(product: ProductDTO[]) {
    const snsMessage = { default: JSON.stringify(product) };
    const params = {
        Message: JSON.stringify(snsMessage),
        MessageStructure: 'json',
        TopicArn: CREATE_PRODUCT_TOPIC_ARN,
    };

    try {
        await snsClient.send(new PublishCommand(params));

        console.log(`Product created`);
    } catch (error: any) {
        console.error(`Error sending SNS message: ${ error.message }`);
    }
}
