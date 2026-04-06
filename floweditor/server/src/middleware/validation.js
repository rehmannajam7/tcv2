import Joi from 'joi';
import logger from '../config/logger.js';

export const validateRequest = schema => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const validationErrors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value,
      }));

      logger.warn('Request validation failed', {
        errors: validationErrors,
        user_id: req.user?.id,
        account_id: req.user?.account_id,
        path: req.path,
        method: req.method,
      });

      return res.status(400).json({
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: validationErrors,
      });
    }

    req.validatedBody = value;
    next();
  };
};

// Flow definition validation schemas
export const flowDefinitionSchema = Joi.object({
  name: Joi.string()
    .min(1)
    .max(255)
    .required(),
  description: Joi.string()
    .max(1000)
    .allow(''),
  definition_json: Joi.object().required(),
  version: Joi.string()
    .pattern(/^\d+\.\d+\.\d+$/)
    .default('1.0.0'),
  status: Joi.string()
    .valid('draft', 'published', 'archived')
    .default('draft'),
});

export const flowDefinitionUpdateSchema = Joi.object({
  name: Joi.string()
    .min(1)
    .max(255),
  description: Joi.string()
    .max(1000)
    .allow(''),
  definition_json: Joi.object(),
  version: Joi.string().pattern(/^\d+\.\d+\.\d+$/),
  status: Joi.string().valid('draft', 'published', 'archived'),
}).min(1);

export const flowRevisionSchema = Joi.object({
  definition_json: Joi.object().required(),
  version: Joi.string()
    .pattern(/^\d+\.\d+\.\d+$/)
    .required(),
  change_summary: Joi.string()
    .max(500)
    .allow(''),
});

// Query parameter validation
export const paginationSchema = Joi.object({
  page: Joi.number()
    .integer()
    .min(1)
    .default(1),
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(20),
  sort: Joi.string()
    .valid('name', 'created_at', 'updated_at')
    .default('updated_at'),
  order: Joi.string()
    .valid('asc', 'desc')
    .default('desc'),
  status: Joi.string().valid('draft', 'published', 'archived'),
  search: Joi.string().max(255),
});

export const validateQuery = schema => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const validationErrors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value,
      }));

      return res.status(400).json({
        error: 'Query validation failed',
        code: 'QUERY_VALIDATION_ERROR',
        details: validationErrors,
      });
    }

    req.validatedQuery = value;
    next();
  };
};
