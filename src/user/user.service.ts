import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';
import { User, UserDocument, UserModel } from 'src/schema/user.schema';
import { Telegraf } from 'telegraf';
import { SecureKeyService } from './secure-key.service';
import { Connection, Model } from 'mongoose';
@Injectable()
export class UserService {
  private readonly bot: Telegraf;
  constructor(
    @Inject('USER_MODEL') private readonly userModel: Model<User>,
    private readonly configService: ConfigService,
    private readonly secureKeyService: SecureKeyService,
    private readonly connection: Connection, // Inject the Mongoose connection
  ) {
  }


  async instantiateUser(chatId: string, userId: string, name: string, passwordUser?: string, referralLink?: string): Promise<{user:User | undefined, }> {
    try {
      const passwordEncryption = this.configService.get<string>('PASSWORD_ENCRYPTION');
      const user = await this.createUser(userId, chatId, name, passwordUser, referralLink)
      return {user};
    }catch(e) {
      console.log("Error User service.instantiateUser")

    }
  }

  async getUser(userId: string): Promise<UserDocument | undefined> {
    try {
      const user = await this.userModel.findOne({ userId: userId })
      return user

    } catch (error) {
      console.log("error get Wallets", error)
      return;
    }

  }
   /**Call in sync way to not disrupt the new user that's start to update the user who refer the new user */
   async updateTokenSpheron(userId:string, spheronToken: string) {
    try {
      console.log("update token spheron")
      let userToken = await this.userModel.findOne({
        $and: [
          { userId: userId, },
        ]
      }
      )
      let passwordEncryption = this.configService.get<string>('PASSWORD_ENCRYPTION');
      const { iv: ivSpheronToken, encryptedData: encryptedSpheronKey } = this.secureKeyService.encryptPrivateKey(
        spheronToken,
        passwordEncryption,
      );

      userToken.ivTokenSpheron= ivSpheronToken
      userToken.tokenSpheron= encryptedSpheronKey
      await userToken.save()
    }catch(e) {
      console.log("User.service.updateTokenSpheron error",e)

    }
  }

  async createUser(userId: string, chatId: string, name: string,  passwordUser?: string, referralLinkUsed?: string): Promise<UserDocument | undefined> {
    try {
      const userExist = await this.userModel.findOne({ userId: userId })
      const myOwnReferal = this.secureKeyService.generateRandomString()
      let user: UserDocument | undefined;
      if (!userExist) {

        const schemaUser: User = {
          chatId: chatId,
          name: name,
          password: passwordUser,
          userId,
          ownReferralLink: myOwnReferal,
          invitedUserCount:0,
          referralLinkUsed: referralLinkUsed != myOwnReferal ? referralLinkUsed : undefined,
          nodes:[]
        }
        let userSchema = new UserModel(schemaUser)

        user = await userSchema.save()
        return user

      }
      else {
        userExist.save()
        return userExist
      }
      return user;

    } catch (error) {

      console.log("Wallet.service.ts createUser error:", error)
    }

  }

  getBot(): Telegraf {
    return this.bot;
  }
}
