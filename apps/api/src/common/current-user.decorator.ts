import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { RequestWithContext } from "./request-context";

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext) =>
    context.switchToHttp().getRequest<RequestWithContext>().user,
);
