import { Prop, Schema, SchemaFactory, raw } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';
import {  NodeMadara } from './node.schema';
export type UserDocument = HydratedDocument<User>;

@Schema()
export class User {

  @Prop()
  userId:string;

  @Prop()
  name: string;

  @Prop()
  chatId:string;


  @Prop()
  tokenSpheron?:string;

  @Prop()
  tokenSpheronExpired?:string;


  @Prop()
  ivTokenSpheron?:string;

  @Prop({ type: [{type:mongoose.Schema.Types.ObjectId, ref: 'Node'}] })
  nodes: NodeMadara[]



  @Prop()
  mainWallet?:string;
  
  @Prop()
  selectedWallet?:string;

  @Prop() 
  password?:string

  @Prop()
  ownReferralLink:string 

  @Prop()
  referralLinkUsed?:string
  

  @Prop()
  oldReferralLinks?:string[]

  @Prop()
  invitedUserCount?:number

  
  @Prop()
  txCount?:number

  @Prop()
  totalBalance?:number
  
}



export const UserSchema = SchemaFactory.createForClass(User);
export const UserModel = mongoose.model('User', UserSchema);