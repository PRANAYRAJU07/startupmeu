import Joi from 'joi';
import { PIPELINE_STAGES } from '../../common/constants/index.js';

export const createDealSchema = {
  body: Joi.object({
    investorId: Joi.string().hex().length(24).required(),
    investorName: Joi.string().trim().max(200).optional(),
    stage: Joi.string().valid(...PIPELINE_STAGES).required(),
    notes: Joi.string().trim().max(5000).optional().allow(''),
    nextAction: Joi.string().trim().max(500).optional().allow(''),
    followUpDate: Joi.date().iso().optional(),
    committedAmount: Joi.number().min(0).optional(),
    commitCurrency: Joi.string().optional(),
  }),
};

export const updateDealSchema = {
  params: Joi.object({
    id: Joi.string().hex().length(24).required(),
  }),
  body: Joi.object({
    stage: Joi.string().valid(...PIPELINE_STAGES).optional(),
    notes: Joi.string().trim().max(5000).optional().allow(''),
    nextAction: Joi.string().trim().max(500).optional().allow(''),
    followUpDate: Joi.date().iso().optional(),
    committedAmount: Joi.number().min(0).optional(),
    commitCurrency: Joi.string().optional(),
    outcome: Joi.string().trim().max(1000).optional().allow(''),
    isActive: Joi.boolean().optional(),
  }),
};

export const getDealByIdSchema = {
  params: Joi.object({
    id: Joi.string().hex().length(24).required(),
  }),
};

export const deleteDealSchema = {
  params: Joi.object({
    id: Joi.string().hex().length(24).required(),
  }),
};

export const addActivitySchema = {
  params: Joi.object({
    id: Joi.string().hex().length(24).required(), // deal ID
  }),
  body: Joi.object({
    date: Joi.date().iso().required(),
    method: Joi.string().trim().required(),
    summary: Joi.string().trim().max(1000).required(),
  }),
};
