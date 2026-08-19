-- Runs automatically the first time the local postgres container starts
-- (Postgres's docker image executes every *.sql file in
-- /docker-entrypoint-initdb.d on an empty data volume). POSTGRES_DB in
-- docker-compose.yml already creates the dev database; this adds a
-- separate test database so `npm run test:e2e` never touches dev data.
CREATE DATABASE nigerian_student_platform_test;
