import { dynamoActions } from '../aws/dynamoActions';
import { s3Actions } from '../aws/s3Actions';

export interface Event {
  type: string;
  action: string;
  payload: any;
}

export async function eventHandler(event: Event): Promise<any> {
  const { type, action, payload } = event;

  switch (type) {
    case 'dynamo':
      return await handleDynamoEvent(action, payload);
    case 's3':
      return await handleS3Event(action, payload);
    default:
      throw new Error(`Unknown event type: ${type}`);
  }
}

async function handleS3Event(action: string, payload: any): Promise<any> {
  switch (action) {
    case 'put':
      return await s3Actions.handleS3Put(payload);
    case 'get':
      return await s3Actions.handleS3Get(payload);
    case 'delete':
      return await s3Actions.handleS3Delete(payload);
    default:
      throw new Error(`S3 event handling not implemented for action: ${action}`);
  }
};

async function handleDynamoEvent(action: string, payload: any): Promise<any> {
  switch (action) {
    case 'put':
      return await dynamoActions.putItem(payload.tableName, payload.item);
    case 'get':
      return await dynamoActions.getItem(payload.tableName, payload.key);
    case 'query':
      return await dynamoActions.queryItems(payload.tableName, payload.keyCondition);
    case 'delete':
      return await dynamoActions.deleteItem(payload.tableName, payload.key);
    default:
      throw new Error(`Unknown action: ${action}`);
  }
}


