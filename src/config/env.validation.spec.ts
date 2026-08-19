import { validate } from './env.validation';

describe('validate (environment schema)', () => {
  const baseValidEnv = {
    NODE_ENV: 'development',
    DATABASE_HOST: 'localhost',
    DATABASE_USERNAME: 'postgres',
    DATABASE_PASSWORD: 'postgres',
    DATABASE_NAME: 'test_db',
    REDIS_HOST: 'localhost',
  };

  it('accepts a minimal valid development config and fills in defaults', () => {
    const result = validate({ ...baseValidEnv });

    expect(result.PORT).toBe(3000);
    expect(result.API_GLOBAL_PREFIX).toBe('api');
    expect(result.THROTTLE_LIMIT).toBe(120);
    expect(result.STORAGE_PROVIDER).toBe('none');
  });

  it('throws when a required field is missing', () => {
    const withoutHost: Record<string, string> = { ...baseValidEnv };
    delete withoutHost.DATABASE_HOST;
    expect(() => validate(withoutHost)).toThrow(/DATABASE_HOST/);
  });

  it('requires CORS_ALLOWED_ORIGINS in production and rejects a wildcard', () => {
    expect(() =>
      validate({ ...baseValidEnv, NODE_ENV: 'production', CORS_ALLOWED_ORIGINS: '*' }),
    ).toThrow();

    expect(() => validate({ ...baseValidEnv, NODE_ENV: 'production' })).toThrow(
      /CORS_ALLOWED_ORIGINS/,
    );

    expect(() =>
      validate({
        ...baseValidEnv,
        NODE_ENV: 'production',
        CORS_ALLOWED_ORIGINS: 'https://app.example.com',
      }),
    ).not.toThrow();
  });

  it('defaults ENABLE_SWAGGER to false in production and true elsewhere', () => {
    const dev = validate({ ...baseValidEnv });
    expect(dev.ENABLE_SWAGGER).toBe(true);

    const prod = validate({
      ...baseValidEnv,
      NODE_ENV: 'production',
      CORS_ALLOWED_ORIGINS: 'https://app.example.com',
    });
    expect(prod.ENABLE_SWAGGER).toBe(false);
  });

  it('requires storage credentials only when STORAGE_PROVIDER=s3', () => {
    expect(() => validate({ ...baseValidEnv, STORAGE_PROVIDER: 's3' })).toThrow();

    expect(() =>
      validate({
        ...baseValidEnv,
        STORAGE_PROVIDER: 's3',
        STORAGE_BUCKET: 'bucket',
        STORAGE_ACCESS_KEY_ID: 'key',
        STORAGE_SECRET_ACCESS_KEY: 'secret',
      }),
    ).not.toThrow();
  });
});
