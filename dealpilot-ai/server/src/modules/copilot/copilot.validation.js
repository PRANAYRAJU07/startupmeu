import Joi from 'joi';

export const analyzePitchSchema = {
  body: Joi.object({
    startupId: Joi.string().hex().length(24).optional(),
    pitchText: Joi.string().trim().max(10000).required(),
    goals: Joi.string().trim().max(2000).optional().allow(''),
  }),
};

export const updateAnalysisSchema = {
  params: Joi.object({
    id: Joi.string().hex().length(24).required(),
  }),
  body: Joi.object({
    status: Joi.string().valid('draft', 'saved').optional(),
    output: Joi.object().optional(), // Allow editing AI output
  }),
};

export const outreachDraftSchema = {
  body: Joi.object({
    startupId: Joi.string().hex().length(24).optional(),
    investorId: Joi.string().hex().length(24).required(),
  }),
};

export const deleteAnalysisSchema = {
  params: Joi.object({
    id: Joi.string().hex().length(24).required(),
  }),
};
