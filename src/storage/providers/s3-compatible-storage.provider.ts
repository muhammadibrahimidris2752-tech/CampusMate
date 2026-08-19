import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { StorageConfig } from '../../config/config.types';
import { IStorageProvider, UploadUrlResult } from '../storage-provider.interface';

/**
 * Works against AWS S3 or any S3-compatible provider (DigitalOcean Spaces,
 * Cloudflare R2, MinIO for local dev) — the endpoint/forcePathStyle config
 * fields are what make it provider-agnostic. See .env.example.
 */
export class S3CompatibleStorageProvider implements IStorageProvider {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(config: StorageConfig) {
    if (!config.bucket || !config.accessKeyId || !config.secretAccessKey) {
      // Should be unreachable: env.validation.ts requires these fields
      // whenever STORAGE_PROVIDER=s3. Guarded here too so this class is
      // safe to construct directly (e.g. in tests) without relying on that.
      throw new Error(
        'S3CompatibleStorageProvider requires bucket, accessKeyId and secretAccessKey.',
      );
    }

    this.bucket = config.bucket;
    this.client = new S3Client({
      region: config.region,
      endpoint: config.endpoint,
      forcePathStyle: config.forcePathStyle,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }

  async generateUploadUrl(
    key: string,
    contentType: string,
    expiresInSeconds: number,
  ): Promise<UploadUrlResult> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    });
    const uploadUrl = await getSignedUrl(this.client, command, { expiresIn: expiresInSeconds });
    return {
      uploadUrl,
      key,
      expiresAt: new Date(Date.now() + expiresInSeconds * 1000),
    };
  }

  async generateDownloadUrl(key: string, expiresInSeconds: number): Promise<string> {
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    return getSignedUrl(this.client, command, { expiresIn: expiresInSeconds });
  }

  async deleteObject(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }

  async objectExists(key: string): Promise<boolean> {
    try {
      await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
      return true;
    } catch {
      return false;
    }
  }
}
