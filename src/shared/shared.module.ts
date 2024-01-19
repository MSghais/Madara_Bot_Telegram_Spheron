import { Module, forwardRef } from '@nestjs/common';
import { TelegramModule } from '../telegram/telegram.module';
import { SharedConfig } from './shared-config';
import { SharedCache } from './shared-cache';
@Module({
  imports: [
    forwardRef(() => TelegramModule), // Import the TelegramModule to access TelegramBotService
  ],
  providers: [SharedConfig, SharedCache,],
  exports: [SharedConfig, SharedCache,], // Export the MenuService to make it available in other modules
})
export class SharedModule { }