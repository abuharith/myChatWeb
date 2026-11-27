import { createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import {
  CreateBucketCommand,
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '../config/env';
import { logger } from './logger';

/**
 * One S3 client for every environment: MinIO (path style endpoint), Cloudflare
 * R2 (endpoint, region "auto") or AWS. Credentials come from the environment
 * and are never baked into the client or exposed to the browser.
 */
const credentials =
  env.S3_ACCESS_KEY_ID && env.S3_SECRET_ACCESS_KEY
    ? { accessKeyId: env.S3_ACCESS_KEY_ID, secretAccessKey: env.S3_SECRET_ACCESS_KEY }
    : undefined;

function createClient(endpoint?: string): S3Client {
  return new S3Client({
    region: env.S3_REGION,
    ...(endpoint ? { endpoint } : {}),
    ...(credentials ? { credentials } : {}),
    forcePathStyle: env.S3_FORCE_PATH_STYLE,
    // R2 and s3rver reject the newer flexible checksums on presigned requests.
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
  });
}

export const s3 = createClient(env.S3_ENDPOINT);

/** Presigned URLs must be signed for the host the browser will actually call. */
const presignClient =
  env.S3_PUBLIC_ENDPOINT && env.S3_PUBLIC_ENDPOINT !== env.S3_ENDPOINT
    ? createClient(env.S3_PUBLIC_ENDPOINT)
    : s3;

export const mediaBucket = env.S3_BUCKET;

export async function ensureBucket(): Promise<void> {
  try {
    await s3.send(new HeadBucketCommand({ Bucket: mediaBucket }));
  } catch {
    await s3.send(new CreateBucketCommand({ Bucket: mediaBucket }));
    logger.info('created media bucket', { bucket: mediaBucket });
  }
}

export function presignPut(key: string, contentType: string): Promise<string> {
  return getSignedUrl(
    presignClient,
    new PutObjectCommand({ Bucket: mediaBucket, Key: key, ContentType: contentType }),
    { expiresIn: env.UPLOAD_URL_TTL_SECONDS },
  );
}

export function presignGet(key: string, expiresIn = env.MEDIA_URL_TTL_SECONDS): Promise<string> {
  return getSignedUrl(s3, new GetObjectCommand({ Bucket: mediaBucket, Key: key }), { expiresIn });
}

export async function headObject(key: string) {
  return s3.send(new HeadObjectCommand({ Bucket: mediaBucket, Key: key }));
}

export async function getObject(key: string, range?: string) {
  return s3.send(
    new GetObjectCommand({
      Bucket: mediaBucket,
      Key: key,
      ...(range ? { Range: range } : {}),
    }),
  );
}

export async function getObjectBytes(key: string): Promise<Buffer> {
  const object = await getObject(key);
  if (!object.Body) throw new Error(`Object ${key} has no body`);
  const chunks: Buffer[] = [];
  for await (const chunk of object.Body as Readable) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as Uint8Array));
  }
  return Buffer.concat(chunks);
}

/** Streams an object straight to disk, so large videos never sit in memory. */
export async function downloadObject(key: string, destination: string): Promise<void> {
  const object = await getObject(key);
  if (!object.Body) throw new Error(`Object ${key} has no body`);
  await pipeline(object.Body as Readable, createWriteStream(destination));
}

export async function putObject(key: string, body: Buffer, contentType: string): Promise<void> {
  await s3.send(
    new PutObjectCommand({
      Bucket: mediaBucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      ContentLength: body.length,
    }),
  );
}
