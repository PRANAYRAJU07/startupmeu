import Joi from 'joi';
import { INDUSTRIES, STAGES, INVESTOR_TYPES, BUSINESS_MODELS } from '../../common/constants/index.js';
import { MAX_PAGE_SIZE, DEFAULT_PAGE_SIZE } from '../../common/constants/index.js';

export const getInvestorsSchema = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
    search: Joi.string().trim().max(100).optional().allow(''),
    industry: Joi.alternatives().try(Joi.string().valid(...INDUSTRIES), Joi.array().items(Joi.string().valid(...INDUSTRIES))).optional(),
    stage: Joi.alternatives().try(Joi.string().valid(...STAGES), Joi.array().items(Joi.string().valid(...STAGES))).optional(),
    geography: Joi.string().trim().max(100).optional().allow(''),
    investorType: Joi.string().valid(...INVESTOR_TYPES).optional().allow(''),
    ticketSize: Joi.number().min(0).optional(),
    isDemoData: Joi.boolean().optional(),
  }),
};

export const getInvestorByIdSchema = {
  params: Joi.object({
    id: Joi.string().hex().length(24).required(),
  }),
};

export const saveInvestorSchema = {
  body: Joi.object({
    investorId: Joi.string().hex().length(24).required(),
    notes: Joi.string().trim().max(2000).optional().allow(''),
  }),
};

export const deleteSavedInvestorSchema = {
  params: Joi.object({
    id: Joi.string().hex().length(24).required(), // This refers to the SavedInvestor _id or Investor _id depending on design, let's say it's SavedInvestor _id.
  }),
};
