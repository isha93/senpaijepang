import { randomUUID } from 'node:crypto';

function parseBoolean(value, fallback) {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase();
  if (!normalized) {
    return fallback;
  }
  if (['1', 'true', 'yes', 'on'].includes(normalized)) {
    return true;
  }
  if (['0', 'false', 'no', 'off'].includes(normalized)) {
    return false;
  }
  return fallback;
}

function trimTrailingSlash(value) {
  return String(value || '').replace(/\/+$/, '');
}

function sanitizeFileName(fileName) {
  const trimmed = String(fileName || '')
    .trim()
    .toLowerCase();
  if (!trimmed) {
    return 'document.bin';
  }

  const normalized = trimmed
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalized || 'document.bin';
}

function toTimestampToken(date = new Date()) {
  const iso = date.toISOString();
  return iso.replace(/[-:.TZ]/g, '');
}

function hexSha256ToBase64(hexValue) {
  return Buffer.from(hexValue, 'hex').toString('base64');
}

function resolveBucket(env = process.env) {
  return String(env.OBJECT_STORAGE_BUCKET || 'senpaijepang-kyc').trim();
}

function resolvePresignExpiresSec(env = process.env) {
  const parsed = Number(env.OBJECT_STORAGE_PRESIGN_EXPIRES_SEC || 900);
  if (!Number.isFinite(parsed) || parsed < 60 || parsed > 3600) {
    return 900;
  }
  return Math.floor(parsed);
}

export class InMemoryObjectStorage {
  constructor({ bucket, baseUrl, presignExpiresSec }) {
    this.bucket = bucket;
    this.baseUrl = trimTrailingSlash(baseUrl || 'http://localhost:9000');
    this.presignExpiresSec = presignExpiresSec;
  }

  buildObjectKey({ userId, sessionId, documentType, fileName }) {
    const safeFileName = sanitizeFileName(fileName);
    const safeDocumentType = String(documentType || 'document')
      .trim()
      .toLowerCase();
    return `kyc/${userId}/${sessionId}/${toTimestampToken()}-${safeDocumentType}-${randomUUID()}-${safeFileName}`;
  }

  async createUploadUrl({ objectKey, contentType, checksumSha256 }) {
    const expiresAt = new Date(Date.now() + this.presignExpiresSec * 1000).toISOString();
    const expiresTs = Math.floor(Date.now() / 1000) + this.presignExpiresSec;
    const uploadUrl = `${this.baseUrl}/${this.bucket}/${objectKey}?mockPresigned=1&expires=${expiresTs}`;

    return {
      uploadUrl,
      method: 'PUT',
      headers: {
        'Content-Type': contentType,
        'x-amz-meta-checksum-sha256': checksumSha256
      },
      expiresAt
    };
  }

  toFileUrl(objectKey) {
    return `s3://${this.bucket}/${objectKey}`;
  }
}

class S3ObjectStorage {
  constructor({ client, getSignedUrl, bucket, presignExpiresSec }) {
    this.client = client;
    this.getSignedUrl = getSignedUrl;
    this.bucket = bucket;
    this.presignExpiresSec = presignExpiresSec;
  }

  buildObjectKey({ userId, sessionId, documentType, fileName }) {
    const safeFileName = sanitizeFileName(fileName);
    const safeDocumentType = String(documentType || 'document')
      .trim()
      .toLowerCase();
    return `kyc/${userId}/${sessionId}/${toTimestampToken()}-${safeDocumentType}-${randomUUID()}-${safeFileName}`;
  }

  async ensureBucket({ HeadBucketCommand, CreateBucketCommand }) {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
      return;
    } catch (error) {
      const code = String(error?.name || error?.Code || '');
      const status = Number(error?.$metadata?.httpStatusCode || 0);
      const missing = code === 'NotFound' || code === 'NoSuchBucket' || status === 404;
      if (!missing) {
        throw error;
      }
    }

