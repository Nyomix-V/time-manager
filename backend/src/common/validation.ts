import { ValidationPipe } from '@nestjs/common';

// Global input validation: rejects unknown fields, auto-transforms DTOs.
// Shared by main.ts and the route tests so both validate the same way.
export function createValidationPipe() {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  });
}
