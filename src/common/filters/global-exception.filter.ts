import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

export interface ErrorResponseBody {
  statusCode: number;
  message: string | string[];
  error: string;
  path: string;
  timestamp: string;
  requestId?: string;
}

/**
 * Centralized error handling (Step 9).
 *
 * Every error — a DTO validation failure, a thrown HttpException, or a
 * genuinely unexpected bug — leaves the API through this one filter, in
 * one predictable shape, so the Flutter app and the Next.js admin panel
 * can both handle API errors the same way.
 *
 * The one rule that matters most here: an unhandled, non-HttpException
 * error NEVER reaches the client with its real message or stack trace in
 * production. It's logged in full server-side (where operators can see
 * it) and returned to the client as a generic "Internal server error".
 * Known HttpExceptions (NotFoundException, BadRequestException, the
 * ValidationPipe's 400s, ...) already carry a safe, intentional message,
 * so those pass through as written.
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const requestId = (request as unknown as { id?: string }).id;
    const isProduction = process.env.NODE_ENV === 'production';

    // Typed as `number`, not `HttpStatus`: it gets reassigned below from
    // exception.getStatus(), which returns a plain number, and is then
    // compared with plain number literals (`>= 500`). Leaving it inferred
    // as the HttpStatus enum type made that comparison an unsafe
    // enum-vs-number comparison as far as the type checker is concerned.
    let statusCode: number = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';
    let error = 'Internal Server Error';

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'string') {
        message = body;
        error = exception.name;
      } else if (typeof body === 'object' && body !== null) {
        const typedBody = body as { message?: string | string[]; error?: string };
        message = typedBody.message ?? exception.message;
        error = typedBody.error ?? exception.name;
      }
    } else if (exception instanceof Error) {
      message = isProduction ? 'Internal server error' : exception.message;
    }

    if (statusCode >= 500) {
      this.logger.error(
        `[${requestId ?? 'no-request-id'}] ${request.method} ${request.originalUrl} -> ${statusCode}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    } else {
      this.logger.warn(
        `[${requestId ?? 'no-request-id'}] ${request.method} ${request.originalUrl} -> ${statusCode}: ${
          Array.isArray(message) ? message.join('; ') : message
        }`,
      );
    }

    const body: ErrorResponseBody = {
      statusCode,
      message,
      error,
      path: request.originalUrl,
      timestamp: new Date().toISOString(),
      ...(requestId ? { requestId } : {}),
    };

    response.status(statusCode).json(body);
  }
}
