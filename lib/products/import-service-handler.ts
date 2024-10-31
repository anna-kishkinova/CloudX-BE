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

const s3Client = new S3Client({ region: process.env.AWS_REGION });
const bucketName = process.env.BUCKET_NAME as string;
const bucketKey = process.env.BUCKET_KEY as string;

export async function importProductsFile(event: any) {
    const filePath = `${ bucketKey }/${ event.pathParameters.fileName }`;
    const client = new S3Client({});
    const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: filePath,
    });

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
        const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));

        try {
            const command = new GetObjectCommand({ Bucket: bucketNameImport, Key: key });
            const response: GetObjectCommandOutput = await s3Client.send(command);
            const { Body } = response;

            if (Body instanceof Readable) {
                Body
                .pipe(csv())
                .on('data', (data) => (console.log('Record:', JSON.stringify(data))))
                .on('end', async () => {
                    const fileName = key.split('/').pop();
                    await moveFile(bucketNameImport, key, `parsed/${fileName}`);
                })
                .on('error', (err) => (console.error(`Error processing file ${key}:`, err)));
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

async function moveFile(bucketNameCopy: string, sourceKey: string, destinationKey: string) {
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
            await s3Client.send(
                new DeleteObjectCommand({
                    Bucket: bucketNameDelete,
                    Key: 'uploaded/' + fileName,
                }),
            );
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
