import { Mongoose } from 'mongoose';
import { UserSchema } from 'src/schema/user.schema';

export const userProvider = [
  {
    provide: 'USER_MODEL',
    useFactory: (mongoose: Mongoose) => mongoose.model('User', UserSchema),
    inject: ['DATABASE_CONNECTION'],
  },
];