import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export function configureApp(app: INestApplication): void {
  const configService = app.get(ConfigService);

  const clientUrl =
    configService.get<string>('CLIENT_URL') ?? 'http://localhost:5173';

  app.setGlobalPrefix('api');

  app.enableCors({
    origin: clientUrl,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
}
