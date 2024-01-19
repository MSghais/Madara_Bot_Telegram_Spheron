import { registerAs } from '@nestjs/config';

// src/config/config.ts
export default () => ({
    telegramBotToken: process.env.TELEGRAM_API_TOKEN || 'default-token-value',
    TELEGRAM_API_TOKEN:process.env.TELEGRAM_API_TOKEN || 'default-token-value',
    DATABASE_URL:process.env.DATABASE_URL, // Mongo DB
    ENCRYPTION_KEY:process.env.ENCRYPTION_KEY,
  });

