// src/menus/menu.service.ts
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { UserDocument } from "src/schema/user.schema";
import { MarkupButton, SharedConfig } from "src/shared/shared-config";
import {
  MyContext,
  TelegramBotService,
} from "src/telegram/telegram.bot.service";
import { SecureKeyService } from "src/user/secure-key.service";
import { UserService } from "src/user/user.service";
import { Telegraf, Context, Markup, Scenes, Composer } from "telegraf";
import { Message } from "telegraf/typings/core/types/typegram";
import { SceneContextScene } from "telegraf/typings/scenes";
const publicKeyRegex = /^0x[0-9a-fA-F]{130}$/;
enum EnumState {
  ENTER = "ENTER",
  PENDING_TX = "PENDING_TX",
  WAITING = "WAITING",
  custom_amount_send = "custom_amount_send",
  SLIPPAGE = "custom_slippage",
  SELECT_ADDRESS = "select_address",
  SELECT_TOKEN_ADDRESS = "SELECT_TOKEN_ADDRESS",
  ADD_SPHERON_TOKEN = "ADD_SPHERON_TOKEN",
  VALIDATE_TX = "VALIDATE_TX",
}
@Injectable()
export class TokenManagementService {
  private readonly bot: Telegraf<MyContext>;
  private stage: Scenes.Stage<any>;
  private idsToDeleteMessagesWallet: Map<number, number[]> = new Map();
  private msgIdLoadingByUser: Map<number, number[]> = new Map();
  private isFirstMessageScene: Map<number, boolean> = new Map();
  private formTokenManagementMessageIdByUser: Map<number, number | undefined> =
    new Map();
  private stateEnumByUser: Map<number, EnumState | string> = new Map();
  private formNeedUpdateByUser: Map<number, boolean> = new Map();
  constructor(
    private tgBot: TelegramBotService,
    private userService: UserService,
    private sharedConfig: SharedConfig
  ) {
    this.bot = this.tgBot.getBot();
    this.createScene();
  }

  mainMenuMarkup(): MarkupButton {
    const button = Markup.button.callback("Menu", "/menu");

    return button;
  }

  closeFormMarkup(
    ctx: Context,
    tokenScene: Scenes.BaseScene<any>
  ): MarkupButton {
    const button = Markup.button.callback("Close", "CLOSE");

    tokenScene.action(`CLOSE`, async (ctx) => {
      const userId = ctx.from.id;
      if (this.formTokenManagementMessageIdByUser[userId]) {
        await ctx.deleteMessage(
          this.formTokenManagementMessageIdByUser[userId]
        );
        this.formTokenManagementMessageIdByUser[userId] = undefined;
        await tokenScene.leave();
      }
    });

    return button;
  }

  async checkIfExitSceneWithMenu(
    msg: string,
    ctx: Context,
    tokenScene?: Scenes.BaseScene<any>
  ) {
    if (msg == "/menu") {
      if (tokenScene) {
        tokenScene.leave();
      }
      this.sharedConfig.renderMainMenu(ctx);
    }
  }

