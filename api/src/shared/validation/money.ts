import { z } from 'zod';

export const MAX_SAFE_MINOR_UNITS = Number.MAX_SAFE_INTEGER;

export const moneyAmountSchema = z.coerce.number().int().positive().max(MAX_SAFE_MINOR_UNITS);
export const moneyBalanceSchema = z.coerce
  .number()
  .int()
  .min(-MAX_SAFE_MINOR_UNITS)
  .max(MAX_SAFE_MINOR_UNITS);
