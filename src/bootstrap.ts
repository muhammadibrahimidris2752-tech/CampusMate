import { VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { createGlobalValidationPipe } from './common/pipes/global-validation-pipe.factory';
import { AppConfig } from './config/config.types';

/**
 * Everything about how the Nest app is configured EXCEPT actually starting
 * it (no app.listen() here). Pulled out of main.ts specifically so
 * test/app.e2e-spec.ts can build a test application that is configured
 * identically to the real server — CORS, security headers, versioning,
 * validation, and all — instead of a hand-duplicated copy that can drift
 * out of sync with what actually runs in production.
 */
export function configureApp(app: NestExpressApplication): AppConfig {
  const configService = app.get(ConfigService);
  const appConfig = configService.get<AppConfig>('app')!;

  app.set('trust proxy', appConfig.trustProxy);

  app.use(helmet(appConfig.enableSwagger ? { contentSecurityPolicy: false } : {}));

  app.enableCors({
    origin: appConfig.corsAllowedOrigins,
    credentials: true,
  });

  app.setGlobalPrefix(appConfig.globalPrefix);

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: appConfig.defaultApiVersion,
  });

  app.useGlobalPipes(createGlobalValidationPipe());

  app.enableShutdownHooks();

  if (appConfig.enableSwagger) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle(appConfig.name)
      .setDescription('Nigerian Student Platform — Backend API (Phase 0A foundation)')
      .setVersion('0.1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup(`${appConfig.globalPrefix}/docs`, app, document);
  }

  return appConfig;
}
