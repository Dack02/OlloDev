import type { MiddlewareHandler } from 'hono';

export const loggerMiddleware: MiddlewareHandler = async (c, next) => {
  const start = Date.now();
  const method = c.req.method;
  const path = c.req.path;

  await next();

  const status = c.res.status;
  const duration = Date.now() - start;

  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${method} ${path} ${status} ${duration}ms`);
};
