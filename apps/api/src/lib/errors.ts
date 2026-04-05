import type { Context } from 'hono';

interface ErrorBody {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

function errorResponse(
  c: Context,
  status: number,
  code: string,
  message: string,
  details?: unknown
): Response {
  const body: ErrorBody = {
    error: { code, message },
  };
  if (details !== undefined) {
    body.error.details = details;
  }
  return c.json(body, status as Parameters<Context['json']>[1]);
}

export function badRequest(c: Context, message = 'Bad request', details?: unknown) {
  return errorResponse(c, 400, 'BAD_REQUEST', message, details);
}

export function unauthorized(c: Context, message = 'Unauthorized') {
  return errorResponse(c, 401, 'UNAUTHORIZED', message);
}

export function forbidden(c: Context, message = 'Forbidden') {
  return errorResponse(c, 403, 'FORBIDDEN', message);
}

export function notFound(c: Context, message = 'Not found') {
  return errorResponse(c, 404, 'NOT_FOUND', message);
}

export function conflict(c: Context, message = 'Conflict') {
  return errorResponse(c, 409, 'CONFLICT', message);
}

export function internalError(c: Context, message = 'Internal server error') {
  return errorResponse(c, 500, 'INTERNAL_ERROR', message);
}
