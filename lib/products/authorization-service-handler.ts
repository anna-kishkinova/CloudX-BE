import * as dotenv from 'dotenv';

dotenv.config({ path: './.env' });

export async function basicAuthorizer(event: any) {
    const authHeader = event.headers && event.headers.Authorization;
    const methodArn = event.methodArn;

    if (!authHeader) {
        throw new Error('Unauthorized');
    }

    const matches = authHeader.match(/^Basic (.+)$/);
    if (!matches) {
        throw new Error('Unauthorized');
    }

    const encodedCredentials = matches[1];
    let decodedCredentials;
    try {
        decodedCredentials = atob(encodedCredentials);
    } catch (err) {
        throw new Error('Unauthorized');
    }

    const [ username, password ] = decodedCredentials.split(':');
    const validUserName = process.env.USER_NAME;
    const validPassword = process.env.PASSWORD;

    return validUserName === username && validPassword === password
        ? {
            policyDocument: {
                Version: '2012-10-17',
                Statement: [ { Action: 'execute-api:Invoke', Effect: 'Allow', Resource: methodArn } ],
            }
        }
        : {
            policyDocument: {
                Version: '2012-10-17',
                Statement: [ { Action: 'execute-api:Invoke', Effect: 'Deny', Resource: methodArn } ],
            },
        };
}