    try {
      await this.client.send(new CreateBucketCommand({ Bucket: this.bucket }));
    } catch (error) {
      const code = String(error?.name || error?.Code || '');
      if (code !== 'BucketAlreadyOwnedByYou' && code !== 'BucketAlreadyExists') {
        throw error;
      }
    }
  }

  async createUploadUrl({ objectKey, contentType, checksumSha256 }) {
    const { PutObjectCommand } = await loadAwsSdk();
    const expiresAt = new Date(Date.now() + this.presignExpiresSec * 1000).toISOString();
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: objectKey,
      ContentType: contentType,
      ChecksumSHA256: hexSha256ToBase64(checksumSha256),
      Metadata: {
        checksum_sha256: checksumSha256
      }
    });
    const uploadUrl = await this.getSignedUrl(this.client, command, {
      expiresIn: this.presignExpiresSec
    });

    return {
      uploadUrl,
      method: 'PUT',
      headers: {
        'Content-Type': contentType,
        'x-amz-checksum-sha256': hexSha256ToBase64(checksumSha256),
        'x-amz-meta-checksum-sha256': checksumSha256
      },
      expiresAt
    };
  }

  toFileUrl(objectKey) {
    return `s3://${this.bucket}/${objectKey}`;
  }
}

let awsSdkPromise = null;
async function loadAwsSdk() {
  if (!awsSdkPromise) {
    awsSdkPromise = Promise.all([
      import('@aws-sdk/client-s3'),
      import('@aws-sdk/s3-request-presigner')
    ]).then(([s3, presigner]) => ({
      ...s3,
      ...presigner
    }));
  }
  return awsSdkPromise;
}

export function createInMemoryObjectStorage({ env = process.env } = {}) {
  return new InMemoryObjectStorage({
    bucket: resolveBucket(env),
    baseUrl: env.OBJECT_STORAGE_BASE_URL || `http://localhost:${env.MINIO_PORT || 9000}`,
    presignExpiresSec: resolvePresignExpiresSec(env)
  });
}

async function createS3ObjectStorage({ env = process.env } = {}) {
  const sdk = await loadAwsSdk();
  const bucket = resolveBucket(env);
  const region = String(env.OBJECT_STORAGE_REGION || 'ap-northeast-1').trim();
  const endpoint =
    String(env.OBJECT_STORAGE_ENDPOINT || '').trim() || `http://localhost:${env.MINIO_PORT || 9000}`;
  const accessKeyId = String(env.OBJECT_STORAGE_ACCESS_KEY_ID || env.MINIO_ROOT_USER || '').trim();
  const secretAccessKey = String(
    env.OBJECT_STORAGE_SECRET_ACCESS_KEY || env.MINIO_ROOT_PASSWORD || ''
  ).trim();

  if (!accessKeyId || !secretAccessKey) {
    throw new Error('OBJECT_STORAGE_ACCESS_KEY_ID and OBJECT_STORAGE_SECRET_ACCESS_KEY are required');
  }

  const client = new sdk.S3Client({
    region,
    endpoint,
    forcePathStyle: parseBoolean(env.OBJECT_STORAGE_FORCE_PATH_STYLE, true),
    credentials: {
      accessKeyId,
      secretAccessKey
    }
  });

  const storage = new S3ObjectStorage({
    client,
    getSignedUrl: sdk.getSignedUrl,
    bucket,
    presignExpiresSec: resolvePresignExpiresSec(env)
  });
  await storage.ensureBucket({
    HeadBucketCommand: sdk.HeadBucketCommand,
    CreateBucketCommand: sdk.CreateBucketCommand
  });
  return storage;
}

export async function createObjectStorageFromEnv(env = process.env) {
  const mode = String(env.OBJECT_STORAGE_PROVIDER || 'memory')
    .trim()
    .toLowerCase();

  if (mode === 'memory') {
    return {
      mode,
      storage: createInMemoryObjectStorage({ env }),
      close: async () => {}
    };
  }

  if (mode === 's3') {
    const storage = await createS3ObjectStorage({ env });
    return {
      mode,
      storage,
      close: async () => {}
    };
  }

  throw new Error(`Unsupported OBJECT_STORAGE_PROVIDER value: ${mode}`);
}
