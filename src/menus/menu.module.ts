import { Module, forwardRef } from '@nestjs/common';
import { TelegramModule } from '../telegram/telegram.module';
import { MenuService } from './menu.service';
import { UserModule } from 'src/user/user.module';
import { MadaraNodeBotManagement } from 'src/madara-nodes-bot/madara-node-module';
import { SharedModule } from 'src/shared/shared.module';
import { SecureKeyService } from 'src/user/secure-key.service';
import { DeployService } from 'src/madara-nodes-bot/deploy-service';

@Module({
  imports: [
    forwardRef(()=> TelegramModule),
    forwardRef(()=> UserModule),
    forwardRef(()=> MadaraNodeBotManagement),
    forwardRef(()=> SharedModule),
], // Import the TelegramModule to access TelegramBotService
  providers: [MenuService, SecureKeyService, DeployService],
  exports: [MenuService,  ], 
})
export class MenuServiceModule {}