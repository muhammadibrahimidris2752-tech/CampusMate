import { randomUUID } from 'crypto';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';
import { LoggingConfig } from '../../config/config.types';

/**
 * Structured application logging (Step 8).
 *
 * - JSON logs in staging/production (log.pretty=false), human-readable in
 *   local dev (log.pretty=true) — see config.logging.pretty.
 * - Every request gets a request ID: reused from an incoming `X-Request-Id`
 *   header if the caller/gateway already set one, otherwise generated here.
 *   It's echoed back as a response header and attached to `req.id`, which
 *   GlobalExceptionFilter includes in every error response — the same ID
 *   ties together a client-reported error, the API's logs, and (later) any
 *   upstream proxy/load-balancer logs.
 * - `redact` strips credentials from what actually gets logged, even
 *   though nothing should be logging them directly — defense in depth
 *   against a future accidental `logger.log(req.body)`.
 * - Nothing about audit/security logging (who changed what business
 *   record) lives here — this is transport/application logging only. See
 *   docs/architecture/module-conventions.md for where audit logging will
 *   attach in a later phase.
 */
@Module({
  imports: [
    PinoLoggerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const logging = configService.get<LoggingConfig>('logging')!;

        return {
          pinoHttp: {
            level: logging.level,
            genReqId: (
              req: { headers: Record<string, string | string[] | undefined> },
              res: { setHeader: (name: string, value: string) => void },
            ) => {
              const existing = req.headers['x-request-id'];
              const id = (Array.isArray(existing) ? existing[0] : existing) ?? randomUUID();
              res.setHeader('X-Request-Id', id);
              return id;
            },
            redact: {
              paths: [
                'req.headers.authorization',
                'req.headers.cookie',
                'req.body.password',
                'req.body.passwordConfirmation',
                'req.body.token',
                'req.body.accessToken',
                'req.body.refreshToken',
                'res.headers["set-cookie"]',
              ],
              censor: '[REDACTED]',
            },
            autoLogging: true,
            transport: logging.pretty
              ? { target: 'pino-pretty', options: { singleLine: true, colorize: true } }
              : undefined,
            customLogLevel: (_req: unknown, res: { statusCode: number }, err?: Error) => {
              if (err || res.statusCode >= 500) return 'error';
              if (res.statusCode >= 400) return 'warn';
              return 'info';
            },
          },
        };
      },
    }),
  ],
  exports: [PinoLoggerModule],
})
export class LoggerModule {}
