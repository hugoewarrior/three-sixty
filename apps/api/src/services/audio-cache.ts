import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
} from '@aws-sdk/lib-dynamodb';

const dynamo = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: process.env.APP_REGION ?? 'us-east-1' })
);

const TABLE = process.env.DYNAMODB_AUDIO_CACHE_TABLE ?? 'panama-news-audio-cache';
const TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

export async function getAudioCache(articleId: string): Promise<string | null> {
  const { Item } = await dynamo.send(
    new GetCommand({ TableName: TABLE, Key: { articleId } })
  );
  return (Item?.audioUrl as string) ?? null;
}

export async function setAudioCache(articleId: string, audioUrl: string): Promise<void> {
  const ttl = Math.floor(Date.now() / 1000) + TTL_SECONDS;
  await dynamo.send(
    new PutCommand({
      TableName: TABLE,
      Item: {
        articleId,
        audioUrl,
        generatedAt: new Date().toISOString(),
        ttl,
      },
    })
  );
}
