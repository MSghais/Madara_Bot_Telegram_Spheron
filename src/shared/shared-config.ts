import { Injectable } from '@nestjs/common';
import { MyContext, TelegramBotService } from 'src/telegram/telegram.bot.service';
import { Telegraf, Context, Markup, Scenes, } from 'telegraf';
export type MarkupButton = ReturnType<typeof Markup.button.callback>;

@Injectable()
export class SharedConfig {
  private readonly bot: Telegraf<MyContext>
  private protocolAddress: string | undefined
  private emojiValidate: string = "✓"
  private successEmoji: string = "✅"
  private errorEmoji:string="❌"
  private hashtagBot: string = "@MadaraNodeDeployerBot"
  private botName: string = "MadaraNodeDeployerBot"
  private readonly thirdMenu: string[][] = [
    [ 'Referral',],
  ];

  private projectTitle: string = "Madara Node Deployer"
  constructor(
    private tgBot: TelegramBotService,
  ) {
    this.bot = this.tgBot.getBot()
  }

  getBotName() {
    return this.botName
  }

  getBotHashtag() {
    return this.hashtagBot
  }

  getEmojiValidate() {
    return this.emojiValidate
  }
  getEmojiSuccess() {
    return this.successEmoji
  }
  getProjectTitle() {
    return this.projectTitle
  }

  private readonly menuOptions: string[][] = [
    ["Deploy", "Token"],
  ];

  private readonly menuOptionsObject: {text:string, option:string}[][] = [
    [{text:"Deploy",option:"Deploy"}, 
    {text:"Token",option:"Token"}, 
  ],

  ];

  private readonly secondOptions: string[][] = [
    ['Management', 'Close'],
    ['Status'],

  ];

  getMenuOptionsStr() {
    return this.menuOptions;
  }

  
  renderMenuButton(): MarkupButton {
    const button = Markup.button.callback("Menu", "/menu");
    return button;
  }

  renderMainMenu(ctx: Context) {
  
    const menuMessage = `
    Welcome to ${this.getProjectTitle()}\n
    Here is the following commands.\n
    /menu - open the menu.\n
    /token - update spheron access token.\n
    /management - open the menu.\n
    /deploy - start a deployment.\n
    /status - get deployment status.\n
    /close - close or delete instance.\n
  `;
    const buttons = []
    let buttonOne = []
    this.menuOptionsObject.map((menuNames) => {
      for (let m of menuNames) {
        const button = Markup.button.callback(m.text.toString(), `${m.option.toString()}`)
        buttons.push(button)
        this.bot.action(`${m.toString()}`, (ctx) => {
          ctx.reply(m)
        })
      }
    });
    this.secondOptions.map((menuNames) => {
      for (let m of menuNames) {
        const button = Markup.button.callback(m.toString(), `${m.toString()}`)
        buttonOne.push(button)
        this.bot.action(`${m.toString()}`, (ctx) => {
          ctx.reply(m)
        })
      }
    });
    let thirdButtons = []

    const keyboard = Markup.inlineKeyboard([buttons,
      buttonOne,
      thirdButtons
    ]);
    ctx.reply(menuMessage, keyboard);
  }

}
