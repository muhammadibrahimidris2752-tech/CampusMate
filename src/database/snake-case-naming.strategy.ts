import { DefaultNamingStrategy, NamingStrategyInterface } from 'typeorm';

/**
 * Converts camelCase / PascalCase to snake_case.
 * "universityId" -> "university_id", "CourseOffering" -> "course_offering".
 */
function snakeCase(input: string): string {
  return input
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
    .toLowerCase();
}

/**
 * Enforces snake_case table and column names in Postgres regardless of how
 * entity classes/properties are written in TypeScript (camelCase, as is
 * idiomatic there). This is decided once, here, in Phase 0A specifically so
 * that every future domain module (universities, faculties, departments,
 * programmes, courses, ...) is consistent from its very first migration —
 * retrofitting a naming convention after entities exist is a painful,
 * high-risk migration in its own right.
 *
 * Register on the DataSource; see database.module.ts and data-source.ts.
 */
export class SnakeCaseNamingStrategy
  extends DefaultNamingStrategy
  implements NamingStrategyInterface
{
  tableName(targetName: string, userSpecifiedName: string | undefined): string {
    return userSpecifiedName ?? snakeCase(targetName);
  }

  columnName(
    propertyName: string,
    customName: string | undefined,
    embeddedPrefixes: string[],
  ): string {
    return snakeCase(embeddedPrefixes.concat(customName ?? propertyName).join('_'));
  }

  relationName(propertyName: string): string {
    return snakeCase(propertyName);
  }

  joinColumnName(relationName: string, referencedColumnName: string): string {
    return snakeCase(`${relationName}_${referencedColumnName}`);
  }

  joinTableName(
    firstTableName: string,
    secondTableName: string,
    firstPropertyName: string,
  ): string {
    return snakeCase(
      `${firstTableName}_${firstPropertyName.replace(/\./g, '_')}_${secondTableName}`,
    );
  }

  joinTableColumnName(tableName: string, propertyName: string, columnName?: string): string {
    return snakeCase(`${tableName}_${columnName ?? propertyName}`);
  }
}
