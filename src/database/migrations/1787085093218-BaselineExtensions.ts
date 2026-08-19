import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 0A baseline migration.
 *
 * Deliberately does NOT create any domain tables (no universities,
 * faculties, users, etc.) — that schema belongs to later phases per the
 * architecture roadmap. What it DOES do is prove the migration system
 * works end-to-end and enable the Postgres extensions every future entity
 * will depend on for UUID primary keys (see database/base.entity.ts).
 */
export class BaselineExtensions1787085093218 implements MigrationInterface {
  name = 'BaselineExtensions1787085093218';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // gen_random_uuid() — used by BaseEntity's @PrimaryGeneratedColumn('uuid').
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);
    // uuid_generate_v4() — kept available too, since it's the extension
    // TypeORM's Postgres driver has historically assumed for uuid columns.
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Safe to drop: no tables depend on these yet in Phase 0A. Once domain
    // tables exist in later phases, this migration will never be reverted
    // in an environment that has data — reverting past it would already
    // require reverting every migration built on top of it first.
    await queryRunner.query(`DROP EXTENSION IF EXISTS "uuid-ossp"`);
    await queryRunner.query(`DROP EXTENSION IF EXISTS "pgcrypto"`);
  }
}
