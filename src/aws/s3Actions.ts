import { S3Client, ListBucketsCommand, ListObjectsCommand, GetObjectCommand, PutObjectCommand, CreateBucketCommand, DeleteObjectCommand, GetBucketLocationCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({ 
  region: process.env.AWS_REGION || 'us-east-1',
  apiVersion: "2006-03-01" 
});

// Helper function to get S3 client for specific bucket region
async function getS3ClientForBucket(bucketName: string): Promise<S3Client> {
  try {
    // First try to get bucket location
    const locationCommand = new GetBucketLocationCommand({ Bucket: bucketName });
    const locationResponse = await s3.send(locationCommand);
    
    // LocationConstraint is null for us-east-1
    const bucketRegion = locationResponse.LocationConstraint || 'us-east-1';
    
    // If bucket is in same region, return existing client
    if (bucketRegion === (process.env.AWS_REGION || 'us-east-1')) {
      return s3;
    }
    
    // Create new client for bucket's region
    return new S3Client({
      region: bucketRegion,
      apiVersion: "2006-03-01"
    });
  } catch (error) {
    // If we can't determine region, return default client
    console.error('Error determining bucket region:', error);
    return s3;
  }
}

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
    const s3Client = await getS3ClientForBucket(bucketName);
    const response = await s3Client.send(new DeleteObjectCommand({
      Bucket: bucketName,
      Key: objectKey
    }));
    return response;
  },
};

async function createBucket(payload: any): Promise<any> {
    const { bucketName } = payload;
    const region = process.env.AWS_REGION || 'us-east-1';
    
    const params: any = {
      Bucket: bucketName
    };
    
    // For regions other than us-east-1, you must specify LocationConstraint
    if (region !== 'us-east-1') {
      params.CreateBucketConfiguration = {
        LocationConstraint: region
      };
    }
    
    const response = await s3.send(new CreateBucketCommand(params));
    return response;
};

async function putObject(payload: any): Promise<any> {
    const { bucketName, objectKey, body } = payload;
    const s3Client = await getS3ClientForBucket(bucketName);
    const response = await s3Client.send(new PutObjectCommand({
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
    const s3Client = await getS3ClientForBucket(bucketName);
    const command = new ListObjectsCommand({ Bucket: bucketName });
    const response = await s3Client.send(command);
    return response.Contents || [];
};

async function getObject(bucketName: string, objectKey: string): Promise<any> {
    const s3Client = await getS3ClientForBucket(bucketName);
    const command = new GetObjectCommand({ Bucket: bucketName, Key: objectKey });
    const response = await s3Client.send(command);
    return response.Body;
};
