import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StorageConfig } from '../config/config.types';
import { NullStorageProvider } from './providers/null-storage.provider';
import { S3CompatibleStorageProvider } from './providers/s3-compatible-storage.provider';
import { IStorageProvider, UploadUrlResult } from './storage-provider.interface';

/**
 * Thin facade over IStorageProvider (Step 13). Future feature modules
 * (the resource/PDF phase) depend on this service, not on a specific
 * provider — swapping S3 for another provider later is a StorageModule
 * change only, nothing downstream has to change.
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly provider: IStorageProvider;
  private readonly defaultTtlSeconds: number;

  constructor(private readonly configService: ConfigService) {
    const storageConfig = this.configService.get<StorageConfig>('storage')!;
    this.defaultTtlSeconds = storageConfig.presignedUrlTtlSeconds;

    if (storageConfig.provider === 's3') {
      this.provider = new S3CompatibleStorageProvider(storageConfig);
      this.logger.log('Storage provider: s3-compatible');
    } else {
      this.provider = new NullStorageProvider();
      this.logger.warn(
        'Storage provider: none — object storage is unconfigured. This is expected in Phase 0A.',
      );
    }
  }

  isConfigured(): boolean {
    return !(this.provider instanceof NullStorageProvider);
  }

  generateUploadUrl(
    key: string,
    contentType: string,
    expiresInSeconds: number = this.defaultTtlSeconds,
  ): Promise<UploadUrlResult> {
    return this.provider.generateUploadUrl(key, contentType, expiresInSeconds);
  }

  generateDownloadUrl(
    key: string,
    expiresInSeconds: number = this.defaultTtlSeconds,
  ): Promise<string> {
    return this.provider.generateDownloadUrl(key, expiresInSeconds);
  }

  deleteObject(key: string): Promise<void> {
    return this.provider.deleteObject(key);
  }

  objectExists(key: string): Promise<boolean> {
    return this.provider.objectExists(key);
  }
}
