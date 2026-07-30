import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { env } from '@config/env';
import { generateUUID } from './tokenGenerator';
import { ApiError } from './ApiError';

/**
 * Helper to upload buffer or base64 image data to AWS S3.
 */
export async function uploadToS3(
  fileInput: Buffer | string,
  originalFilename?: string,
  folder: string = 'menu-items',
): Promise<string> {
  const isPlaceholder = (val?: string) =>
    !val || val.includes('your_') || val.trim() === '';

  // Check if S3 credentials are functional and not placeholders
  if (
    isPlaceholder(env.AWS_ACCESS_KEY_ID) ||
    isPlaceholder(env.AWS_SECRET_ACCESS_KEY) ||
    isPlaceholder(env.AWS_S3_BUCKET_NAME)
  ) {
    throw ApiError.badRequest(
      'AWS S3 credentials are not configured in server .env file. Please set valid AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and AWS_S3_BUCKET_NAME.',
    );
  }

  let buffer: Buffer;
  let mimeType = 'image/jpeg';
  let extension = 'jpg';

  if (typeof fileInput === 'string') {
    // If it's already an HTTP URL (e.g. existing S3 URL), return as-is
    if (fileInput.startsWith('http://') || fileInput.startsWith('https://')) {
      return fileInput;
    }

    // Handle base64 / data URI
    const dataUriMatch = fileInput.match(/^data:(image\/[a-zA-Z0-9\+\-\.]+);base64,(.+)$/);
    if (dataUriMatch) {
      mimeType = dataUriMatch[1];
      extension = mimeType.split('/')[1] || 'jpg';
      buffer = Buffer.from(dataUriMatch[2], 'base64');
    } else {
      buffer = Buffer.from(fileInput, 'base64');
    }
  } else {
    buffer = fileInput;
  }

  // Derive file extension from originalFilename if available
  if (originalFilename && originalFilename.includes('.')) {
    const ext = originalFilename.split('.').pop()?.toLowerCase();
    if (ext) {
      extension = ext;
      if (ext === 'png') mimeType = 'image/png';
      else if (ext === 'webp') mimeType = 'image/webp';
      else if (ext === 'gif') mimeType = 'image/gif';
      else if (ext === 'svg') mimeType = 'image/svg+xml';
    }
  }

  const s3Client = new S3Client({
    region: env.AWS_REGION || 'us-east-1',
    credentials: {
      accessKeyId: env.AWS_ACCESS_KEY_ID,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    },
  });

  const uniqueKey = `${folder}/${Date.now()}-${generateUUID()}.${extension}`;

  try {
    try {
      const command = new PutObjectCommand({
        Bucket: env.AWS_S3_BUCKET_NAME,
        Key: uniqueKey,
        Body: buffer,
        ContentType: mimeType,
        ACL: 'public-read',
      });
      await s3Client.send(command);
    } catch (aclErr) {
      const command = new PutObjectCommand({
        Bucket: env.AWS_S3_BUCKET_NAME,
        Key: uniqueKey,
        Body: buffer,
        ContentType: mimeType,
      });
      await s3Client.send(command);
    }
  } catch (err: any) {
    console.error('❌ AWS S3 PutObject Error:', err);
    throw ApiError.badRequest(
      `AWS S3 Upload Failed: ${err.message || 'Check S3 bucket permissions, access keys, and region.'}`,
    );
  }

  // Construct public URL
  const bucketName = env.AWS_S3_BUCKET_NAME;
  const region = env.AWS_REGION || 'us-east-1';
  
  return `https://${bucketName}.s3.${region}.amazonaws.com/${uniqueKey}`;
}

/**
 * Helper to fetch private S3 object streams using backend IAM credentials.
 * Bypasses 403 Forbidden AccessDenied errors for frontend browser clients.
 */
export async function getObjectFromS3(key: string): Promise<{ body: any; contentType: string }> {
  const s3Client = new S3Client({
    region: env.AWS_REGION || 'us-east-1',
    credentials: {
      accessKeyId: env.AWS_ACCESS_KEY_ID,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    },
  });

  const command = new GetObjectCommand({
    Bucket: env.AWS_S3_BUCKET_NAME,
    Key: key,
  });

  const data = await s3Client.send(command);
  return {
    body: data.Body,
    contentType: data.ContentType || 'image/jpeg',
  };
}
