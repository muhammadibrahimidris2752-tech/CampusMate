import configuration from './configuration';

describe('configuration factory', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it('builds a namespaced config object from process.env', () => {
    process.env.NODE_ENV = 'production';
    process.env.PORT = '4000';
    process.env.DATABASE_HOST = 'db.internal';
    process.env.DATABASE_USERNAME = 'app';
    process.env.DATABASE_PASSWORD = 'secret';
    process.env.DATABASE_NAME = 'nsp';
    process.env.REDIS_HOST = 'redis.internal';
    process.env.CORS_ALLOWED_ORIGINS = 'https://app.example.com,https://admin.example.com';

    const config = configuration();

    expect(config.app.nodeEnv).toBe('production');
    expect(config.app.port).toBe(4000);
    expect(config.app.corsAllowedOrigins).toEqual([
      'https://app.example.com',
      'https://admin.example.com',
    ]);
    expect(config.database.host).toBe('db.internal');
    expect(config.redis.host).toBe('redis.internal');
    // Swagger defaults to disabled in production unless explicitly enabled.
    expect(config.app.enableSwagger).toBe(false);
  });

  it('falls back to sane development defaults', () => {
    process.env.NODE_ENV = 'development';
    process.env.DATABASE_HOST = 'localhost';
    process.env.DATABASE_USERNAME = 'postgres';
    process.env.DATABASE_PASSWORD = 'postgres';
    process.env.DATABASE_NAME = 'nsp_dev';
    process.env.REDIS_HOST = 'localhost';

    const config = configuration();

    expect(config.app.port).toBe(3000);
    expect(config.app.enableSwagger).toBe(true);
    expect(config.storage.provider).toBe('none');
  });
});
