import mongoose, { Schema } from 'mongoose';

export const keySchema = new Schema({
  _id: String,
  createdAt: {
    default: Date.now,
    type: Date,
  },
  updatedAt: Date,
  bin: {
    required: true,
    type: Buffer,
  },
});

keySchema.post('findOneAndUpdate', async function() {
  const model = await this.model.findOne(this.getQuery());
  return model.update({ updatedAt: new Date(), $inc: { __v: 1 } });
});

export const KeyModel = mongoose.model('Key', keySchema);

export default KeyModel;
