import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import type { Response } from "express";
import type { RequestWithContext } from "./request-context";

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const request = context.getRequest<RequestWithContext>();
    const response = context.getResponse<Response>();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const body = exception instanceof HttpException ? exception.getResponse() : null;
    if (!(exception instanceof HttpException)) {
      this.logger.error("Unhandled request error", exception instanceof Error ? exception.stack : undefined);
    }

    let code = status === 500 ? "INTERNAL_ERROR" : `HTTP_${status}`;
    let message = status === 500 ? "서버에서 요청을 처리하지 못했습니다." : "요청을 처리할 수 없습니다.";

    if (typeof body === "string") {
      message = body;
    } else if (body && typeof body === "object") {
      const candidate = body as { code?: string; message?: string | string[] };
      code = candidate.code ?? code;
      message = Array.isArray(candidate.message)
        ? candidate.message.join(", ")
        : candidate.message ?? message;
    }

    response.status(status).json({
      error: { code, message, requestId: request.requestId },
    });
  }
}
