import mongoose from 'mongoose';
import { ACTIVITY_TYPES } from '../../common/constants/index.js';

const { Schema } = mongoose;

const activitySchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ACTIVITY_TYPES },
    description: { type: String, required: true, maxlength: 500 },
    metadata: { type: Schema.Types.Mixed },
    entityType: { type: String },
    entityId: { type: Schema.Types.ObjectId },
  },
  { strict: true, timestamps: true },
);

activitySchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model('Activity', activitySchema);
