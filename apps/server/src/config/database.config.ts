import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT ?? '1433', 10),
  database: process.env.DB_NAME ?? 'mydb',
  user: process.env.DB_USER ?? 'sa',
  password: process.env.DB_PASSWORD ?? 'YourPassword123',
  encrypt: process.env.DB_ENCRYPT === 'true',
  trustServerCertificate: process.env.DB_TRUST_SERVER_CERT !== 'false',
}));
