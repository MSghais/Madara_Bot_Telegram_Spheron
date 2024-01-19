import { Module } from '@nestjs/common';
import { databaseProviders } from './database.provider';
import { userProvider } from './user.providers';

@Module({
  providers: [...databaseProviders, ...userProvider],
  exports: [...databaseProviders,...userProvider],
})
export class DatabaseModule {}