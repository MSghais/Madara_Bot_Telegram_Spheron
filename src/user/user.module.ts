import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { SecureKeyService } from './secure-key.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { DatabaseModule } from 'src/database/database.module';
import { userProvider } from '../database/user.providers';
import { databaseProviders } from 'src/database/database.provider';
import { SpheronService } from './spheron.service';

@Module({
  imports:[DatabaseModule, ],
  providers: [UserService, SecureKeyService,SpheronService,  Connection, ...userProvider],
  exports: [UserService, SpheronService],
})
export class UserModule {}
