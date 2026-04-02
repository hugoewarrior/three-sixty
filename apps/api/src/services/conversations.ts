import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';
import type { UIMessage } from 'ai';

const dynamo = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: process.env.APP_REGION ?? 'us-east-1' })
);

const TABLE = process.env.DYNAMODB_CONVERSATIONS_TABLE ?? 'panama-news-conversations';
const FIRST_MESSAGE_MAX = 120;

export interface ConversationRecord {
  conversationId: string;
  userId: string;
  userEmail: string;
  messages: UIMessage[];
  firstMessage: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationSummary {
  conversationId: string;
  firstMessage: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedConversations {
  items: ConversationSummary[];
  nextKey?: Record<string, unknown>;
}

function extractFirstMessage(messages: UIMessage[]): string {
  const first = messages.find((m) => m.role === 'user');
  if (!first) return '';
  const textPart = first.parts?.find((p) => p.type === 'text') as
    | { type: 'text'; text: string }
    | undefined;

  const text = textPart?.text ?? (typeof first.parts === 'string' ? first.parts : '');
  return text.length <= FIRST_MESSAGE_MAX
    ? text
    : text.slice(0, FIRST_MESSAGE_MAX).trimEnd() + '…';
}

/**
 * Create a new conversation record. If `conversationId` is provided (pre-generated
 * by the Lambda handler so the ID can be set in response headers before onFinish),
 * it is used directly; otherwise a new UUID is generated.
 */
export async function createConversation(
  userId: string,
  userEmail: string,
  messages: UIMessage[],
  conversationId?: string
): Promise<ConversationRecord> {
  const now = new Date().toISOString();
  const record: ConversationRecord = {
    conversationId: conversationId ?? randomUUID(),
    userId,
    userEmail,
    messages,
    firstMessage: extractFirstMessage(messages),
    createdAt: now,
    updatedAt: now,
  };
  await dynamo.send(new PutCommand({ TableName: TABLE, Item: record }));
  return record;
}

/**
 * Update messages on an existing conversation. Validates ownership via
 * ConditionExpression — throws ConditionalCheckFailedException if userId
 * does not match, which callers should treat as 403/404.
 */
export async function updateConversation(
  conversationId: string,
  userId: string,
  messages: UIMessage[]
): Promise<void> {
  await dynamo.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: { conversationId },
      UpdateExpression: 'SET messages = :msgs, updatedAt = :now',
      ConditionExpression: 'userId = :uid',
      ExpressionAttributeValues: {
        ':msgs': messages,
        ':now': new Date().toISOString(),
        ':uid': userId,
      },
    })
  );
}

/**
 * Fetch a single conversation by ID, returning null if not found or if the
 * record belongs to a different user.
 */
export async function getConversation(
  conversationId: string,
  userId: string
): Promise<ConversationRecord | null> {
  const { Item } = await dynamo.send(
    new GetCommand({ TableName: TABLE, Key: { conversationId } })
  );
  if (!Item) return null;
  if ((Item as ConversationRecord).userId !== userId) return null;
  return Item as ConversationRecord;
}

/**
 * Return a paginated list of conversation summaries for a user, newest first.
 * Only projects the fields needed for the sidebar list (no messages array).
 */
export async function listConversations(
  userId: string,
  limit = 10,
  lastKey?: Record<string, unknown>
): Promise<PaginatedConversations> {
  const { Items, LastEvaluatedKey } = await dynamo.send(
    new QueryCommand({
      TableName: TABLE,
      IndexName: 'userId-createdAt-index',
      KeyConditionExpression: 'userId = :uid',
      ExpressionAttributeValues: { ':uid': userId },
      ScanIndexForward: false, // newest first
      Limit: limit,
      ExclusiveStartKey: lastKey,
    })
  );

  return {
    items: (Items ?? []) as ConversationSummary[],
    nextKey: LastEvaluatedKey as Record<string, unknown> | undefined,
  };
}
