import type { z } from 'zod';
import type { HouseholdContext } from '@/config/permissions';
import { getHouseholdContext } from '@/middleware/access.middleware';
import {
  type ControllerArgs,
  type ControllerOutput,
  type ControllerSchema,
  type ControllerStatus,
  createHandler,
} from '@/shared/controllers/controller';

type Schema = z.ZodTypeAny;

export function createHouseholdHandler<
  TBody extends ControllerSchema = undefined,
  TParams extends ControllerSchema = undefined,
  TQuery extends ControllerSchema = undefined,
  TResponse extends Schema = Schema,
>(
  options:
    | {
        body?: TBody;
        params?: TParams;
        query?: TQuery;
        response: TResponse;
        handle: (
          input: ControllerArgs<TBody, TParams, TQuery> & { household: HouseholdContext },
        ) => Promise<ControllerOutput<TResponse>>;
        status?: Exclude<ControllerStatus, 'no-content'>;
      }
    | {
        body?: TBody;
        params?: TParams;
        query?: TQuery;
        handle: (
          input: ControllerArgs<TBody, TParams, TQuery> & { household: HouseholdContext },
        ) => Promise<void>;
        status: 'no-content';
      },
) {
  if (options.status === 'no-content') {
    return createHandler({
      body: options.body,
      params: options.params,
      query: options.query,
      status: 'no-content',
      handle: ({ req, body, params, query }) => {
        const household = getHouseholdContext(req);
        return options.handle({ req, household, body, params, query });
      },
    });
  }

  return createHandler({
    body: options.body,
    params: options.params,
    query: options.query,
    response: options.response,
    status: options.status,
    handle: ({ req, body, params, query }) => {
      const household = getHouseholdContext(req);
      return options.handle({ req, household, body, params, query });
    },
  });
}
