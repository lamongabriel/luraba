import {
  createHandler,
  type ControllerArgs,
  type ControllerSchema,
  type ControllerStatus,
  type ParsedResponse,
} from '@/shared/controllers/controller';
import { getAuthenticatedUser } from '@/middleware/access.middleware';
import { z } from 'zod';

type Schema = z.ZodTypeAny;
type AuthenticatedUser = ReturnType<typeof getAuthenticatedUser>;

export function createAuthenticatedHandler<
  TBody extends ControllerSchema = undefined,
  TParams extends ControllerSchema = undefined,
  TQuery extends ControllerSchema = undefined,
  TResponse extends Schema = Schema,
>(options: {
  body?: TBody;
  params?: TParams;
  query?: TQuery;
  response: TResponse;
  handle: (
    input: ControllerArgs<TBody, TParams, TQuery> & { user: AuthenticatedUser },
  ) => Promise<ParsedResponse<TResponse>>;
  status?: ControllerStatus;
}) {
  return createHandler({
    body: options.body,
    params: options.params,
    query: options.query,
    response: options.response,
    status: options.status,
    handle: ({ req, body, params, query }) => {
      const user = getAuthenticatedUser(req);
      return options.handle({ req, user, body, params, query });
    },
  });
}
