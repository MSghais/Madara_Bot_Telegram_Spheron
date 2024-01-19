// src/telegram-bot/telegram-bot.service.ts
import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { User, UserDocument, UserModel } from "src/schema/user.schema";
import { Telegraf } from "telegraf";
import { SecureKeyService } from "./secure-key.service";
import { Connection, Model } from "mongoose";
import { ComputeTypeEnum, ErrorMessage, MADARA_CONFIG_DEPLOYMENT } from "src/config/constant";
import SpheronClient, {
  Cluster,
  Instance,
  InstanceDeployment,
  InstanceDetailed,
  InstanceLogType,
  InstanceResponse,
  InstancesInfo,
} from "@spheron/compute";

@Injectable()
export class SpheronService {
  private readonly bot: Telegraf;
  constructor(
    @Inject("USER_MODEL") private readonly userModel: Model<User>,
    private readonly configService: ConfigService,
    private readonly secureKeyService: SecureKeyService,
    private readonly connection: Connection // Inject the Mongoose connection
  ) {}

 
  async getToken(userId: string): Promise<string> {
    let userToken = await this.userModel.findOne({
      $and: [{ userId: userId }],
    });
    let passwordEncryption = this.configService.get<string>(
      "PASSWORD_ENCRYPTION"
    );
    const decryptedSpheronKey = this.secureKeyService.decryptPrivateKey(
      userToken?.tokenSpheron,
      userToken?.ivTokenSpheron,
      passwordEncryption
    );

    return decryptedSpheronKey;
  }

  /**Call in sync way to not disrupt the new user that's start to update the user who refer the new user */
  async updateTokenSpheron(chatId: string, spheronToken: string) {
    try {
      let userToken = await this.userModel.findOne({
        $and: [{ chatId: chatId }],
      });
      let passwordEncryption = this.configService.get<string>(
        "PASSWORD_ENCRYPTION"
      );
      const { iv: ivSpheronToken, encryptedData: encryptedSpheronKey } =
        this.secureKeyService.encryptPrivateKey(
          spheronToken,
          passwordEncryption
        );

      userToken.ivTokenSpheron = ivSpheronToken;
      userToken.tokenSpheron = encryptedSpheronKey;
      await userToken.save();
    } catch (e) {}
  }

