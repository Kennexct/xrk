import crypto from 'node:crypto';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { config } from '../../config';
import { badRequest } from '../../lib/errors';

/**
 * Object storage orchestration (PRD §8). The API never receives file bytes:
 * it validates type/size, then hands the browser a short-lived presigned PUT
 * URL pointing at R2 (or the local dev mock when STORAGE_DRIVER=mock).
 */

export type UploadKind = 'music' | 'image' | 'document';

const ALLOWED: Record<UploadKind, { contentTypes: string[]; maxBytes: number }> = {
  music: {
    contentTypes: ['audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/aac', 'audio/ogg', 'audio/opus', 'audio/mp4'],
    maxBytes: config.limits.musicFileMaxBytes,
  },
  image: {
    contentTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    maxBytes: config.limits.imageMaxBytes,
  },
  document: {
    contentTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'application/zip',
      'image/jpeg',
      'image/png',
      'image/webp',
    ],
    maxBytes: config.limits.activityFileMaxBytes,
  },
};

export interface PresignResult {
  key: string;
  uploadUrl: string;
  fileUrl: string;
  expiresInSec: number;
}

let s3: S3Client | null = null;
function getS3(): S3Client {
  if (!s3) {
    s3 = new S3Client({
      region: config.storage.region,
      endpoint: config.storage.endpoint || undefined,
      credentials: {
        accessKeyId: config.storage.accessKeyId,
        secretAccessKey: config.storage.secretAccessKey,
      },
    });
  }
  return s3;
}

const sanitize = (name: string) => name.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 120);

export async function presignUpload(params: {
  kind: UploadKind;
  fileName: string;
  contentType: string;
  sizeBytes: number;
}): Promise<PresignResult> {
  const rules = ALLOWED[params.kind];
  if (!rules.contentTypes.includes(params.contentType)) {
    throw badRequest(`Content type ${params.contentType} is not allowed for ${params.kind} uploads`);
  }
  if (params.sizeBytes <= 0 || params.sizeBytes > rules.maxBytes) {
    throw badRequest(
      `File size must be between 1 byte and ${Math.round(rules.maxBytes / 1024 / 1024)}MB for ${params.kind} uploads`,
    );
  }

  const key = `${params.kind}/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}-${sanitize(params.fileName)}`;

  if (config.storage.driver === 'mock') {
    return {
      key,
      uploadUrl: `${config.publicApiUrl}/api/dev-storage/${encodeURIComponent(key)}`,
      fileUrl: `${config.publicApiUrl}/api/dev-storage/${encodeURIComponent(key)}`,
      expiresInSec: config.storage.presignTtlSec,
    };
  }

  const command = new PutObjectCommand({
    Bucket: config.storage.bucket,
    Key: key,
    ContentType: params.contentType,
    ContentLength: params.sizeBytes,
  });
  const uploadUrl = await getSignedUrl(getS3(), command, {
    expiresIn: config.storage.presignTtlSec,
  });
  const base = config.storage.publicBaseUrl.replace(/\/$/, '');
  return { key, uploadUrl, fileUrl: `${base}/${key}`, expiresInSec: config.storage.presignTtlSec };
}
