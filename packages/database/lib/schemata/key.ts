import mongoose, { Schema } from 'mongoose';

export type KeySchema = {
  _id?: string;
  createdAt?: Date;
  updatedAt?: Date;
  bin: Buffer;
};

export const keySchema = new Schema<KeySchema>(
  {
    _id: String,
    bin: {
      required: true,
      type: Buffer,
    },
  },
  { timestamps: true }
);

keySchema.post('findOneAndUpdate', async function () {
  await this.update({ updatedAt: new Date(), $inc: { __v: 1 } });
});

export const KeyModel = mongoose.model<KeySchema>('Key', keySchema);

export default KeyModel;
