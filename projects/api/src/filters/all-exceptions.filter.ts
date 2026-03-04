import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import * as Sentry from '@sentry/nestjs';
import type { FastifyReply, FastifyRequest } from 'fastify';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const reply = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest<FastifyRequest>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    // Log the full error server-side
    if (status >= 500) {
      this.logger.error(
        `Unhandled exception on ${request.method} ${request.url}`,
        exception instanceof Error ? exception.stack : String(exception),
      );

      // Capture server errors in Sentry with request context.
      // 4xx errors (validation, auth, rate limits) are intentionally excluded — they are
      // user-caused and would create noise without actionable signal.
      const body = request.body as Record<string, unknown> | undefined;
      const sessionId = typeof body?.sessionId === 'string' ? body.sessionId : undefined;

      Sentry.withScope((scope) => {
        scope.setTag('method', request.method);
        scope.setTag('url', request.url);
        if (sessionId) scope.setUser({ id: sessionId });
        Sentry.captureException(exception);
      });
    } else {
      this.logger.warn(
        `HTTP ${status} on ${request.method} ${request.url}: ${
          exception instanceof Error ? exception.message : String(exception)
        }`,
      );
    }

    // If headers are already sent (e.g. mid-SSE stream), we cannot write a new response
    if (reply.raw.headersSent) {
      return;
    }

    // Build a client-safe message — never expose stack traces or internal details
    let message: string;
    let errors: string[] | undefined;
    if (exception instanceof HttpException) {
      const body = exception.getResponse();
      if (typeof body === 'string') {
        message = body;
      } else {
        const bodyObj = body as Record<string, unknown>;
        message = bodyObj.message?.toString() ?? exception.message;
        if (Array.isArray(bodyObj.errors)) {
          errors = bodyObj.errors as string[];
        }
      }
    } else {
      message = 'An unexpected error occurred. Please try again later.';
    }

    void reply.status(status).send({
      statusCode: status,
      message,
      ...(errors ? { errors } : {}),
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
