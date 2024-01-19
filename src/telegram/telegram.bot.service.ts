// src/telegram-bot/telegram-bot.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Composer, Context, Markup, Scenes, Telegraf, session } from 'telegraf';
const { enter, leave } = Scenes.Stage;// Handler factories

export type MyContext = Scenes.SceneContext<MySceneSession>;
interface MySceneSession extends Scenes.SceneSessionData {
  mySceneSessionProp?: number;
}

@Injectable()
export class TelegramBotService {
  private readonly bot: Telegraf<MyContext>;
  private stage: Scenes.Stage<any>;
  private wiz: Scenes.WizardScene<any>;
 
  constructor(private readonly configService: ConfigService,
  ) {
    let token = this.configService.get<string>('telegramBotToken');
    token = this.configService.get<string>('TELEGRAM_API_TOKEN');
    token = process.env.TELEGRAM_API_TOKEN; // Access the environment variable directly
    this.bot = new Telegraf<MyContext>(token);
    this.bot.use(session())
    this.bot.launch()
  }

  getBot(): Telegraf<MyContext> {
    return this.bot;
  }
}
