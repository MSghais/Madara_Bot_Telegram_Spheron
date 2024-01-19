// src/telegram.bot.ts
import { Controller, Injectable, Logger } from '@nestjs/common';
import { OnModuleInit } from '@nestjs/common';
import { Context, Markup, Telegraf, session } from 'telegraf';
import { ConfigService } from '@nestjs/config';
import { TelegramBotService } from './telegram.bot.service';
import { MenuService } from 'src/menus/menu.service';
@Controller()
// export class TelegramBotController implements OnModuleInit {
export class TelegramBotController implements OnModuleInit {
  private readonly logger = new Logger(TelegramBotController.name);
  private bot: Telegraf;
  constructor(private readonly configService: ConfigService, 
    private readonly telegramBotService: TelegramBotService,
    private readonly menuService: MenuService,
     ) {
    let token= this.configService.get<string>('telegramBotToken');
    token= this.configService.get<string>('TELEGRAM_API_TOKEN');
    this.bot = this.telegramBotService.getBot();
    this.menuService.setupMenuScene()
  }

  async onModuleInit() {
    try {
      this.menuService.setupMenu()
      this.menuService.setupMenuScene()
    } catch (error) {
      this.logger.error('Error initializing Telegram bot:', error);
    }
  }
}
