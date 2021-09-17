import mongoose, { Schema } from 'mongoose';

export const NAME = 'Key';

export type KeySchema = {
  _id?: string;
  created_at?: Date;
  updated_at?: Date;
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
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

keySchema.post('findOneAndUpdate', async function () {
  await this.update({ $inc: { __v: 1 } });
});

export const KeyModel =
  mongoose.models[NAME] || mongoose.model<KeySchema>(NAME, keySchema);

export default KeyModel;
