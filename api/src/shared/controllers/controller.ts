import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { sendCreated, sendNoContent, sendSuccess } from '@/shared/response';

export type ControllerStatus = 'ok' | 'created' | 'no-content';

type Schema = z.ZodTypeAny;
export type ControllerSchema = Schema | undefined;
type EmptyInput = Record<string, never>;

export type ParsedInput<TSchema extends ControllerSchema> = TSchema extends Schema ? z.output<TSchema> : EmptyInput;
export type ParsedResponse<TSchema extends Schema> = z.output<TSchema>;

export type ControllerArgs<
  TBody extends ControllerSchema,
  TParams extends ControllerSchema,
  TQuery extends ControllerSchema,
> = {
  req: Request;
  body: ParsedInput<TBody>;
  params: ParsedInput<TParams>;
  query: ParsedInput<TQuery>;
};

function parseInput<TSchema extends ControllerSchema>(schema: TSchema, value: unknown): ParsedInput<TSchema> {
  if (!schema) {
    return {} as ParsedInput<TSchema>;
  }

  return schema.parse(value) as ParsedInput<TSchema>;
}

function sendResponse(res: Response, data: unknown, status: ControllerStatus = 'ok'): void {
  if (status === 'no-content') {
    sendNoContent(res);
    return;
  }

  if (status === 'created') {
    sendCreated(res, data);
    return;
  }

  sendSuccess(res, data);
}

type ResponseHandlerOptions<
  TBody extends ControllerSchema,
  TParams extends ControllerSchema,
  TQuery extends ControllerSchema,
  TResponse extends Schema,
> = {
  body?: TBody;
  params?: TParams;
  query?: TQuery;
  response: TResponse;
  handle: (input: ControllerArgs<TBody, TParams, TQuery>) => Promise<ParsedResponse<TResponse>>;
  status?: Exclude<ControllerStatus, 'no-content'>;
};

type NoContentHandlerOptions<
  TBody extends ControllerSchema,
  TParams extends ControllerSchema,
  TQuery extends ControllerSchema,
> = {
  body?: TBody;
  params?: TParams;
  query?: TQuery;
  handle: (input: ControllerArgs<TBody, TParams, TQuery>) => Promise<void>;
  status: 'no-content';
};

export function createHandler<
  TBody extends ControllerSchema = undefined,
  TParams extends ControllerSchema = undefined,
  TQuery extends ControllerSchema = undefined,
  TResponse extends Schema = Schema,
>(
  options:
    | ResponseHandlerOptions<TBody, TParams, TQuery, TResponse>
    | NoContentHandlerOptions<TBody, TParams, TQuery>,
) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = parseInput(options.body, req.body);
      const params = parseInput(options.params, req.params);
      const query = parseInput(options.query, req.query);
      const data = await options.handle({ req, body, params, query } as ControllerArgs<TBody, TParams, TQuery>);

      if (options.status === 'no-content') {
        sendResponse(res, undefined, 'no-content');
        return;
      }

      const response = options.response.parse(data) as ParsedResponse<TResponse>;
      sendResponse(res, response, options.status);
    } catch (err) {
      next(err);
    }
  };
}
