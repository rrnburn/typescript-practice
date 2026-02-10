import { DynamoDBClient, PutItemCommand, GetItemCommand, QueryCommand, DeleteItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });

export const dynamoActions = {
  async putItem(tableName: string, item: Record<string, any>) {
    const command = new PutItemCommand({
      TableName: tableName,
      Item: marshall(item),
    });
    await dynamoClient.send(command);
    return { tableName, item };
  },

  async getItem(tableName: string, key: Record<string, any>) {
    const command = new GetItemCommand({
      TableName: tableName,
      Key: marshall(key),
    });
    const response = await dynamoClient.send(command);
    return {
      tableName,
      item: response.Item ? unmarshall(response.Item) : null,
    };
  },

  async queryItems(tableName: string, keyCondition: any) {
    const command = new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: keyCondition.expression,
      ExpressionAttributeValues: marshall(keyCondition.values),
    });
    const response = await dynamoClient.send(command);
    return {
      tableName,
      items: response.Items?.map(item => unmarshall(item)) || [],
      count: response.Count,
    };
  },

  async deleteItem(tableName: string, key: Record<string, any>) {
    const command = new DeleteItemCommand({
      TableName: tableName,
      Key: marshall(key),
    });
    await dynamoClient.send(command);
    return { tableName, key, deleted: true };
  },
};
