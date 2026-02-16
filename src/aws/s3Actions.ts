import { S3Client, ListBucketsCommand, ListObjectsCommand, GetObjectCommand, PutObjectCommand, CreateBucketCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({ 
  region: process.env.AWS_REGION || 'us-east-1',
  apiVersion: "2006-03-01" 
});

export const s3Actions = {
  async handleS3Get(payload: any): Promise<any> {
    switch (payload.action) {
      case 'listBuckets':
        return await listBuckets();
      case 'listObjects':
        return await listObjects(payload.bucketName);
      case 'getObject':
        return await getObject(payload.bucketName, payload.objectKey);
      default:
        throw new Error(`Unknown S3 action: ${payload.action}`);
    }
  },
  async handleS3Put(payload: any): Promise<any> {
    switch (payload.action) {
      case 'createBucket':
        return await createBucket(payload);
      case 'putObject':
        return await putObject(payload);
      default:
        throw new Error(`Unknown S3 action: ${payload.action}`);
    }
  },
  async handleS3Delete(payload: any): Promise<any> {
    const { bucketName, objectKey } = payload;
    const response = await s3.send(new DeleteObjectCommand({
      Bucket: bucketName,
      Key: objectKey
    }));
    return response;
  },
};

async function createBucket(payload: any): Promise<any> {
    const { bucketName } = payload.bucketName;
    const response = await s3.send(new CreateBucketCommand({
      Bucket: bucketName
    }));
    return response;
};

async function putObject(payload: any): Promise<any> {
    const { bucketName, objectKey, body } = payload;
    const response = await s3.send(new PutObjectCommand({
      Bucket: bucketName,
      Key: objectKey,
      Body: body
    }));
    return response;
};

async function listBuckets(): Promise<any> {
    const command = new ListBucketsCommand({});
    const response = await s3.send(command);
    return response.Buckets || [];
};
async function listObjects(bucketName: string): Promise<any> {
    const command = new ListObjectsCommand({ Bucket: bucketName });
    const response = await s3.send(command);
    return response.Contents || [];
};

async function getObject(bucketName: string, objectKey: string): Promise<any> {
    const command = new GetObjectCommand({ Bucket: bucketName, Key: objectKey });
    const response = await s3.send(command);
    return response.Body;
};
