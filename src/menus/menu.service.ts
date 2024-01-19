// src/menus/menu.service.ts
import { Injectable } from "@nestjs/common";
import { ethers } from "ethers";
import {
  MyContext,
  TelegramBotService,
} from "src/telegram/telegram.bot.service";
import { UserService } from "src/user/user.service";
import {
  Telegraf,
  Context,
  Markup,
  session,
  Scenes,
  NarrowedContext,
} from "telegraf";
import { message } from "telegraf/filters";
import {
  CallbackQuery,
  InlineKeyboardMarkup,
  Update,
} from "telegraf/typings/core/types/typegram";
import { SceneContextScene } from "telegraf/typings/scenes";
import { SharedConfig } from "src/shared/shared-config";
import { DeployService } from "src/madara-nodes-bot/deploy-service";
import { CloseInstanceService } from "src/madara-nodes-bot/close-instance.service";
import { ManagementNode } from "src/madara-nodes-bot/oganization-management";
import { StatusInstanceService } from "src/madara-nodes-bot/status-instance.service";

type ContextNarrow = NarrowedContext<
  MyContext & {
    match: RegExpExecArray;
  },
  Update.CallbackQueryUpdate<CallbackQuery>
>;
@Injectable()
export class MenuService {
  private readonly bot: Telegraf<MyContext>;
  private stage: Scenes.Stage<any>;
  private stageTransfer: Scenes.Stage<any>;

  constructor(
    private tgBot: TelegramBotService,
    private userService: UserService,
    private sharedConfig: SharedConfig,
    private deployScene: DeployService,
    private closeInstanceScene: CloseInstanceService,
    private managementNodeScene: ManagementNode,
    private statusScene:StatusInstanceService
  ) {
    this.bot = this.tgBot.getBot();
    this.stage = new Scenes.Stage([]);
    this.stageTransfer = new Scenes.Stage([]);
    this.menuSetup();
    this.setupMenuScene();
  }
  menuSetup() {
    this.setupMenu();
  }

  private readonly menuOptions: string[][] = [
    ["Deploy", "Token"],
  ];

  getMenuOptionsStr() {
    return this.menuOptions;
  }


  setupMenu() {
    this.bot.action("/menu", async (ctx) => {
      console.log("ctx.scene.current", ctx.scene.current);
      if (ctx.scene.current) {
        await ctx.scene?.current?.leave();
        await ctx.scene.leave();
      }
      if (ctx.scene.current) {
        await ctx.scene?.current?.leave();
      
      }
      await ctx.scene.leave();
      this.sharedConfig.renderMainMenu(ctx);
    });
    

    this.bot.command("start", async (ctx) => {
      try {
        const text = ctx.message.text;
        // Regular expression to match "/start" followed by any characters
        const regex = /^\/start\s+(.+)/;
  
        // Use the `exec` method to extract the parameter
        const matches = regex.exec(text);
  
        let startParam;
        let startParamLink;
        if (matches && matches[1]) {
          const startParams = matches[1];
          startParam = matches[1];
          startParamLink = matches[1];
          console.log("Start Parameter:", startParamLink);
        } else {
          console.log("No start parameter found.");
        }
        /**Instantiate first wallet with referral link */
        if (startParamLink) {
          const chatId = ctx.chat.id.toString();
          const userId = ctx.from.id.toString();
          const name = ctx.from.first_name;
          const wallet = await this.userService.instantiateUser(
            chatId,
            userId,
            name,
            undefined,
            startParamLink
          );
        } else {
          const chatId = ctx.chat.id.toString();
          const userId = ctx.from.id.toString();
          const name = ctx.from.first_name;
          const wallet = await this.userService.instantiateUser(
            chatId,
            userId,
            name,
            undefined,
            undefined
          );
        }
  
        await ctx.scene.leave();
        if (ctx.scene.current) {
          await ctx.scene?.current?.leave();
          await ctx.scene.leave();
        }
        if (ctx.scene.current) {
          await ctx.scene?.current?.leave();
          if (ctx.scene.current.id == "swap") {
          }
        }
        this.sharedConfig.renderMainMenu(ctx);
      }catch(e) {
        console.log("start issue", e)

      }

    });

    this.bot.command("menu", async (ctx) => {
      try {
        await ctx?.scene?.leave();
        if (ctx?.scene?.current) {
          await ctx.scene?.current?.leave();
          await ctx?.scene?.leave();
        }
        if (ctx?.scene?.current) {
          await ctx?.scene?.current?.leave();
       
        }
        this.sharedConfig.renderMainMenu(ctx);
      } catch (e) {
        console.log("menu error",e )
      }
    });
    this.bot.hears("/menu", async (ctx) => {
      console.log("ctx.scene.current", ctx.scene.current);

      if (ctx.scene.current) {
        await ctx.scene?.current?.leave();
        await ctx.scene.leave();
      }
      if (ctx.scene.current) {
        await ctx.scene?.current?.leave();
      }
      await ctx.scene.leave();
      this.sharedConfig.renderMainMenu(ctx);
    });
  }

  setupMenuScene() {
    const deployScene = this.deployScene.createScene();
    const tokenScene = this.deployScene.createScene();
    const closeScene = this.closeInstanceScene.createScene();
    const managementScene = this.managementNodeScene.createScene();
    const statusScene = this.statusScene.createScene();
    const stage = new Scenes.Stage<Scenes.SceneContext>(
      [
        deployScene, tokenScene, closeScene, managementScene, statusScene],
      {
        ttl: 10,
      }
    );
    stage.register(deployScene);
    this.bot.command("deploy", async (ctx: Context & { scene: SceneContextScene<any> }) => {
      console.log("run deploy scene")
      const userId = ctx.from.id;
  
      await ctx?.scene?.enter('deploy');
    })
    this.bot.action("Deploy", async (ctx: Context & { scene: SceneContextScene<any> }) => {
      const userId = ctx.from.id;

      await ctx?.scene?.enter('deploy');
    })
  }
}
