import type { NextFunction, Request, Response } from 'express';
import type { ZodTypeAny } from 'zod';
import { badRequest } from '../../lib/errors';

/** Validates and replaces req.body with the parsed value. */
export function validateBody(schema: ZodTypeAny) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      next(badRequest('Invalid request body', result.error.flatten()));
      return;
    }
    req.body = result.data;
    next();
  };
}
