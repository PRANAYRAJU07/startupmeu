import Joi from 'joi';
import { INDUSTRIES, STAGES, BUSINESS_MODELS } from '../../common/constants/index.js';

export const createStartupSchema = {
  body: Joi.object({
    name: Joi.string().trim().max(100).required(),
    tagline: Joi.string().trim().max(200).optional().allow(''),
    description: Joi.string().trim().max(5000).optional().allow(''),
    industry: Joi.string().valid(...INDUSTRIES).required(),
    subIndustry: Joi.string().trim().max(100).optional().allow(''),
    stage: Joi.string().valid(...STAGES).required(),
    businessModel: Joi.string().valid(...BUSINESS_MODELS).optional().allow(''),
    headquartersCountry: Joi.string().trim().max(100).optional().allow(''),
    headquartersCity: Joi.string().trim().max(100).optional().allow(''),
    operatingMarkets: Joi.array().items(Joi.string()).max(20).optional(),
    foundedYear: Joi.number().min(1900).max(new Date().getFullYear()).optional().allow(null),
    teamSize: Joi.number().min(1).optional().allow(null),
    websiteUrl: Joi.string().uri().max(500).optional().allow(''),
    targetRaiseAmount: Joi.number().min(0).optional().allow(null),
    raiseCurrency: Joi.string().max(3).optional().allow(''),
    minTicketSize: Joi.number().min(0).optional().allow(null),
    maxTicketSize: Joi.number().min(0).optional().allow(null),
    revenueRange: Joi.string().valid('pre-revenue', '0-10k', '10k-100k', '100k-500k', '500k-1m', '1m-5m', '5m+', 'undisclosed').optional().allow(''),
    traction: Joi.string().trim().max(2000).optional().allow(''),
    fundingUse: Joi.string().trim().max(2000).optional().allow(''),
    milestones: Joi.string().trim().max(2000).optional().allow(''),
    isDraft: Joi.boolean().optional()
  }),
};

export const updateStartupSchema = {
  body: createStartupSchema.body.fork(Object.keys(createStartupSchema.body.describe().keys), (schema) => schema.optional()),
};
