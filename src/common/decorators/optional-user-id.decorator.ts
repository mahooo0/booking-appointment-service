import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const OptionalUserId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string | null => {
    const request = ctx.switchToHttp().getRequest();
    return (request.headers['x-user-id'] as string) || null;
  },
);
