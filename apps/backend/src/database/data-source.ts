import { config } from 'dotenv';
import { resolve } from 'path';
import { DataSource } from 'typeorm';

config({
  path: resolve(__dirname, '../../.env'),
});

function getRequiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`La variable de entorno ${name} es obligatoria`);
  }

  return value;
}

const AppDataSource = new DataSource({
  type: 'postgres',

  host: getRequiredEnv('DB_HOST'),
  port: Number(getRequiredEnv('DB_PORT')),
  database: getRequiredEnv('DB_NAME'),
  username: getRequiredEnv('DB_USER'),
  password: getRequiredEnv('DB_PASSWORD'),

  synchronize: false,
  logging: false,

  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
});

export default AppDataSource;
