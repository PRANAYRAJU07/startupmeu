import Joi from 'joi';

const passwordStrength = Joi.string()
  .min(8)
  .max(128)
  .pattern(/[A-Z]/, 'uppercase')
  .pattern(/[a-z]/, 'lowercase')
  .pattern(/[0-9]/, 'digit')
  .pattern(/[^A-Za-z0-9]/, 'special character')
  .messages({
    'string.pattern.name': 'Password must contain at least one {#name}',
  })
  .required();

export const registerSchema = {
  body: Joi.object({
    firstName: Joi.string().trim().min(1).max(50).pattern(/^[A-Za-z\s]+$/).required(),
    lastName: Joi.string().trim().min(1).max(50).pattern(/^[A-Za-z\s]+$/).required(),
    email: Joi.string().email().lowercase().required(),
    password: passwordStrength,
  }),
};

export const loginSchema = {
  body: Joi.object({
    email: Joi.string().email().lowercase().required(),
    password: Joi.string().required(),
  }),
};

export const verifyEmailSchema = {
  // Token comes in as query param: GET /verify-email?token=...
  query: Joi.object({
    token: Joi.string().hex().length(64).required(),
  }),
};

export const forgotPasswordSchema = {
  body: Joi.object({
    email: Joi.string().email().lowercase().required(),
  }),
};

export const resetPasswordSchema = {
  body: Joi.object({
    token: Joi.string().hex().length(64).required(),
    password: passwordStrength,
  }),
};

export const changePasswordSchema = {
  body: Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: passwordStrength,
  }).custom((value, helpers) => {
    if (value.currentPassword === value.newPassword) {
      return helpers.error('any.invalid');
    }
    return value;
  }).messages({ 'any.invalid': 'New password must differ from current password' }),
};
