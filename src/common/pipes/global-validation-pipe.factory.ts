import { ValidationPipe } from '@nestjs/common';

/**
 * The one global validation policy (Step 10): the frontend is never
 * trusted, so every request body, query, and route param is validated
 * against its DTO, and unknown properties are rejected rather than
 * silently dropped.
 *
 * Pulled into its own factory so bootstrap.ts (the real server) and
 * test/validation.e2e-spec.ts (which exists specifically to verify this
 * behavior) share one definition instead of two copies that can drift.
 */
export function createGlobalValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: true },
  });
}
