import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthModule } from './health/health.module';
import { Pa01Module } from './modules/pa01-gestion-usuarios-proyectos-colaborativos/pa01.module';
import { Pa02Module } from './modules/pa02-modelado-interoperabilidad-uml/pa02.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST'),
        port: Number(configService.get<string>('DB_PORT')),
        database: configService.get<string>('DB_NAME'),
        username: configService.get<string>('DB_USER'),
        password: configService.get<string>('DB_PASSWORD'),

        autoLoadEntities: true,

        synchronize: false,
      }),
    }),

    HealthModule,
    Pa01Module,
    Pa02Module,
  ],
})
export class AppModule {}
