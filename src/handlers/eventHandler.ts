import { dynamoActions } from '../aws/dynamoActions';

export interface Event {
  action: string;
  payload: any;
}

export async function eventHandler(event: Event): Promise<any> {
  const { action, payload } = event;

  switch (action) {
    case 'put':
      return await handlePut(payload);
    case 'get':
      return await handleGet(payload);
    case 'query':
      return await handleQuery(payload);
    case 'delete':
      return await handleDelete(payload);
    default:
      throw new Error(`Unknown action: ${action}`);
  }
}

async function handlePut(payload: any): Promise<any> {
  return await dynamoActions.putItem(payload.tableName, payload.item);
}

async function handleGet(payload: any): Promise<any> {
  return await dynamoActions.getItem(payload.tableName, payload.key);
}

async function handleQuery(payload: any): Promise<any> {
  return await dynamoActions.queryItems(payload.tableName, payload.keyCondition);
}

async function handleDelete(payload: any): Promise<any> {
  return await dynamoActions.deleteItem(payload.tableName, payload.key);
}