  /** @TODO add different type of deployment (Full node, Light node) and harwares config */
  async createComputeInstance(
    userId: string,
    region: string,
    clusterName?: string,
    token?: string
  )
  :Promise<{
    instanceResponse?:InstanceResponse
    message?:string,
    success?:boolean
  }> {
    try {
      let tokenSpheron = token;

      if (!tokenSpheron) {
        tokenSpheron = await this.getToken(userId);
      }
      const spheron = new SpheronClient({ token: tokenSpheron });
      const instanceResponse: InstanceResponse = await spheron.instance.create({
        clusterName: clusterName ?? "Madara container",
        configuration: {
          // image: "ghcr.io/keep-starknet-strange/madara",
          // tag: "v0.1.0-beta",
          image:MADARA_CONFIG_DEPLOYMENT?.URL,
          tag:MADARA_CONFIG_DEPLOYMENT?.TAG,
          commands: [
          ],
          ports: [
            // Madara service
            // rpc
            { containerPort: 9944, exposedPort: 9944 },
            // promotheus
            { containerPort: 9615, exposedPort: 9615 },
            // p2p
            { containerPort: 30333, exposedPort: 30333 },
            // Madara App
            { containerPort: 8080, exposedPort: 80 },
                   // // Madara explorer
            // { containerPort: 4000, exposedPort: 4000 },
            // // Explorer DB
            // { containerPort: 5432, exposedPort: 5432 },
            // // checkpoint DB  my sql
            // { containerPort: 3306, exposedPort: 3306 },
            // // checkpoint template
            // { containerPort: 3009, exposedPort: 3000 },

            // // starkcet front
            // { containerPort: 3001, exposedPort: 3000 },

            // // starkcet front
            // { containerPort: 3001, exposedPort: 3000 },
            // // starksheet webapp
            // { containerPort: 3003, exposedPort: 3003 },

            // // Kakarot rpc
            // { containerPort: 3030, exposedPort: 3030 },

            // // Kakarot front
            // { containerPort: 3005, exposedPort: 3000 },

            // // Kakarot web app
            // { containerPort: 3004, exposedPort: 3004 },
            // // Starknen database
            // { containerPort: 3004, exposedPort: 3004 },
            // // Starken API
            // { containerPort: 5055, exposedPort: 5055 },
            // // Starken frontend
            // { containerPort: 3002, exposedPort: 3000 },
            // // Apibara
            // { containerPort: 7171, exposedPort: 7171 },
           
          ],
          environmentVariables: [],
          secretEnvironmentVariables: [],
       
          args: [
            "--dev",
            "--rpc-cors=all"
            
          ],
          region: region ?? "any",
          replicas: 1,
          // MIN HARDWARE
          storage:MADARA_CONFIG_DEPLOYMENT?.config?.MIN_CONFIG?.storage,
          customSpecs:MADARA_CONFIG_DEPLOYMENT?.config?.MIN_CONFIG?.customSpecs
       
        },
        type: ComputeTypeEnum.DEMAND,
      });
      return {
        instanceResponse,
        success:true,
        message:"Instance initalize"
      };
    } catch (e) {

      if (
        (e && e?.message && e?.message?.includes("Api Key has expired")) ||
        e == "Api Key has expired"
      ) {
        console.log("Api Key has expired");
        return {
          instanceResponse:undefined,
          message: ErrorMessage.API_KEY_EXPIRED,
          success: false,
        };
      }
  
      else if (
        (e && e?.message && e?.message?.includes("Cast to ObjectId failed for value")) ||
        e == "Cast to ObjectId failed for value"
      ) {
        console.log("Cast to ObjectId failed for value");
        return {
          instanceResponse:undefined,
          message: ErrorMessage.SPHERON_CAST_ID_ERROR,
          success: false,
        };
      }
  
      else if (
        (e && e?.message && e?.message?.includes("Unauthorized")) ||
        e == "Unauthorized"
      ) {
        console.log("Unauthorized");
        return {
          instanceResponse:undefined,
          message: ErrorMessage.UNAUTHORIZED_SPHERON,
          success: false,
        };
      }
  
  
      return {
        instanceResponse: undefined,
        message: ErrorMessage.SPHERON_ISSUE,
        success: false,
      };
  
    }
  }

  async closeComputeInstance(
    userId: string,
    instanceId: string,
    clusterName?: string,
    token?: string
  ):Promise<{message?:string, success?:boolean}> {
    try {
      let tokenSpheron = token;

      if (!tokenSpheron) {
        tokenSpheron = await this.getToken(userId);
      }
      const spheron = new SpheronClient({ token: tokenSpheron });
      const closed = await spheron.instance.close(instanceId);
      return closed;
    } catch (e) {
      console.log("Spheron.service.ts closeComputeInstance error:", e);
      if (
        (e && e?.message && e?.message?.includes("Api Key has expired")) ||
        e == "Api Key has expired"
      ) {
        console.log("Api Key has expired");
        return {
          message: ErrorMessage.API_KEY_EXPIRED,
          success: false,
        };
      }
      
      else if (
        (e && e?.message && e?.message?.includes("Cast to ObjectId failed for value")) ||
        e == "Cast to ObjectId failed for value"
      ) {
        console.log("Cast to ObjectId failed for value");
        return {
          message: ErrorMessage.SPHERON_CAST_ID_ERROR,
          success: false,
        };
      } else if(
        (e && e?.message && e?.message?.includes("Instance already closed")) ||
        e == "Instance already close"

      ) {
        return {
          message: ErrorMessage.SPHERON_INSTANCE_ALREADY_CLOSE,
          success: false,
        };
        
      }
      return {
        message: ErrorMessage.SPHERON_ISSUE,
        success: false,
      };
    }
  }

