import {
  CreateDateColumn,
  DeleteDateColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Base columns for every future domain entity (universities, faculties,
 * courses, resources, ...). Not itself an @Entity — it has no table of its
 * own — future concrete entities extend it to inherit these columns.
 *
 * Conventions fixed here on purpose, before any domain table exists:
 *  - UUID primary keys, not auto-increment integers. Safer for a
 *    multi-university system: IDs aren't sequential/enumerable across
 *    tenants, and they merge cleanly if data is ever migrated or synced
 *    across environments.
 *  - createdAt / updatedAt on every table, for auditability.
 *  - deletedAt enables TypeORM soft deletes (`softRemove`/`softDelete`),
 *    which the security & data architecture favor over hard deletes for
 *    academic records — see docs/architecture/database-conventions.md.
 *
 * UUID generation relies on the `pgcrypto` extension enabled in the
 * baseline migration (see database/migrations).
 */
export abstract class BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;

  @DeleteDateColumn({ type: 'timestamptz', nullable: true })
  deletedAt?: Date | null;
}
