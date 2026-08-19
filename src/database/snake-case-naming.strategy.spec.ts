import { SnakeCaseNamingStrategy } from './snake-case-naming.strategy';

describe('SnakeCaseNamingStrategy', () => {
  const strategy = new SnakeCaseNamingStrategy();

  describe('tableName', () => {
    it('converts a PascalCase entity class name to snake_case', () => {
      expect(strategy.tableName('University', undefined)).toBe('university');
      expect(strategy.tableName('CourseOffering', undefined)).toBe('course_offering');
    });

    it('respects an explicit table name override', () => {
      expect(strategy.tableName('University', 'universities')).toBe('universities');
    });
  });

  describe('columnName', () => {
    it('converts a camelCase property name to snake_case', () => {
      expect(strategy.columnName('universityId', undefined, [])).toBe('university_id');
      expect(strategy.columnName('createdAt', undefined, [])).toBe('created_at');
    });

    it('applies embedded prefixes', () => {
      expect(strategy.columnName('street', undefined, ['address'])).toBe('address_street');
    });

    it('respects an explicit column name override', () => {
      expect(strategy.columnName('universityId', 'university_ref', [])).toBe('university_ref');
    });
  });

  describe('joinColumnName', () => {
    it('combines the relation and referenced column names', () => {
      expect(strategy.joinColumnName('faculty', 'id')).toBe('faculty_id');
    });
  });
});
