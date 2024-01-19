// src/menus/menu.service.ts
import { Inject, Injectable } from '@nestjs/common';
import { MyContext, TelegramBotService } from 'src/telegram/telegram.bot.service';
import { Telegraf, Context, Markup, Scenes, } from 'telegraf';

@Injectable()
export class SharedCache {
  private readonly bot: Telegraf<MyContext>
  private idsMessagesWallet: number[]
  private idsInlineMessagesWallet: string[]
  constructor(
    private tgBot: TelegramBotService,
  ) {
    this.bot = this.tgBot.getBot()

  }

  getIdsMessageWallet() {
    return this.idsMessagesWallet
  }

  getIdsInlineMessage() {
    return this.idsInlineMessagesWallet
  }
  getIdsMessagesWallet() {
    return this.idsMessagesWallet
  }

  getWalletMarkup() {
    return this.idsMessagesWallet
  }
  async sendLoadingAnimation(ctx: Context) {
    const loadingStates = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    const delay = 300; // milliseconds

    for (const state of loadingStates) {
      await ctx.replyWithChatAction('typing');
      await ctx.reply(state);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

}
