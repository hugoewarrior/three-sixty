import {
  PollyClient,
  SynthesizeSpeechCommand,
  Engine,
  OutputFormat,
  VoiceId,
} from '@aws-sdk/client-polly';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';
import { getAudioCache, setAudioCache } from './audio-cache';

const pollyClient = new PollyClient({
  region: process.env.APP_REGION ?? process.env.APP_REGION ?? 'us-east-1',
});

const s3Client = new S3Client({
  region: process.env.APP_REGION ?? 'us-east-1',
});

const AUDIO_BUCKET_NAME =
  process.env.AUDIO_BUCKET_NAME ?? 'three-sixty-audio';

async function streamToBuffer(stream: Readable): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on('data', (chunk: Buffer) => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}

export async function synthesizeSpeech(
  text: string,
  articleId: string
): Promise<string> {
  // Check DynamoDB cache before calling Polly
  const cachedKey = await getAudioCache(articleId);
  if (cachedKey) {
    const getCommand = new GetObjectCommand({
      Bucket: AUDIO_BUCKET_NAME,
      Key: cachedKey,
    });
    return getSignedUrl(s3Client, getCommand, { expiresIn: 3600 });
  }

  const voiceId = (process.env.POLLY_VOICE_ID ?? 'Lupe') as VoiceId;

  // Synthesize speech with AWS Polly
  const synthesizeCommand = new SynthesizeSpeechCommand({
    Text: text,
    VoiceId: voiceId,
    Engine: Engine.NEURAL,
    OutputFormat: OutputFormat.MP3,
    LanguageCode: 'es-US',
  });

  const pollyResponse = await pollyClient.send(synthesizeCommand);

  if (!pollyResponse.AudioStream) {
    throw new Error('Polly did not return an audio stream');
  }

  // Convert stream to buffer
  const audioBuffer = await streamToBuffer(
    pollyResponse.AudioStream as Readable
  );

  const s3Key = `audio/${articleId}.mp3`;

  // Upload to S3
  const putCommand = new PutObjectCommand({
    Bucket: AUDIO_BUCKET_NAME,
    Key: s3Key,
    Body: audioBuffer,
    ContentType: 'audio/mpeg',
  });

  await s3Client.send(putCommand);

  // Generate pre-signed URL valid for 1 hour
  const getCommand = new GetObjectCommand({
    Bucket: AUDIO_BUCKET_NAME,
    Key: s3Key,
  });

  const signedUrl = await getSignedUrl(s3Client, getCommand, {
    expiresIn: 3600,
  });

  // Cache the S3 key in DynamoDB for 7 days (not the pre-signed URL, which expires in 1 hour)
  await setAudioCache(articleId, s3Key);

  return signedUrl;
}