  async sendTokenForm(ctx: Context, tokenScene: Scenes.BaseScene<any>) {
    try {
      const userId = ctx.from.id;
      const chatId = ctx.chat.id;
      tokenScene.action("ADD_SPHERON_TOKEN", async (ctx) => {
        console.log("ADD_SPHERON_TOKEN");
        const userId = ctx.from.id;
        const msg = await ctx.reply(`Enter the Spheron token you want`);
        this.idsToDeleteMessagesWallet[userId] &&
          this.idsToDeleteMessagesWallet[userId].push(msg.message_id);
        this.stateEnumByUser[userId] = EnumState.ADD_SPHERON_TOKEN;
        tokenScene.on("text", async (ctx) => {
          try {
            const address = ctx.message.text;
            const userId = ctx.from.id;
            const msg = ctx.message.text;
            if (msg == "/menu") {
              this.checkIfExitSceneWithMenu(msg, ctx, tokenScene);
            }
            if (this.stateEnumByUser[userId] == EnumState.ADD_SPHERON_TOKEN) {
              console.log("TEXT address token");

              await this.userService.updateTokenSpheron(
                userId?.toString(),
                msg
              );

              await ctx.reply(`You're spheron token is correctly add`);
            }
          } catch (e) {
            console.log("issue in text");
          }
        });
      });
      let markup;
      const addSPheronButton = Markup.button.callback(
        "Add token Spheron ✔️🌠 ✨",
        "ADD_SPHERON_TOKEN"
      );
      const menuButton = this.mainMenuMarkup();
      markup = Markup.inlineKeyboard([addSPheronButton, menuButton]);
      if (
        this.formTokenManagementMessageIdByUser[userId] &&
        this.formNeedUpdateByUser[userId]
      ) {
        let text = `
        Welcome to ${this.sharedConfig.getProjectTitle()} \n 
        Please enter your Spheron Access Token to proceed.\n
        You can learn about how to create an access token here: https://docs.spheron.network/rest-api/#creating-an-access-tokenn
       
        `;
        const formMessage = await ctx.telegram.editMessageText(
          chatId,
          this.formTokenManagementMessageIdByUser[userId],
          undefined,
          text,
          markup
        );
      } else {
        const formMessage = await ctx.reply(
          `
        Welcome to ${this.sharedConfig.getProjectTitle()} \n 
        Please enter your Spheron Access Token to proceed.\n
        You can learn about how to create an access token here: https://docs.spheron.network/rest-api/#creating-an-access-tokenn
       `,
          markup
        );
        this.formTokenManagementMessageIdByUser[userId] =
          formMessage.message_id;
      }
    } catch (error) {
      console.log("sendTokenForm: error", error);
    }
  }

  async deleteMessageOfScene(ctx: Context) {
    const userId = ctx.from.id;
    this.idsToDeleteMessagesWallet[userId] &&
      this.idsToDeleteMessagesWallet[userId].push(ctx.message.message_id);

    if (
      this.idsToDeleteMessagesWallet[userId] &&
      this.idsToDeleteMessagesWallet[userId].length > 0
    ) {
      for (let i of this.idsToDeleteMessagesWallet[userId]) {
        await ctx.deleteMessage(i);
      }
    }
    this.idsToDeleteMessagesWallet[userId] = [];
  }

  createScene() {
    const tokenScene = new Scenes.BaseScene<any>("token");
    this.stage = new Scenes.Stage([]);
    tokenScene.enter(async (ctx: Context, next) => {
      try {
        const userId = ctx.from.id;
        const chatId = ctx.chat.id;
        this.msgIdLoadingByUser[userId] = [];
        this.isFirstMessageScene[userId] = true;
        await this.sendTokenForm(ctx, tokenScene);
        this.isFirstMessageScene[userId] = false;
      } catch (e) {
        console.log("e", e);
      }
    });
    tokenScene.on("text", async (ctx) => {
      try {
        const address = ctx.message.text;
        const userId = ctx.from.id;
        const msg = ctx.message.text;
        if (msg == "/menu") {
          // this.sharedConfig.renderMainMenu(ctx)
          this.checkIfExitSceneWithMenu(msg, ctx, tokenScene);
        }
        if (this.stateEnumByUser[userId] == EnumState.ADD_SPHERON_TOKEN) {
          await this.userService.updateTokenSpheron(userId?.toString(), msg);
          await ctx.reply(`You're spheron token is correctly add`);
        }
      } catch (e) {
        console.log("issue in text");
      }
    });

    const stage = new Scenes.Stage<Scenes.SceneContext>([tokenScene], {
      ttl: 10,
    });
    this.bot.use(this.stage.register(tokenScene).middleware());
    this.bot.command(
      "token",
      async (ctx: Context & { scene: SceneContextScene<any> }) => {
        console.log("run token scene");
        const userId = ctx.from.id;
        this.msgIdLoadingByUser[userId] = [];
        this.isFirstMessageScene[userId] = true;
        this.idsToDeleteMessagesWallet[userId] = [];
        await ctx?.scene?.enter("token");
      }
    );
    this.bot.action(
      "Token",
      async (ctx: Context & { scene: SceneContextScene<any> }) => {
        const userId = ctx.from.id;
        this.msgIdLoadingByUser[userId] = [];
        this.isFirstMessageScene[userId] = true;
        this.idsToDeleteMessagesWallet[userId] = [];
        await ctx?.scene?.enter("token");
      }
    );
    return tokenScene;
  }
}
