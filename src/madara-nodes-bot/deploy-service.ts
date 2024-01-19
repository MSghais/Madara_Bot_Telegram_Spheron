// src/menus/menu.service.ts
import { Injectable } from "@nestjs/common";
import { DeploymentStatusEnum, InstanceStateEnum } from "@spheron/compute";
import { UserDocument } from "src/schema/user.schema";
import { MarkupButton, SharedConfig } from "src/shared/shared-config";
import {
  MyContext,
  TelegramBotService,
} from "src/telegram/telegram.bot.service";
import { SpheronService } from "src/user/spheron.service";
import { Telegraf, Context, Markup, Scenes, Composer } from "telegraf";
import { Message } from "telegraf/typings/core/types/typegram";
import { BaseScene, SceneContextScene } from "telegraf/typings/scenes";
const publicKeyRegex = /^0x[0-9a-fA-F]{130}$/;
enum EnumState {
  ENTER = "ENTER",
  WAITING = "WAITING",
  DEPLOYMENT = "DEPLOYMENT",
  WAIT_DEPLOYMENT = "WAIT_DEPLOYMENT",
}
@Injectable()
export class DeployService {
  private readonly bot: Telegraf<MyContext>;
  private emojiValidate: string = "✓";
  private user: UserDocument;
  private stage: Scenes.Stage<any>;
  private idsToDeleteMessagesWallet: Map<number, number[]> = new Map();
  private msgIdLoadingByUser: Map<number, number[]> = new Map();
  private isFirstMessageScene: Map<number, boolean> = new Map();

  private formDeployMessageIdByUser: Map<number, number | undefined> =
    new Map();
  private amountToSendByUser: Map<string, string> = new Map();
  private regionSelectedByUser: Map<string, string> = new Map();

  private stateEnumByUser: Map<number, EnumState | string> = new Map();
  private addressTokenToBuyByUser: Map<string, string | undefined> = new Map();
  private formNeedUpdateByUser: Map<number, boolean> = new Map();
  /** SELECTABLE INPUT FOR USER */

  private regionsDeployments = ["us-east", "eu-east"];

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

  async selactableDeploymentRegion(
    ctx: Context,
    deployScene?: Scenes.BaseScene<any>
  ): Promise<MarkupButton[]> {
    const userId = ctx.from.id;
    const buttons: MarkupButton[] = [];
    let i: number = 0;
    for (let region of this.regionsDeployments) {
      if (this.amountToSendByUser[userId] == region) {
        const buttonAmount = Markup.button.callback(
          `${region} ${this.emojiValidate}`,
          region
        );
        buttons.push(buttonAmount);
      } else {
        const buttonAmount = Markup.button.callback(region, region);
        buttons.push(buttonAmount);
      }

      deployScene.action(region, async (ctx) => {
        const userId = ctx.from.id;
        this.regionSelectedByUser[userId] = region;
        this.formNeedUpdateByUser[userId] = true;
        if (this.formNeedUpdateByUser[userId]) {
          await this.sendDeployNodeForm(ctx, deployScene);
          await this.runVerifyPayment(ctx, userId?.toString(), deployScene);
        }
        this.formNeedUpdateByUser[userId] = false;
      });
      i++;
    }

    return buttons;
  }

  async runVerifyPayment(
    ctx: Context,
    userId: string,
    deployScene?: Scenes.BaseScene<any>
  ) {
    const formMessage = await ctx.reply(`
    The recommended plan for Madara Full Node is Ventus Large with: 
    - 2 CPU 
    - 4Gi RAM 
    - 8Gi Ephemeral Storage

    `);
    const yesBtn = Markup.button.callback("Yes", "YES_DEPLOY");
    const noBtn = Markup.button.callback("No", "NO_DEPLOY");
    const mark = Markup.inlineKeyboard([yesBtn, noBtn]);

    // const approvePaymentComput = await ctx.reply(
    //   `Your plan will cost 15$ to $30.39 monthly or more. Are you sure you want to proceed with the deployment?`,
    //   mark
    // );
    const approvePaymentComput = await ctx.reply(
      `Your plan will cost 19$ monthly or more. Are you sure you want to proceed with the deployment?`,
      mark
    );
  }

