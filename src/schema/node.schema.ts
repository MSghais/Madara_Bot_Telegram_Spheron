import { Prop, Schema, SchemaFactory, raw } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';
export type NodeDocument = HydratedDocument<Node>;

@Schema()
export class NodeMadara {

  @Prop()
  userId:string;

  @Prop()
  name: string;

  @Prop()
  chatId:string;

  @Prop()
  instanceId:string;

  @Prop()
  createdAt?:string;
  
  @Prop()
  updateddAt?:string;


  @Prop()
  tokenSpheron?:string;

  @Prop()
  tokenSpheronExpired?:string;

  
}




export const NodeSchema = SchemaFactory.createForClass(NodeMadara);
export const NodeModel = mongoose.model('Node', NodeSchema);