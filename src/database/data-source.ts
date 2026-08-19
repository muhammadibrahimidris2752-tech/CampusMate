import 'reflect-metadata';
import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';
import { SnakeCaseNamingStrategy } from './snake-case-naming.strategy';

/**
 * Standalone DataSource for the TypeORM CLI (migration:generate,
 * migration:run, migration:revert — see the "typeorm" script in
 * package.json).
 *
 * This file is loaded directly by the CLI, outside of Nest's dependency
 * injection, so it can't read config through ConfigService. It loads the
 * same .env file by hand instead. Runtime config for the running server
 * goes through database.module.ts + ConfigService, not this file — this
 * file exists for migrations only.
 */
dotenv.config();

export const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST,
  port: process.env.DATABASE_PORT ? parseInt(process.env.DATABASE_PORT, 10) : 5432,
  username: process.env.DATABASE_USERNAME,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
  namingStrategy: new SnakeCaseNamingStrategy(),
  entities: ['src/**/*.entity.ts'],
  migrations: ['src/database/migrations/*.ts'],
  migrationsTableName: 'migrations',
  synchronize: false, // NEVER true — schema changes always go through migrations.
  logging: process.env.DATABASE_LOGGING === 'true',
});

export default dataSource;
