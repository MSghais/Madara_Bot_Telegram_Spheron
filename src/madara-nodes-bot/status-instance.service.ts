import { Injectable } from "@nestjs/common";
import { MarkupButton, SharedConfig } from "src/shared/shared-config";
import {
  MyContext,
  TelegramBotService,
} from "src/telegram/telegram.bot.service";
import { SpheronService } from "src/user/spheron.service";
import { Telegraf, Context, Markup, Scenes, Composer } from "telegraf";
import { SceneContextScene } from "telegraf/typings/scenes";
enum EnumState {
  ENTER = "ENTER",
  WAITING = "WAITING",
  ADD_SPHERON_TOKEN = "ADD_SPHERON_TOKEN",
  CLOSE_INSTANCE = "CLOSE_INSTANCE",
  DELETE_INSTANCE = "DELETE_INSTANCE",
  GET_CLUSTERS_BY_ORGANIZATION = "GET_CLUSTERS_BY_ORGANIZATION",
  GET_STATUS_BY_INSTANCE = "GET_STATUS_BY_INSTANCE",
  GET_INSTANCES = "GET_INSTANCES",
  VALIDATE_TX = "VALIDATE_TX",
}
@Injectable()
export class StatusInstanceService {
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
    private sharedConfig: SharedConfig,
    private spheronService: SpheronService
  ) {
    this.bot = this.tgBot.getBot();
    this.createScene();
  }

  mainMenuMarkup(): MarkupButton {
    const button = Markup.button.callback("Menu", "/menu");

    return button;
  }
  async sendStatusInstanceForm(
    ctx: Context,
    statusScene: Scenes.BaseScene<any>
  ) {
    try {
      const userId = ctx.from.id;
      const chatId = ctx.chat.id;
      let markup;

      const getInstanceBtn = Markup.button.callback(
        "Get instances",
        EnumState.GET_INSTANCES
      );

      const getClusterBtn = Markup.button.callback(
        "Get clusters",
        EnumState.GET_CLUSTERS_BY_ORGANIZATION
      );

      const getStatusByInstance = Markup.button.callback(
        "Get status by Instance",
        EnumState.GET_STATUS_BY_INSTANCE
      );

      const menuButton = this.mainMenuMarkup();

      const allButtonsGet = [
        getInstanceBtn,
        getClusterBtn,
        getStatusByInstance,
      ];

      markup = Markup.inlineKeyboard([allButtonsGet, [menuButton]]);
      if (
        this.formTokenManagementMessageIdByUser[userId] &&
        this.formNeedUpdateByUser[userId]
      ) {
        let text = `
        Welcome to ${this.sharedConfig.getProjectTitle()} \n You can manage your spheron api key here. \n Check our clusters, instances, and others informations. \n
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
        Welcome to ${this.sharedConfig.getProjectTitle()} \n You can manage your spheron api key here. \n Check our clusters, instances, and others informations. \n

       `,
          markup
        );
        this.formTokenManagementMessageIdByUser[userId] =
          formMessage.message_id;
      }
    } catch (error) {
      console.log("sendStatusInstanceForm: error", error);
    }
  }
  async checkIfExitSceneWithMenu(
    msg: string,
    ctx: Context,
    statusScene?: Scenes.BaseScene<any>
  ) {
    if (msg == "/menu") {
      if (statusScene) {
        statusScene.leave();
      }
      this.sharedConfig.renderMainMenu(ctx);
    }
  }

  createScene() {
    const statusScene = new Scenes.BaseScene<any>("status");
    this.stage = new Scenes.Stage([]);
    statusScene.enter(async (ctx: Context, next) => {
      try {
        const userId = ctx.from.id;
        const chatId = ctx.chat.id;
        this.msgIdLoadingByUser[userId] = [];
        this.isFirstMessageScene[userId] = true;
        await this.sendStatusInstanceForm(ctx, statusScene);
        this.isFirstMessageScene[userId] = false;
      } catch (e) {
        console.log("Status enter scene error", e);
      }
    });

    statusScene.action(EnumState.GET_CLUSTERS_BY_ORGANIZATION, async (ctx) => {
      try {
        const userId = ctx.from.id;
        this.stateEnumByUser[userId] = EnumState.GET_CLUSTERS_BY_ORGANIZATION;
        if (
          this.stateEnumByUser[userId] == EnumState.GET_CLUSTERS_BY_ORGANIZATION
        ) {
          const { clusters, message, success } =
            await this.spheronService.getClustersByOrganization(
              userId?.toString()
            );
          console.log("message getClustersByOrganization", message);
          console.log("success getClustersByOrganization", success);
          if (!success) {
            if (!message) {
              return await ctx.reply(
                `Error when try to get clusters, please retry or contact support`
              );
            } else {
              return await ctx.reply(
                `Error when try to get clusters: ${message}\n Please retry or contact support`
              );
            }
          }
          console.log("clusters", clusters);
          const markupButton = [];
          for (let cluster of clusters) {
            const markup = Markup.button.callback(
              `${cluster?.id}`,
              `${cluster.id}`
            );
            markupButton.push(markup);
          }

          const inboard = Markup.inlineKeyboard(markupButton);

          const clusterIds = clusters?.map((c) => c.id);
          const clusterTextIds = clusterIds.map((id) => {
            return `
            <pre><code><a href="copy:${id}">${id}</a></code></pre>\n`;
          });

          let text = `Here is your clusters ids.\n You can copy paste your cluster id.\n Clusters ids available are: `;

          clusterTextIds.map((t) => {
            text += t;
          });

          text += `Copy paste your cluster id to get instances and others informations.`;
          await ctx.reply(text, {
            // reply_markup: inboard?.reply_markup,
            parse_mode: "HTML",
          });
        }
      } catch (e) {
        console.log("issue in GET_CLUSTERS_BY_ORGANIZATION", e);
      }
    });

    statusScene.action(EnumState.GET_INSTANCES, async (ctx) => {
      try {
        const userId = ctx.from.id;
        await ctx.reply(`Write your cluster id to get the instances:`);
        this.stateEnumByUser[userId] = EnumState.GET_INSTANCES;
      } catch (e) {
        console.log("Get instances issue in text", e);
      }
    });

    statusScene.action(EnumState.GET_STATUS_BY_INSTANCE, async (ctx) => {
      try {
        const userId = ctx.from.id;
        await ctx.reply(
          `Write your Instance id and the Instance info and deployment:`
        );
        this.stateEnumByUser[userId] = EnumState.GET_STATUS_BY_INSTANCE;
      } catch (e) {
        console.log("Get instance status issue in text", e);
      }
    });

    /** Action based on text and State enum by user */
    statusScene.on("text", async (ctx) => {
      try {
        const address = ctx.message.text;
        const userId = ctx.from.id;
        const msg = ctx.message.text;
        if (msg == "/menu") {
          this.checkIfExitSceneWithMenu(msg, ctx, statusScene);
        }
        if (this.stateEnumByUser[userId] == EnumState.GET_INSTANCES) {
          const { instances, success, message } =
            await this.spheronService.getInstancesByCluster(
              userId?.toString(),
              msg
            );

          if (!success) {
            if (!message) {
              return await ctx.reply(
                `Error when try to get instances by clusters\n Please retry or contact the support`
              );
            } else {
              return await ctx.reply(
                `Error when try to get instances by clusters : ${message}\n Please retry or contact the support`
              );
            }
          }
          const markupButton = [];
          for (let instance of instances) {
            const markup = Markup.button.callback(
              `Instance: ${instance?.id}`,
              `${instance.id}`
            );
            markupButton.push(markup);
          }
          const instancesIds = instances?.map((c) => c.id);
          const instanceTextIds = instancesIds.map((id) => {
            return `
            <pre><code><a href="copy:${id}">${id}</a></code></pre>\n`;
          });

          let textGetInstances = `Here is your instances ids.\n You can copy paste your cluster id.\n Instances ids available are: `;
          instanceTextIds.map((t) => {
            textGetInstances += t;
          });
          await ctx.reply(textGetInstances, {
            parse_mode: "HTML",
          });
          this.stateEnumByUser[userId] = EnumState.WAITING;
        } else if (
          this.stateEnumByUser[userId] == EnumState.GET_STATUS_BY_INSTANCE
        ) {
          const { instance, success, message } =
            await this.spheronService.getInstance(userId?.toString(), msg);

          if (!success) {
            if (!message) {
              return await ctx.reply(
                `Error when try to get instances by clusters\n Please retry or contact the support`
              );
            } else {
              return await ctx.reply(
                `Error when try to get instances by clusters : ${message}\n Please retry or contact the support`
              );
            }
          }

          const instanceDeployment =
            await this.spheronService.getInstanceDeployment(
              userId?.toString(),
              instance?.activeDeployment
            );
          let connectionUrlText = ``;
          instanceDeployment?.connectionUrls?.map((c) => {
            connectionUrlText += `${c}\n`;
          });

          let textInstanceLogs = ``;
          const instanceLogs = await this.spheronService.getInstanceLogs(
            userId?.toString(),
            instance?.activeDeployment
          );
          console.log("instance logs", instanceLogs);
          instanceLogs?.map((l) => {
            textInstanceLogs += `${l}\n`;
          });

          textInstanceLogs = textInstanceLogs.substring(
            textInstanceLogs?.length - 1000,
            textInstanceLogs?.length
          );
          let textGetInstances = `Here is your instance info of ${msg}.\n 
          Connection urls:\n ${connectionUrlText} \n 
          Logs: ${textInstanceLogs}`;
          await ctx.reply(textGetInstances, {
            parse_mode: "HTML",
          });
          this.stateEnumByUser[userId] = EnumState.WAITING;
        } else if (this.stateEnumByUser[userId] == EnumState.CLOSE_INSTANCE) {
          await ctx.reply(`Close compute in process, please wait`);
          const close = await this.spheronService.closeComputeInstance(
            userId?.toString(),
            msg
          );

          console.log("close", close);
          if (close.success) {
            await ctx.reply(`You're instance ${msg} is correctly close`);
          } else if (!close.success) {
            if (close?.message) {
              await ctx.reply(
                `Error message ${close?.message}\n Issue when closing your instance ${msg}.\n Verify your instance ID or contact the support!`
              );
            } else {
              await ctx.reply(
                `Issue when closing your instance ${msg}, verify your instance ID or contact the support`
              );
            }
          }
          this.stateEnumByUser[userId] = EnumState.WAITING;
        } else if (this.stateEnumByUser[userId] == EnumState.DELETE_INSTANCE) {
          await ctx.reply(`Delete compute in process`);
          const close = await this.spheronService.deleteComputeInstance(
            userId?.toString(),
            msg
          );
          console.log("close", close);
          if (close) {
            await ctx.reply(`You're instance ${msg} is correctly delete`);
          }
          if (!close) {
            await ctx.reply(
              `Issue when delete your instance ${msg}, verify your instance ID or contact the support. Try to close your instance before delete it`
            );
          }
          this.stateEnumByUser[userId] = EnumState.WAITING;
        }
      } catch (e) {
        console.log("issue in text", e);
        console.log("e?.message", e?.message);
        if (e?.message) {
          await ctx.reply(
            `Issue in process your request, please verify your expiry token key and retry`
          );
        } else {
          await ctx.reply(
            `Issue in process your request, please verify your expiry token key and retry`
          );
        }
      }
    });

    const stage = new Scenes.Stage<Scenes.SceneContext>([statusScene], {
      ttl: 10,
    });
    this.bot.use(this.stage.register(statusScene).middleware());
    this.bot.command(
      "status",
      async (ctx: Context & { scene: SceneContextScene<any> }) => {
        console.log("run status scene");
        const userId = ctx.from.id;
        this.msgIdLoadingByUser[userId] = [];
        this.isFirstMessageScene[userId] = true;
        this.idsToDeleteMessagesWallet[userId] = [];
        await ctx?.scene?.enter("status");
      }
    );
    this.bot.action(
      "Status",
      async (ctx: Context & { scene: SceneContextScene<any> }) => {
        const userId = ctx.from.id;
        this.msgIdLoadingByUser[userId] = [];
        this.isFirstMessageScene[userId] = true;
        this.idsToDeleteMessagesWallet[userId] = [];
        await ctx?.scene?.enter("status");
      }
    );
    return statusScene;
  }
}
