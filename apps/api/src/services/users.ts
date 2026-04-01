import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';

const dynamo = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: process.env.APP_REGION ?? 'us-east-1' })
);

const TABLE = process.env.DYNAMODB_USERS_TABLE ?? 'panama-news-users';

export interface UserRecord {
  userId: string;
  email: string;
  name?: string;
  provider: string;
  createdAt: string;
  lastLoginAt: string;
}

export async function getUserById(userId: string): Promise<UserRecord | null> {
  const { Item } = await dynamo.send(
    new GetCommand({ TableName: TABLE, Key: { userId } })
  );
  return (Item as UserRecord) ?? null;
}

export async function getUserByEmail(email: string): Promise<UserRecord | null> {
  const { Items } = await dynamo.send(
    new QueryCommand({
      TableName: TABLE,
      IndexName: 'email-index',
      KeyConditionExpression: 'email = :email',
      ExpressionAttributeValues: { ':email': email },
      Limit: 1,
    })
  );
  return Items?.[0] as UserRecord ?? null;
}

export async function createUser(user: Omit<UserRecord, 'createdAt' | 'lastLoginAt'>): Promise<UserRecord> {
  const now = new Date().toISOString();
  const record: UserRecord = { ...user, createdAt: now, lastLoginAt: now };
  await dynamo.send(new PutCommand({ TableName: TABLE, Item: record }));
  return record;
}

export async function updateLastLogin(userId: string): Promise<void> {
  await dynamo.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: { userId },
      UpdateExpression: 'SET lastLoginAt = :now',
      ExpressionAttributeValues: { ':now': new Date().toISOString() },
    })
  );
}
