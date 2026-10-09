import { ValidationError } from '../errors/index.js';

/**
 * Validate request data against a Joi schema object.
 * @param {Object} schema - Object with optional keys: body, query, params
 */
export function validate(schema) {
  return (req, res, next) => {
    const fieldErrors = [];
    const targets = ['body', 'query', 'params'];

    for (const target of targets) {
      if (!schema[target]) continue;

      const { error, value } = schema[target].validate(req[target], {
        abortEarly: false,
        stripUnknown: true,
      });

      if (error) {
        for (const detail of error.details) {
          fieldErrors.push({
            field: detail.path.join('.'),
            message: detail.message,
          });
        }
      } else {
        req[target] = value;
      }
    }

    if (fieldErrors.length > 0) {
      const err = new ValidationError('Validation failed', fieldErrors);
      return next(err);
    }

    next();
  };
}
