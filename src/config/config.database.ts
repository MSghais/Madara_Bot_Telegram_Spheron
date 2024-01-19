import { registerAs } from '@nestjs/config';
export default registerAs('database', () => ({
  url: process.env.DATABASE_URL || 'mongodb://localhost:27017/your_database_name',
}));
