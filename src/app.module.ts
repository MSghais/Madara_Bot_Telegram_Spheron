import { Module } from '@nestjs/common';
import { TelegramModule } from './telegram/telegram.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Telegraf } from 'telegraf';
import { MenuServiceModule } from './menus/menu.module';
import { MongooseModule } from '@nestjs/mongoose';
import config from './config/config';
import { DatabaseModule } from './database/database.module';
import { CacheModule } from '@nestjs/cache-manager';
@Module({
  imports: [
    CacheModule.register(
      {
        isGlobal: true,
      }
    ),
    TelegramModule,
    MenuServiceModule,
    DatabaseModule,
    ConfigModule.forRoot(
      {  envFilePath: [".env"],

      isGlobal:true ,
      load:[ config]
    }
    ),
    MongooseModule.forRootAsync({
      useFactory: async (config: ConfigService) => ({
        uri: config.get<string>('DATABASE_URL'),
        useNewUrlParser: true,
        useUnifiedTopology: true,
      }),
      inject: [ConfigService],
    }),
  ],

})
export class AppModule {}