  async sendDeployNodeForm(ctx: Context, deployScene: Scenes.BaseScene<any>) {
    try {
      const userId = ctx.from.id;
      const chatId = ctx.chat.id;
      let markup;

      const buttons = await this.selactableDeploymentRegion(ctx, deployScene);
      markup = Markup.inlineKeyboard([
        buttons,
        [this.sharedConfig?.renderMenuButton()],
      ]);
      if (
        this.formDeployMessageIdByUser[userId] &&
        this.formNeedUpdateByUser[userId]
      ) {
        let text = `
        Welcome to ${this.sharedConfig.getProjectTitle()} \n 
        Deploy  a Madara Node \n
        Choose a region you want to deploy it \n
        Selected region: ${this.regionSelectedByUser[userId]}
        `;
        const formMessage = await ctx.telegram.editMessageText(
          chatId,
          this.formDeployMessageIdByUser[userId],
          undefined,
          text,
          markup
        );
      } else {
        const formMessage = await ctx.reply(
          `
        Welcome to ${this.sharedConfig.getProjectTitle()} \n 
        Deploy  a Madara Node \n
        Choose a region you want to deploy it \n
        Selected region: ${this.regionSelectedByUser[userId]}

   `,
          markup
        );
        this.formDeployMessageIdByUser[userId] = formMessage.message_id;
      }
    } catch (error) {
      console.log("sendDeployNodeForm: error", error);
    }
  }

