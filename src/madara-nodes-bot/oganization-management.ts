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
export class ManagementNode {
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
  async sendCloseInstanceForm(
    ctx: Context,
    managementScene: Scenes.BaseScene<any>
  ) {
    try {
      const userId = ctx.from.id;
      const chatId = ctx.chat.id;
      let buttonsChain = [];
      let markup;
      const closeSpheronButton = Markup.button.callback(
        "Close Instance Spheron",
        EnumState.CLOSE_INSTANCE
      );
      const deleteSpheronButton = Markup.button.callback(
        "Delete Instance Spheron",
        EnumState.DELETE_INSTANCE
      );
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
      const allButtonsActions = [closeSpheronButton, deleteSpheronButton];

      const allButtonsGet = [
        getInstanceBtn,
        getClusterBtn,
        getStatusByInstance,
      ];

      markup = Markup.inlineKeyboard([
        allButtonsGet,
        allButtonsActions,
        [menuButton],
      ]);
      if (
        this.formTokenManagementMessageIdByUser[userId] &&
        this.formNeedUpdateByUser[userId]
      ) {
        let text = `
        Welcome to ${this.sharedConfig.getProjectTitle()} \n 
        Spheron management Bot: \n
        You can see your clusters, instances, instance info, close and delete instance
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
        Spheron management Bot: \n
        You can see your clusters, instances, instance info, close and delete instance
       `,
          markup
        );
        this.formTokenManagementMessageIdByUser[userId] =
          formMessage.message_id;
      }
    } catch (error) {
      console.log("sendCloseInstanceForm: error", error);
    }
  }

  closeFormMarkup(
    ctx: Context,
    managementScene: Scenes.BaseScene<any>
  ): MarkupButton {
    const button = Markup.button.callback("Close", "CLOSE");

    managementScene.action(`CLOSE`, async (ctx) => {
      const userId = ctx.from.id;
      if (this.formTokenManagementMessageIdByUser[userId]) {
        await ctx.deleteMessage(
          this.formTokenManagementMessageIdByUser[userId]
        );
        this.formTokenManagementMessageIdByUser[userId] = undefined;
        await managementScene.leave();
      }
    });

    return button;
  }

  async checkIfExitSceneWithMenu(
    msg: string,
    ctx: Context,
    managementScene?: Scenes.BaseScene<any>
  ) {
    if (msg == "/menu") {
      if (managementScene) {
        managementScene.leave();
      }
      this.sharedConfig.renderMainMenu(ctx);
    }
  }

  validateTxMarkup(): MarkupButton {
    const button = Markup.button.callback("Validate TX", "VALIDATE_TX");

    return button;
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
    const managementScene = new Scenes.BaseScene<any>("management");
    this.stage = new Scenes.Stage([]);
    managementScene.enter(async (ctx: Context, next) => {
      try {
        const userId = ctx.from.id;
        const chatId = ctx.chat.id;
        this.msgIdLoadingByUser[userId] = [];
        this.isFirstMessageScene[userId] = true;
        await this.sendCloseInstanceForm(ctx, managementScene);
        this.isFirstMessageScene[userId] = false;
      } catch (e) {
        console.log("Management scene issue to enter", e);
      }
    });

    managementScene.action(EnumState.CLOSE_INSTANCE, async (ctx) => {
      console.log("CLOSE_INSTANCE");
      const userId = ctx.from.id;
      const msg = await ctx.reply(
        `Enter the Spheron instance you want to close`
      );
      this.idsToDeleteMessagesWallet[userId] &&
        this.idsToDeleteMessagesWallet[userId].push(msg.message_id);
      this.stateEnumByUser[userId] = EnumState.CLOSE_INSTANCE;
    });
    managementScene.action(EnumState.DELETE_INSTANCE, async (ctx) => {
      console.log("DELETE_INSTANCE");
      const userId = ctx.from.id;
      const msg = await ctx.reply(
        `Enter the Spheron instance you want to delete`
      );
      this.idsToDeleteMessagesWallet[userId] &&
        this.idsToDeleteMessagesWallet[userId].push(msg.message_id);
      this.stateEnumByUser[userId] = EnumState.DELETE_INSTANCE;
    });
    managementScene.action(
      EnumState.GET_CLUSTERS_BY_ORGANIZATION,
      async (ctx) => {
        try {
          const userId = ctx.from.id;
          this.stateEnumByUser[userId] = EnumState.GET_CLUSTERS_BY_ORGANIZATION;
          if (
            this.stateEnumByUser[userId] ==
            EnumState.GET_CLUSTERS_BY_ORGANIZATION
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
            <pre><a href="copy:${id}">${id}</a></pre>\n`;
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
      }
    );

    managementScene.action(EnumState.GET_INSTANCES, async (ctx) => {
      try {
        const userId = ctx.from.id;
        await ctx.reply(`Write your cluster id to get the instances:`);
        this.stateEnumByUser[userId] = EnumState.GET_INSTANCES;
      } catch (e) {
        console.log("Get instances issue in text", e);
      }
    });

    managementScene.action(EnumState.GET_STATUS_BY_INSTANCE, async (ctx) => {
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

    /** Action based on State and the text received */
    managementScene.on("text", async (ctx) => {
      try {
        const address = ctx.message.text;
        const userId = ctx.from.id;
        const msg = ctx.message.text;
        if (msg == "/menu") {
          // this.sharedConfig.renderMainMenu(ctx)
          this.checkIfExitSceneWithMenu(msg, ctx, managementScene);
        }
        if (this.stateEnumByUser[userId] == EnumState.GET_INSTANCES) {
          console.log("TEXT instance ID token");
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
          console.log("instances", instances);

          const markupButton = [];
          for (let instance of instances) {
            const markup = Markup.button.callback(
              `Instance: ${instance?.id}`,
              `${instance.id}`
            );
            markupButton.push(markup);
          }

          const inboard = Markup.inlineKeyboard(markupButton);
          const instancesIds = instances?.map((c) => c.id);
          const instanceTextIds = instancesIds.map((id) => {
            return `
            <pre><a href="copy:${id}">${id}</a></pre>\n`;
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
          let textGetInstances = `Here is your instance info of ${msg}.\n`;
          let textConnectionUrls = ``;
          instanceDeployment?.connectionUrls?.map((c) => {
            textConnectionUrls += `${c}\n`;
          });
          textGetInstances += `Connection urls:\n ${textConnectionUrls} \n `;
          await ctx.reply(textGetInstances, {
            parse_mode: "HTML",
          });
          this.stateEnumByUser[userId] = EnumState.WAITING;
        } else if (this.stateEnumByUser[userId] == EnumState.CLOSE_INSTANCE) {
          await ctx.reply(`Close compute in process. Please wait`);
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
              `Issue when delete your instance ${msg}. Try to close your instance before delete it, verify your instance ID or contact the support`
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

    const stage = new Scenes.Stage<Scenes.SceneContext>([managementScene], {
      ttl: 10,
    });
    this.bot.use(this.stage.register(managementScene).middleware());
    this.bot.command(
      "management",
      async (ctx: Context & { scene: SceneContextScene<any> }) => {
        console.log("run management scene");
        const userId = ctx.from.id;
        this.msgIdLoadingByUser[userId] = [];
        this.isFirstMessageScene[userId] = true;
        this.idsToDeleteMessagesWallet[userId] = [];
        await ctx?.scene?.enter("management");
      }
    );
    this.bot.action(
      "Management",
      async (ctx: Context & { scene: SceneContextScene<any> }) => {
        const userId = ctx.from.id;
        this.msgIdLoadingByUser[userId] = [];
        this.isFirstMessageScene[userId] = true;
        this.idsToDeleteMessagesWallet[userId] = [];
        await ctx?.scene?.enter("management");
      }
    );
    return managementScene;
  }
}
