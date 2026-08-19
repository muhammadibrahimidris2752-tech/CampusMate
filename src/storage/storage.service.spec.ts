import { ConfigService } from '@nestjs/config';
import { StorageService } from './storage.service';

jest.mock('@aws-sdk/client-s3');
jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn().mockResolvedValue('https://signed.example.com/object'),
}));

describe('StorageService', () => {
  function buildService(storageConfig: Record<string, unknown>): StorageService {
    const configService = {
      get: jest.fn().mockReturnValue(storageConfig),
    } as unknown as ConfigService;
    return new StorageService(configService);
  }

  it('is not configured and fails safe when STORAGE_PROVIDER=none', async () => {
    const service = buildService({ provider: 'none', presignedUrlTtlSeconds: 300 });

    expect(service.isConfigured()).toBe(false);
    await expect(service.generateUploadUrl('key', 'application/pdf')).rejects.toThrow(
      /not configured/i,
    );
  });

  it('is configured and generates a presigned URL when STORAGE_PROVIDER=s3', async () => {
    const service = buildService({
      provider: 's3',
      region: 'us-east-1',
      bucket: 'nsp-resources',
      accessKeyId: 'AKIAEXAMPLE',
      secretAccessKey: 'secret',
      forcePathStyle: false,
      presignedUrlTtlSeconds: 300,
    });

    expect(service.isConfigured()).toBe(true);

    const result = await service.generateUploadUrl('resources/course-101.pdf', 'application/pdf');
    expect(result.uploadUrl).toBe('https://signed.example.com/object');
    expect(result.key).toBe('resources/course-101.pdf');
  });

  it('throws clearly if s3 config is missing required fields', () => {
    expect(() =>
      buildService({ provider: 's3', region: 'us-east-1', presignedUrlTtlSeconds: 300 }),
    ).toThrow(/bucket/i);
  });
});