  async deleteComputeInstance(
    userId: string,
    instanceId: string,
    clusterName?: string,
    token?: string
  ) {
    try {
      let tokenSpheron = token;

      if (!tokenSpheron) {
        tokenSpheron = await this.getToken(userId);
      }
      const spheron = new SpheronClient({ token: tokenSpheron });
      const closed = await spheron.instance.delete(instanceId);
      return true;
    } catch (error) {
      console.log("Spheron.service.ts closeComputeInstance error:", error);
      return false;
    }
  }

  async getInstanceInfo(userId: string, clusterId: string, token?: string):Promise<InstancesInfo|undefined> {
    try {
      let tokenSpheron = token;

      if (!tokenSpheron) {
        tokenSpheron = await this.getToken(userId);
      }
      const userExist = await this.userModel.findOne({ userId: userId });
      let user: UserDocument | undefined;
      const spheron = new SpheronClient({ token: tokenSpheron });
      const instanceInfo: InstancesInfo =
        await spheron.cluster.getInstancesInfo(clusterId);
      return instanceInfo;
    } catch (e) {
      console.log("getInstanceInfo error", e);
      if (
        (e && e?.message && e?.message?.includes("Api Key has expired")) ||
        e == "Api Key has expired"
      ) {
        console.log("Api Key has expired");
        return undefined
      }
  
      else if (
        (e && e?.message && e?.message?.includes("Cast to ObjectId failed for value")) ||
        e == "Cast to ObjectId failed for value"
      ) {
        console.log("Cast to ObjectId failed for value");
        return undefined
      }
  
      else if (
        (e && e?.message && e?.message?.includes("Unauthorized")) ||
        e == "Unauthorized"
      ) {
        console.log("Unauthorized");
        return undefined
      }
  
  
      return undefined
    }
  }

  async getInstanceLogs(userId: string, instanceId: string, logType?:InstanceLogType, token?: string) {
    try {
      let tokenSpheron = token;

      if (!tokenSpheron) {
        tokenSpheron = await this.getToken(userId);
      }
      const userExist = await this.userModel.findOne({ userId: userId });
      let user: UserDocument | undefined;
      const spheron = new SpheronClient({ token: tokenSpheron });
      const instanceLogs: Array<string> =
        await spheron.instance.getInstanceLogs(instanceId, {
          from: 0,
          to: 1000,
          logType: logType ?? InstanceLogType.INSTANCE_LOGS,
        });

      return instanceLogs;
    } catch (e) {
      console.log("instanceLogs error", e);
      if (
        (e && e?.message && e?.message?.includes("Api Key has expired")) ||
        e == "Api Key has expired"
      ) {
        console.log("Api Key has expired");
        return undefined
      }
  
      else if (
        (e && e?.message && e?.message?.includes("Cast to ObjectId failed for value")) ||
        e == "Cast to ObjectId failed for value"
      ) {
        console.log("Cast to ObjectId failed for value");
        return undefined
      }
  
      else if (
        (e && e?.message && e?.message?.includes("Unauthorized")) ||
        e == "Unauthorized"
      ) {
        console.log("Unauthorized");
        return undefined
      }
    }
  }


  
  async getInstance(
    userId: string,
    instanceId: string,
    token?: string
  ):Promise<{
    instance?:Instance,
    message?:string,
    success?:boolean
  }>{
    try {
      let tokenSpheron = token;

      if (!tokenSpheron) {
        tokenSpheron = await this.getToken(userId);
      }
      const userExist = await this.userModel.findOne({ userId: userId });
      let user: UserDocument | undefined;
      const spheron = new SpheronClient({ token: tokenSpheron });

      const instance = await spheron.instance.get(instanceId);
      return {instance, success:true, message:"Instance received"};
      
    } catch (e) {
      console.log("get instances error", e);
      
      if (
        (e && e?.message && e?.message?.includes("Api Key has expired")) ||
        e == "Api Key has expired"
      ) {
        console.log("Api Key has expired");
        return {
          instance: undefined,
          message: ErrorMessage.API_KEY_EXPIRED,
          success: false,
        };
      }
      
      else if (
        (e && e?.message && e?.message?.includes("Cast to ObjectId failed for value")) ||
        e == "Cast to ObjectId failed for value"
      ) {
        console.log("Cast to ObjectId failed for value");
        return {
          instance: undefined,
          message: ErrorMessage.SPHERON_CAST_ID_ERROR,
          success: false,
        };
      }
      return {
        instance: undefined,
        message: ErrorMessage.SPHERON_ISSUE,
        success: false,
      };
    }
  }