  createScene() {
    const deployScene = new Scenes.BaseScene<any>("deploy");
    this.stage = new Scenes.Stage([]);
    deployScene.enter(async (ctx: Context, next) => {
      try {
        const userId = ctx.from.id;
        const chatId = ctx.chat.id;
        this.regionSelectedByUser[userId] = "any";
        this.msgIdLoadingByUser[userId] = [];
        this.isFirstMessageScene[userId] = true;
        await this.sendDeployNodeForm(ctx, deployScene);
        this.isFirstMessageScene[userId] = false;
      } catch (e) {
        console.log("Deploy scene enter error", e);
      }
    });

    deployScene.action("YES_DEPLOY", async (ctx) => {
      try {
        console.log("YES_DEPLOY");
        const userId = ctx.from.id;
        this.stateEnumByUser[userId] = "YES_DEPLOY";
        await ctx.reply(`Instance loading start, please wait.`);
        const { instanceResponse, success, message } =
          await this.spheronService.createComputeInstance(
            userId.toString(),
            this.regionSelectedByUser[userId],
            ""
          );
        if (!success) {
          if (!message) {
            return await ctx.reply(
              `Error when try to deploy instance\n Please retry, verify/add your token  or contact the support`
            );
          } else {
            return await ctx.reply(
              `Error when try to deploy instance : ${message}\n Please retry, verify/add your token or contact the support`
            );
          }
        }

        if (!instanceResponse) {
          await ctx.reply(`Issue when trying to deploy your Madara instance: \n
    `);
        } else if (instanceResponse) {
          await ctx.reply(`Your instance is initialize: \n
          Waiting instance container.\n
          Cluster id: ${instanceResponse?.clusterId}\n
          Instance deployment id: ${instanceResponse?.instanceDeploymentId}\n
          Instance id: ${instanceResponse?.instanceId}\n

          Go on the status menu to get your connections urls in few minutes.
          
          `);
          const clusterId = instanceResponse.clusterId;
          const instanceDeploymentId = instanceResponse.instanceDeploymentId;
          // const instanceInfo = await this.spheronService.getInstanceInfo(
          //   userId.toString(),
          //   clusterId
          // );
          const instanceDeployment =
            await this.spheronService.getInstanceDeployment(
              userId.toString(),
              instanceDeploymentId
            );
          console.log("instance deployment", instanceDeployment);
          let deployed = false;
          if (
            instanceDeployment &&
            (instanceDeployment?.status == DeploymentStatusEnum.PENDING ||
              instanceDeployment?.status == DeploymentStatusEnum?.QUEUED)
          ) {
            const copyId = `<pre><code><a href="copy:${instanceResponse?.instanceId}">${instanceResponse?.instanceId}</a></code></pre>\n`;
            await ctx.reply(
              `Pending deployment id of ${instanceDeployment.instance} \n You can check your status and connections url in the Status menu with your Instance id: ${copyId}
            `,
              {
                parse_mode: "HTML",
              }
            );
            await ctx.reply(
              `Deployment in progress. Please wait to get your connections urls or go on Status menu.`
            );

            const getDeploymentIsFinish = async (
              userId: string,
              instanceDeploymentId: string
            ) => {
              console.log("try get deployment");
              const instanceInProgress = await this.spheronService.getInstance(
                userId.toString(),
                instanceDeploymentId
              );
              console.log("instanceInProgress", instanceInProgress);
              const instanceDeployment =
                await this.spheronService.getInstanceDeployment(
                  userId.toString(),
                  instanceDeploymentId
                );
              console.log("instanceDeployment", instanceDeployment);
              if (
                instanceDeployment &&
                (instanceDeployment?.status == DeploymentStatusEnum.QUEUED ||
                  instanceDeployment?.status == DeploymentStatusEnum.PENDING)
              ) {
                await ctx.reply(`Please wait or come later on Status menu.`);
                return false;
              } else {
                deployed = true;

                const instanceDeployed =
                  await this.spheronService.getInstanceDeployment(
                    userId.toString(),
                    instanceDeploymentId
                  );

                let textConnectionUrls = ``;
                instanceDeployed?.connectionUrls?.map((c) => {
                  textConnectionUrls += `${c}\n`;
                });
                let textInstanceLogs = ``;
                const instanceLogs = await this.spheronService.getInstanceLogs(
                  userId?.toString(),
                  instanceInProgress?.instance?.activeDeployment
                );
                console.log("instance logs", instanceLogs);
                instanceLogs?.map((l) => {
                  textInstanceLogs += `${l}\n`;
                });

                textInstanceLogs = textInstanceLogs.substring(
                  textInstanceLogs?.length - 500,
                  textInstanceLogs?.length
                );

                await ctx.reply(`Instance deployed. Id: ${instanceDeployment.instance}: \n Connection urls: ${textConnectionUrls}\n Logs: ${textInstanceLogs}
                  `);

                return true;
              }
            };

            /** @TODO check deployed and get connections urls*/
            await getDeploymentIsFinish(
              userId.toString(),
              instanceDeploymentId
            );
            while (!deployed) {
              console.log("On looping process to check if it's deployed");
              // Timeout function
              const timeout = (ms) =>
                new Promise((resolve) => setTimeout(resolve, ms));
              await timeout(1000 * 15);
              const isFinish = await getDeploymentIsFinish(
                userId.toString(),
                instanceDeploymentId
              );
              if (isFinish) {
                deployed = true;
                return;
              }
            }
          }
        }
      } catch (e) {
        console.log("Deployment instance error", e);
      }
    });

    deployScene.action("NO_DEPLOY", async (ctx) => {
      const userId = ctx.from.id;
      this.stateEnumByUser[userId] = "NO_DEPLOY";
      this.sharedConfig.renderMainMenu(ctx);
    });

    const stage = new Scenes.Stage<Scenes.SceneContext>([deployScene], {
      ttl: 10,
    });
    this.bot.use(this.stage.register(deployScene).middleware());
    this.bot.command(
      "deploy",
      async (ctx: Context & { scene: SceneContextScene<any> }) => {
        console.log("run deploy scene");
        const userId = ctx.from.id;
        this.msgIdLoadingByUser[userId] = [];
        this.isFirstMessageScene[userId] = true;
        this.idsToDeleteMessagesWallet[userId] = [];
        await ctx?.scene?.enter("deploy");
      }
    );
    this.bot.action(
      "Deploy",
      async (ctx: Context & { scene: SceneContextScene<any> }) => {
        const userId = ctx.from.id;
        this.msgIdLoadingByUser[userId] = [];
        this.isFirstMessageScene[userId] = true;
        this.idsToDeleteMessagesWallet[userId] = [];
        await ctx?.scene?.enter("deploy");
      }
    );
    return deployScene;
  }
}
