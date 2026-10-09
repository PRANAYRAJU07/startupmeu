import { ValidationError } from '../errors/index.js';

/**
 * Validate request data against a Joi schema object.
 * @param {Object} schema - Object with optional keys: body, query, params
 */
export function validate(schema) {
  return (req, res, next) => {
    const fieldErrors = [];
    const targets = ['body', 'query', 'params'];
    // Stage validated values; only apply them to req after all targets pass
    const staged = {};

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
        staged[target] = value;
      }
    }

    if (fieldErrors.length > 0) {
      const err = new ValidationError('Validation failed', fieldErrors);
      return next(err);
    }

    // All targets passed — apply cleaned values now
    for (const [target, value] of Object.entries(staged)) {
      req[target] = value;
    }

    next();
  };
}
