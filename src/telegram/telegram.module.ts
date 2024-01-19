// src/telegram/telegram.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { TelegramBotController } from './telegram.bot.controller';
import { TelegramBotService } from './telegram.bot.service';
import { MenuServiceModule } from 'src/menus/menu.module';
import { UserModule } from 'src/user/user.module';
import { MadaraNodeBotManagement } from 'src/madara-nodes-bot/madara-node-module';

@Module({
  imports:[
    forwardRef(() => MenuServiceModule),
    forwardRef(() => UserModule),
    forwardRef(()=> MadaraNodeBotManagement),

  
  
  ],
  providers: [TelegramBotService],
  controllers: [TelegramBotController],
  exports: [TelegramBotService],
  // providers: [ TelegramBotService  ],

})
export class TelegramModule {}
