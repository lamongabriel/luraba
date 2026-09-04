import type { EndpointParams, EndpointResult } from "../api.js";
import type { recurringBillsEndpoints } from "./endpoints.js";

export type {
  CreateRecurringBillInput,
  ListRecurringBillsQuery,
  ListRecurringOccurrencesQuery,
  RescheduleOccurrenceInput,
  UpdateRecurringBillInput,
} from "./requests.js";

export type GetRecurringBillParams = EndpointParams<typeof recurringBillsEndpoints.get>;
export type UpdateRecurringBillParams = EndpointParams<typeof recurringBillsEndpoints.update>;
export type DeleteRecurringBillParams = EndpointParams<typeof recurringBillsEndpoints.delete>;
export type ListRecurringOccurrencesParams = EndpointParams<
  typeof recurringBillsEndpoints.occurrences
>;
export type SkipOccurrenceParams = EndpointParams<typeof recurringBillsEndpoints.skip>;
export type RescheduleOccurrenceParams = EndpointParams<typeof recurringBillsEndpoints.reschedule>;
export type CreateOccurrenceParams = EndpointParams<
  typeof recurringBillsEndpoints.createOccurrence
>;

export type ListRecurringBillsResult = EndpointResult<typeof recurringBillsEndpoints.list>;
export type CreateRecurringBillResult = EndpointResult<typeof recurringBillsEndpoints.create>;
export type GetRecurringBillResult = EndpointResult<typeof recurringBillsEndpoints.get>;
export type UpdateRecurringBillResult = EndpointResult<typeof recurringBillsEndpoints.update>;
export type DeleteRecurringBillResult = EndpointResult<typeof recurringBillsEndpoints.delete>;
export type ListRecurringOccurrencesResult = EndpointResult<
  typeof recurringBillsEndpoints.occurrences
>;
export type SkipOccurrenceResult = EndpointResult<typeof recurringBillsEndpoints.skip>;
export type RescheduleOccurrenceResult = EndpointResult<typeof recurringBillsEndpoints.reschedule>;
export type CreateRecurringOccurrenceResult = EndpointResult<
  typeof recurringBillsEndpoints.createOccurrence
>;
