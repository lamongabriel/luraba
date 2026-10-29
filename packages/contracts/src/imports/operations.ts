import type { EndpointParams, EndpointResult } from "../api.js";
import type { importsEndpoints } from "./endpoints.js";

export type ListImportParsersResult = EndpointResult<typeof importsEndpoints.parsers>;
export type ListImportsResult = EndpointResult<typeof importsEndpoints.list>;
export type GetImportResult = EndpointResult<typeof importsEndpoints.get>;
export type UpdateImportResult = EndpointResult<typeof importsEndpoints.update>;
export type ListImportRowsResult = EndpointResult<typeof importsEndpoints.rows>;
export type ListImportGroupsResult = EndpointResult<typeof importsEndpoints.groups>;
export type ImportReconciliationResult = EndpointResult<typeof importsEndpoints.reconciliation>;
export type ImportParams = EndpointParams<typeof importsEndpoints.get>;
