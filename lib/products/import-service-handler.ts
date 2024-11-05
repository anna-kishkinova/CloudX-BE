import {
    CopyObjectCommand,
    DeleteObjectCommand,
    GetObjectCommand,
    GetObjectCommandOutput,
    PutObjectCommand,
    S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Readable } from 'stream';
import * as csv from 'csv-parser';
import { ProductModel } from './models/product.model';
const { SQSClient, SendMessageCommand } = require('@aws-sdk/client-sqs');

const s3Client = new S3Client({ region: process.env.AWS_REGION });
const bucketName = process.env.BUCKET_NAME as string;
const bucketKey = process.env.BUCKET_KEY as string;

const sqsClient = new SQSClient({ region: process.env.AWS_REGION });
const QUEUE_URL = process.env.CATALOG_ITEMS_QUEUE_URL;

export async function importProductsFile(event: any) {
    const filePath = `${ bucketKey }/${ event.pathParameters.fileName }`;
    const client = new S3Client({});
    const command = new PutObjectCommand({ Bucket: bucketName, Key: filePath });

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
    for (const record of event.Records) {
        const bucketNameImport = record.s3.bucket.name;
        console.log('bucketNameImport----', bucketNameImport);
        const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));
        console.log('key----', key);

        try {
            const command = new GetObjectCommand({ Bucket: bucketNameImport, Key: key });
            const response: GetObjectCommandOutput = await s3Client.send(command);
            const { Body } = response;

            if (Body instanceof Readable) {
                console.log('parseCSV start----');
                const csvRecords = await parseCSV(Body, key, bucketNameImport);
                console.log('csvRecords ------', csvRecords);
                await sendRecordsToSQS(csvRecords);
            } else {
                console.error(`Body is not a readable stream for file: ${key}`);
            }
        } catch (error) {
            console.error(`Error processing file ${key}:`, error);
        }
    }

    return {
        statusCode: 200,
        body: JSON.stringify({ message: 'File processed successfully' }),
    };
}

async function parseCSV(fileContent: any, key: string, bucketNameImport: string): Promise<ProductModel[]> {
    return new Promise((resolve, reject) => {
        const results: ProductModel[] = [];

        Readable.from(fileContent)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', async () => {
            const fileName = key.split('/').pop();
            await moveFile(bucketNameImport, key, `parsed/${ fileName }`);

            console.log('parseCSV results -----', results);
            resolve(results);
        })
        .on('error', (error) => reject(error));
    });
}

async function sendRecordsToSQS(records: ProductModel[]): Promise<void> {
    console.log('records ------', records);
    const message = JSON.stringify(records);
    const params = { QueueUrl: QUEUE_URL, MessageBody: message };

    await sqsClient.send(new SendMessageCommand(params));
}

async function moveFile(bucketNameCopy: string, sourceKey: string, destinationKey: string): Promise<void> {
    try {
        await s3Client.send(
            new CopyObjectCommand({
                CopySource: `${bucketNameCopy}/${sourceKey}`,
                Bucket: bucketNameCopy,
                Key: destinationKey,
            }),
        );
        console.log(`Successfully copied ${bucketNameCopy}/${sourceKey} to ${bucketNameCopy}/${destinationKey}`);
    } catch (error) {
        console.error(`Could not copy ${sourceKey} from ${bucketNameCopy}, ${error}`);
    }
}

export async function removeFile(event: any) {
    for (const record of event.Records) {
        const bucketNameDelete = record.s3.bucket.name;
        const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));
        const fileName = key.split('/').pop();

        try {
            await s3Client.send(new DeleteObjectCommand({ Bucket: bucketNameDelete, Key: 'uploaded/' + fileName }));

            console.log(`The object "${'uploaded/' + fileName}" from bucket "${bucketNameDelete}" was deleted`);
        } catch (error) {
            console.error(`Error from S3 while deleting object from ${bucketNameDelete}.  ${error}`);
        }
    }

    return {
        statusCode: 200,
        body: JSON.stringify({ message: 'File removed successfully' }),
    };
}
