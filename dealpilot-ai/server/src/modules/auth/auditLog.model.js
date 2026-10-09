import mongoose from 'mongoose';

const { Schema } = mongoose;

const auditLogSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    action: { type: String, required: true, maxlength: 200 },
    ipAddress: { type: String, maxlength: 45 },
    userAgent: { type: String, maxlength: 500 },
    metadata: { type: Schema.Types.Mixed, default: {} },
    severity: { type: String, enum: ['low', 'medium', 'high'], default: 'low' },
    requestId: { type: String },
  },
  { strict: true, timestamps: true },
);

auditLogSchema.index({ userId: 1, createdAt: 1 });
auditLogSchema.index({ action: 1, createdAt: 1 });

export default mongoose.model('AuditLog', auditLogSchema);
