import { Environment, RootConfig } from './config.types';

const toBool = (value: string | undefined, fallback: boolean): boolean =>
  value === undefined ? fallback : value === 'true' || value === '1';

const toInt = (value: string | undefined, fallback: number): number =>
  value === undefined || value === '' ? fallback : parseInt(value, 10);

const splitList = (value: string | undefined): string[] =>
  (value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

/**
 * Builds the app's typed, namespaced runtime configuration from process.env.
 *
 * This function runs AFTER `validate()` (see env.validation.ts) has already
 * checked process.env, so values here are assumed present/well-formed for
 * anything marked required in the Joi schema. This function only shapes
 * data — it does not re-validate it.
 *
 * Registered via ConfigModule.forRoot({ load: [configuration] }) and read
 * elsewhere with `configService.get<RootConfig['database']>('database')`.
 */
export default (): RootConfig => {
  const nodeEnv = (process.env.NODE_ENV as Environment) ?? 'development';

  return {
    app: {
      nodeEnv,
      port: toInt(process.env.PORT, 3000),
      name: process.env.APP_NAME ?? 'Nigerian Student Platform API',
      globalPrefix: process.env.API_GLOBAL_PREFIX ?? 'api',
      defaultApiVersion: process.env.API_DEFAULT_VERSION ?? '1',
      trustProxy: toBool(process.env.TRUST_PROXY, false),
      enableSwagger: toBool(process.env.ENABLE_SWAGGER, nodeEnv !== 'production'),
      corsAllowedOrigins: splitList(process.env.CORS_ALLOWED_ORIGINS),
    },
    throttle: {
      ttlMs: toInt(process.env.THROTTLE_TTL_MS, 60000),
      limit: toInt(process.env.THROTTLE_LIMIT, 120),
    },
    database: {
      host: process.env.DATABASE_HOST as string,
      port: toInt(process.env.DATABASE_PORT, 5432),
      username: process.env.DATABASE_USERNAME as string,
      password: process.env.DATABASE_PASSWORD as string,
      name: process.env.DATABASE_NAME as string,
      ssl: toBool(process.env.DATABASE_SSL, false),
      poolMax: toInt(process.env.DATABASE_POOL_MAX, 10),
      logging: toBool(process.env.DATABASE_LOGGING, false),
    },
    redis: {
      host: process.env.REDIS_HOST as string,
      port: toInt(process.env.REDIS_PORT, 6379),
      password: process.env.REDIS_PASSWORD || undefined,
      tls: toBool(process.env.REDIS_TLS, false),
      keyPrefix: process.env.REDIS_KEY_PREFIX ?? 'nsp:',
    },
    storage: {
      provider: (process.env.STORAGE_PROVIDER as 'none' | 's3') ?? 'none',
      endpoint: process.env.STORAGE_ENDPOINT || undefined,
      region: process.env.STORAGE_REGION ?? 'us-east-1',
      bucket: process.env.STORAGE_BUCKET || undefined,
      accessKeyId: process.env.STORAGE_ACCESS_KEY_ID || undefined,
      secretAccessKey: process.env.STORAGE_SECRET_ACCESS_KEY || undefined,
      forcePathStyle: toBool(process.env.STORAGE_FORCE_PATH_STYLE, false),
      presignedUrlTtlSeconds: toInt(process.env.STORAGE_PRESIGNED_URL_TTL_SECONDS, 300),
    },
    logging: {
      level: process.env.LOG_LEVEL ?? 'info',
      pretty: toBool(process.env.LOG_PRETTY, nodeEnv !== 'production'),
    },
  };
};
