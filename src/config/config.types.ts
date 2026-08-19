export type Environment = 'development' | 'test' | 'staging' | 'production';

export interface AppConfig {
  nodeEnv: Environment;
  port: number;
  name: string;
  globalPrefix: string;
  defaultApiVersion: string;
  trustProxy: boolean;
  enableSwagger: boolean;
  corsAllowedOrigins: string[];
}

export interface ThrottleConfig {
  ttlMs: number;
  limit: number;
}

export interface DatabaseConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  name: string;
  ssl: boolean;
  poolMax: number;
  logging: boolean;
}

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  tls: boolean;
  keyPrefix: string;
}

export type StorageProvider = 'none' | 's3';

export interface StorageConfig {
  provider: StorageProvider;
  endpoint?: string;
  region: string;
  bucket?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  forcePathStyle: boolean;
  presignedUrlTtlSeconds: number;
}

export interface LoggingConfig {
  level: string;
  pretty: boolean;
}

export interface RootConfig {
  app: AppConfig;
  throttle: ThrottleConfig;
  database: DatabaseConfig;
  redis: RedisConfig;
  storage: StorageConfig;
  logging: LoggingConfig;
}