  async getStatusByInstance(
    userId: string,
    instanceId: string,
    token?: string
  ):Promise<{
    instanceInfo?:InstancesInfo,
    message?:string,
    success?:boolean
  }>{
    try {
      let tokenSpheron = token;

      if (!tokenSpheron) {
        tokenSpheron = await this.getToken(userId);
      }
      const userExist = await this.userModel.findOne({ userId: userId });
      let user: UserDocument | undefined;
      const spheron = new SpheronClient({ token: tokenSpheron });

      const instanceInfo = await spheron.cluster.getInstancesInfo(instanceId);
      return {instanceInfo, success:true, message:"Instance received"};
      
    } catch (e) {
      console.log("get instances error", e);
      
      if (
        (e && e?.message && e?.message?.includes("Api Key has expired")) ||
        e == "Api Key has expired"
      ) {
        console.log("Api Key has expired");
        return {
          instanceInfo: undefined,
          message: ErrorMessage.API_KEY_EXPIRED,
          success: false,
        };
      }
      
      else if (
        (e && e?.message && e?.message?.includes("Cast to ObjectId failed for value")) ||
        e == "Cast to ObjectId failed for value"
      ) {
        console.log("Cast to ObjectId failed for value");
        return {
          instanceInfo: undefined,
          message: ErrorMessage.SPHERON_CAST_ID_ERROR,
          success: false,
        };
      }
      return {
        instanceInfo: undefined,
        message: ErrorMessage.SPHERON_ISSUE,
        success: false,
      };
    }
  }

  async getInfoByInstance(
    userId: string,
    instanceId: string,
    token?: string
  ):Promise<{
    instanceDeployment?:InstanceDeployment,
    message?:string,
    success?:boolean
  }>{
    try {
      let tokenSpheron = token;

      if (!tokenSpheron) {
        tokenSpheron = await this.getToken(userId);
      }
      const userExist = await this.userModel.findOne({ userId: userId });
      let user: UserDocument | undefined;
      const spheron = new SpheronClient({ token: tokenSpheron });

      const instanceDeployment= await spheron.instance.getInstanceDeployment(instanceId);
      return {instanceDeployment, success:true, message:"Instance received"};
      
    } catch (e) {
      console.log("get instances error", e);
      
      if (
        (e && e?.message && e?.message?.includes("Api Key has expired")) ||
        e == "Api Key has expired"
      ) {
        console.log("Api Key has expired");
        return {
          instanceDeployment: undefined,
          message: ErrorMessage.API_KEY_EXPIRED,
          success: false,
        };
      }
      
      else if (
        (e && e?.message && e?.message?.includes("Cast to ObjectId failed for value")) ||
        e == "Cast to ObjectId failed for value"
      ) {
        console.log("Cast to ObjectId failed for value");
        return {
          instanceDeployment: undefined,
          message: ErrorMessage.SPHERON_CAST_ID_ERROR,
          success: false,
        };
      }
      return {
        instanceDeployment: undefined,
        message: ErrorMessage.SPHERON_ISSUE,
        success: false,
      };
    }
  }

