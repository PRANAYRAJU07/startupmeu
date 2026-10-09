import mongoose from 'mongoose';

const { Schema } = mongoose;

const refreshSessionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    tokenHash: { type: String, required: true, select: false },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
    revokeReason: {
      type: String,
      enum: ['logout', 'rotation', 'password_change', 'admin'],
    },
    userAgent: { type: String, maxlength: 500 },
    ipAddress: { type: String, maxlength: 45 },
  },
  { strict: true, timestamps: true },
);

refreshSessionSchema.index({ userId: 1 });
refreshSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

refreshSessionSchema.virtual('isActive').get(function () {
  return this.expiresAt > new Date() && !this.revokedAt;
});

export default mongoose.model('RefreshSession', refreshSessionSchema);
