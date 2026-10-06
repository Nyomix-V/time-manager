import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthUser } from './scope';

// Injects the authenticated user (from the JWT) into a controller method.
// Usage:  create(@CurrentUser() actor: AuthUser, @Body() dto) {...}
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    return ctx.switchToHttp().getRequest().user;
  },
);
