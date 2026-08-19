import * as Joi from 'joi';
import { Environment, StorageProvider } from './config.types';

/**
 * The flat shape Joi produces: every env var this schema validates, after
 * defaults/coercion, keyed exactly as it appears in process.env. This is
 * NOT the same shape as RootConfig in config.types.ts — that's the nested,
 * namespaced shape `configuration()` builds from process.env separately.
 * This interface exists so `validate()` below returns something properly
 * typed instead of a value destructured out of Joi's `any`-typed result.
 */
export interface ValidatedEnv {
  NODE_ENV: Environment;
  PORT: number;
  APP_NAME: string;
  API_GLOBAL_PREFIX: string;
  API_DEFAULT_VERSION: string;
  TRUST_PROXY: boolean;
  ENABLE_SWAGGER: boolean;
  CORS_ALLOWED_ORIGINS: string;
  THROTTLE_TTL_MS: number;
  THROTTLE_LIMIT: number;
  DATABASE_HOST: string;
  DATABASE_PORT: number;
  DATABASE_USERNAME: string;
  DATABASE_PASSWORD: string;
  DATABASE_NAME: string;
  DATABASE_SSL: boolean;
  DATABASE_POOL_MAX: number;
  DATABASE_LOGGING: boolean;
  REDIS_HOST: string;
  REDIS_PORT: number;
  REDIS_PASSWORD: string;
  REDIS_TLS: boolean;
  REDIS_KEY_PREFIX: string;
  STORAGE_PROVIDER: StorageProvider;
  STORAGE_ENDPOINT?: string;
  STORAGE_REGION: string;
  STORAGE_BUCKET?: string;
  STORAGE_ACCESS_KEY_ID?: string;
  STORAGE_SECRET_ACCESS_KEY?: string;
  STORAGE_FORCE_PATH_STYLE: boolean;
  STORAGE_PRESIGNED_URL_TTL_SECONDS: number;
  LOG_LEVEL: string;
  LOG_PRETTY?: boolean;
}

/**
 * Validates process.env at application bootstrap.
 *
 * This is the single place that decides what configuration the backend
 * requires to start. If a required value is missing or malformed, Nest
 * throws during bootstrap and the process exits — the app never starts
 * in a half-configured state. This is deliberate: an application that
 * silently falls back to insecure defaults in production is worse than
 * one that refuses to start.
 *
 * Fields that are only meaningful for a specific STORAGE_PROVIDER (or
 * only required in production) are validated conditionally with `.when`.
 */
export const envValidationSchema = Joi.object<ValidatedEnv>({
  // --- Application ---
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'staging', 'production')
    .default('development'),
  PORT: Joi.number().port().default(3000),
  APP_NAME: Joi.string().default('Nigerian Student Platform API'),
  API_GLOBAL_PREFIX: Joi.string().default('api'),
  API_DEFAULT_VERSION: Joi.string().default('1'),
  TRUST_PROXY: Joi.boolean().default(false),
  ENABLE_SWAGGER: Joi.boolean().when('NODE_ENV', {
    is: 'production',
    then: Joi.boolean().default(false),
    otherwise: Joi.boolean().default(true),
  }),

  // --- CORS ---
  CORS_ALLOWED_ORIGINS: Joi.string().when('NODE_ENV', {
    is: Joi.valid('staging', 'production'),
    then: Joi.string().required().invalid('*').messages({
      'any.invalid': 'CORS_ALLOWED_ORIGINS must not be "*" in staging/production.',
      'any.required': 'CORS_ALLOWED_ORIGINS is required in staging/production.',
    }),
    otherwise: Joi.string().default('http://localhost:3000'),
  }),

  // --- Rate limiting ---
  THROTTLE_TTL_MS: Joi.number().integer().positive().default(60000),
  THROTTLE_LIMIT: Joi.number().integer().positive().default(120),

  // --- PostgreSQL ---
  DATABASE_HOST: Joi.string().required(),
  DATABASE_PORT: Joi.number().port().default(5432),
  DATABASE_USERNAME: Joi.string().required(),
  DATABASE_PASSWORD: Joi.string().required().allow(''),
  DATABASE_NAME: Joi.string().required(),
  DATABASE_SSL: Joi.boolean().default(false),
  DATABASE_POOL_MAX: Joi.number().integer().positive().default(10),
  DATABASE_LOGGING: Joi.boolean().default(false),

  // --- Redis ---
  REDIS_HOST: Joi.string().required(),
  REDIS_PORT: Joi.number().port().default(6379),
  REDIS_PASSWORD: Joi.string().allow('').default(''),
  REDIS_TLS: Joi.boolean().default(false),
  REDIS_KEY_PREFIX: Joi.string().default('nsp:'),

  // --- Object storage (foundation only — see storage module) ---
  STORAGE_PROVIDER: Joi.string().valid('none', 's3').default('none'),
  STORAGE_ENDPOINT: Joi.string().uri().allow('').optional(),
  STORAGE_REGION: Joi.string().default('us-east-1'),
  STORAGE_BUCKET: Joi.string().when('STORAGE_PROVIDER', {
    is: 's3',
    then: Joi.string().required(),
    otherwise: Joi.string().allow('').optional(),
  }),
  STORAGE_ACCESS_KEY_ID: Joi.string().when('STORAGE_PROVIDER', {
    is: 's3',
    then: Joi.string().required(),
    otherwise: Joi.string().allow('').optional(),
  }),
  STORAGE_SECRET_ACCESS_KEY: Joi.string().when('STORAGE_PROVIDER', {
    is: 's3',
    then: Joi.string().required(),
    otherwise: Joi.string().allow('').optional(),
  }),
  STORAGE_FORCE_PATH_STYLE: Joi.boolean().default(false),
  STORAGE_PRESIGNED_URL_TTL_SECONDS: Joi.number().integer().positive().default(300),

  // --- Logging ---
  LOG_LEVEL: Joi.string().valid('fatal', 'error', 'warn', 'info', 'debug', 'trace').default('info'),
  LOG_PRETTY: Joi.boolean().optional(),
}).unknown(true); // allow other process.env vars (PATH, etc.) to pass through untouched

/**
 * Passed to ConfigModule.forRoot({ validate }). Nest calls this once at
 * startup with the raw process.env.
 */
export function validate(rawConfig: Record<string, unknown>): ValidatedEnv {
  // envValidationSchema is now built as Joi.object<ValidatedEnv>(...), so
  // .validate() already returns Joi.ValidationResult<ValidatedEnv> with no
  // external cast needed. That type is a union of a success branch
  // (`value: ValidatedEnv`) and an error branch whose `value` Joi's own
  // typings declare as `any` — destructuring `{ error, value }` in one
  // statement would resolve `value`'s type from *both* branches at once,
  // which collapses to `any` (a union containing `any` collapses to `any`)
  // even though the schema itself is now correctly typed. Checking
  // `result.error` first and only reading `result.value` afterwards lets
  // control-flow narrowing pick the success branch specifically, so the
  // property access below is genuinely typed as ValidatedEnv, not `any`.
  const result = envValidationSchema.validate(rawConfig, {
    allowUnknown: true,
    abortEarly: false,
  });

  if (result.error) {
    // Intentionally thrown, not logged-and-continued: invalid configuration
    // must stop the app from booting rather than run with unsafe defaults.
    throw new Error(`Configuration validation failed:\n${result.error.message}`);
  }

  return result.value;
}
