import mongoose from 'mongoose';
import { INDUSTRIES, STAGES, BUSINESS_MODELS } from '../../common/constants/index.js';

const { Schema } = mongoose;

const startupSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    tagline: { type: String, trim: true, maxlength: 200 },
    description: { type: String, trim: true, maxlength: 5000 },
    industry: { type: String, required: true, enum: INDUSTRIES },
    subIndustry: { type: String, trim: true, maxlength: 100 },
    stage: { type: String, required: true, enum: STAGES },
    businessModel: { type: String, enum: BUSINESS_MODELS },
    headquartersCountry: { type: String, trim: true, maxlength: 100 },
    headquartersCity: { type: String, trim: true, maxlength: 100 },
    operatingMarkets: {
      type: [String],
      validate: [(v) => v.length <= 20, 'Max 20 markets'],
    },
    foundedYear: { type: Number, min: 1900, max: new Date().getFullYear() },
    teamSize: { type: Number, min: 1 },
    websiteUrl: { type: String, trim: true, maxlength: 500 },
    targetRaiseAmount: { type: Number, min: 0 },
    raiseCurrency: { type: String, default: 'USD', maxlength: 3 },
    minTicketSize: { type: Number, min: 0 },
    maxTicketSize: { type: Number, min: 0 },
    revenueRange: {
      type: String,
      enum: ['pre-revenue', '0-10k', '10k-100k', '100k-500k', '500k-1m', '1m-5m', '5m+', 'undisclosed'],
    },
    traction: { type: String, trim: true, maxlength: 2000 },
    fundingUse: { type: String, trim: true, maxlength: 2000 },
    milestones: { type: String, trim: true, maxlength: 2000 },
    profileCompleteness: { type: Number, min: 0, max: 100, default: 0 },
    isDraft: { type: Boolean, default: true },
    lastMatchRunAt: { type: Date },
  },
  { strict: true, timestamps: true },
);

// Compute profileCompleteness before saving
startupSchema.pre('save', function (next) {
  const IMPORTANT_FIELDS = [
    'name', 'description', 'industry', 'stage', 'targetRaiseAmount', 'traction', 'teamSize',
  ];
  const filled = IMPORTANT_FIELDS.filter((f) => {
    const val = this[f];
    return val !== undefined && val !== null && val !== '';
  });
  this.profileCompleteness = Math.round((filled.length / IMPORTANT_FIELDS.length) * 100);
  next();
});

export default mongoose.model('Startup', startupSchema);
