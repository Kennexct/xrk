import type { NextFunction, Request, Response } from 'express';
import type { ZodTypeAny, z } from 'zod';

export const validateBody =
  <T extends ZodTypeAny>(schema: T) =>
  (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) return next(result.error);
    req.body = result.data as z.infer<T>;
    return next();
  };

export const parseQuery = <T extends ZodTypeAny>(schema: T, req: Request): z.infer<T> =>
  schema.parse(req.query);