  async getInstancesByCluster(
    userId: string,
    clusterId: string,
    token?: string
  ):Promise<{
    instances:InstanceDetailed[],
    message?:string,
    success?:boolean
  }>{
    try {
      let tokenSpheron = token;

      if (!tokenSpheron) {
        tokenSpheron = await this.getToken(userId);
      }
      const userExist = await this.userModel.findOne({ userId: userId });
      let user: UserDocument | undefined;
      const spheron = new SpheronClient({ token: tokenSpheron });

      const instances = await spheron.cluster.getInstances(clusterId, {
        skip: 0,
        limit: 10,
      });
      return {instances, success:true, message:"Instance received"};
      
    } catch (e) {
      console.log("get instances error", e);
      
      if (
        (e && e?.message && e?.message?.includes("Api Key has expired")) ||
        e == "Api Key has expired"
      ) {
        console.log("Api Key has expired");
        return {
          instances: [],
          message: ErrorMessage.API_KEY_EXPIRED,
          success: false,
        };
      }
      
      else if (
        (e && e?.message && e?.message?.includes("Cast to ObjectId failed for value")) ||
        e == "Cast to ObjectId failed for value"
      ) {
        console.log("Cast to ObjectId failed for value");
        return {
          instances:[],
          message: ErrorMessage.SPHERON_CAST_ID_ERROR,
          success: false,
        };
      }
      return {
        instances: [],
        message: ErrorMessage.SPHERON_ISSUE,
        success: false,
      };
    }
  }

  async getClustersByOrganization(
    userId: string,
    token?: string
  ): Promise<{ clusters: Cluster[]; message?: string; success?: boolean }> {
    try {
      let tokenSpheron = token;
      if (!tokenSpheron) {
        tokenSpheron = await this.getToken(userId);
      }
      const spheron = new SpheronClient({ token: tokenSpheron });

      const clusters: Cluster[] = await spheron.organization.getClusters({
        skip: 0,
        limit: 10,
      });
      return {
        clusters,
        message: "Clusters received",
        success: true,
      };
    } catch (e) {
      console.log("get clusters error", e);
      console.log("type e", typeof e);

      if (
        (e && e?.message && e?.message?.includes("Api Key has expired")) ||
        e == "Api Key has expired"
      ) {
        console.log("Api Key has expired");
        return {
          clusters: [],
          message: ErrorMessage.API_KEY_EXPIRED,
          success: false,
        };
      }
      return {
        clusters: [],
        message: ErrorMessage.SPHERON_ISSUE,
        success: false,
      };
    }
  }

  async getInstanceDeployment(
    userId: string,
    instanceDeploymentId: string,
    token?: string
  ) {
    try {
      let tokenSpheron = token;
      if (!tokenSpheron) {
        tokenSpheron = await this.getToken(userId);
      }
      const spheron = new SpheronClient({ token: tokenSpheron });
      const deployment: InstanceDeployment =
        await spheron.instance.getInstanceDeployment(instanceDeploymentId);
      return deployment;
    } catch (e) {
      console.log("get deployment error", e);
      if (
        (e && e?.message && e?.message?.includes("Api Key has expired")) ||
        e == "Api Key has expired"
      ) {
        console.log("Api Key has expired");
        return undefined
      }
  
      else if (
        (e && e?.message && e?.message?.includes("Cast to ObjectId failed for value")) ||
        e == "Cast to ObjectId failed for value"
      ) {
        console.log("Cast to ObjectId failed for value");
        return undefined
      }
  
      else if (
        (e && e?.message && e?.message?.includes("Unauthorized")) ||
        e == "Unauthorized"
      ) {
        console.log("Unauthorized");
        return undefined
      }
    }
  }


  async getClusters(userId: string, region: string, token?: string) {
    try {
      let tokenSpheron = token;
      if (!tokenSpheron) {
        tokenSpheron = await this.getToken(userId);
      }
      const spheron = new SpheronClient({ token: tokenSpheron });
      const clusters: Cluster[] = await spheron.organization.getClusters({
        skip: 0,
        limit: 10,
      });
      return clusters;
    } catch (e) {
      console.log("Spheron.service.ts getClusters error:", e);
      if (
        (e && e?.message && e?.message?.includes("Api Key has expired")) ||
        e == "Api Key has expired"
      ) {
        console.log("Api Key has expired");
        return undefined
      }
  
      else if (
        (e && e?.message && e?.message?.includes("Cast to ObjectId failed for value")) ||
        e == "Cast to ObjectId failed for value"
      ) {
        console.log("Cast to ObjectId failed for value");
        return undefined
      }
  
      else if (
        (e && e?.message && e?.message?.includes("Unauthorized")) ||
        e == "Unauthorized"
      ) {
        console.log("Unauthorized");
        return undefined
      }
    }
  }

}
