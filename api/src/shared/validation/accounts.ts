import { z } from 'zod';
import {
  accountClassificationEnum,
  accountTypeEnum,
  cashAccountSubtypeEnum,
  cryptoAccountSubtypeEnum,
  investmentAccountSubtypeEnum,
  loanAccountSubtypeEnum,
  loanInterestRateTypeEnum,
  loanPaymentFrequencyEnum,
  otherAssetSubtypeEnum,
  otherLiabilitySubtypeEnum,
  propertyAccountSubtypeEnum,
  propertyAreaUnitEnum,
  vehicleAccountSubtypeEnum,
  vehicleMileageUnitEnum,
} from '@/db/schemas/enums.schema';

export const accountClassificationSchema = z.enum(accountClassificationEnum.enumValues);
export const accountTypeSchema = z.enum(accountTypeEnum.enumValues);
export const cashAccountSubtypeSchema = z.enum(cashAccountSubtypeEnum.enumValues);
export const investmentAccountSubtypeSchema = z.enum(investmentAccountSubtypeEnum.enumValues);
export const cryptoAccountSubtypeSchema = z.enum(cryptoAccountSubtypeEnum.enumValues);
export const propertyAccountSubtypeSchema = z.enum(propertyAccountSubtypeEnum.enumValues);
export const propertyAreaUnitSchema = z.enum(propertyAreaUnitEnum.enumValues);
export const vehicleAccountSubtypeSchema = z.enum(vehicleAccountSubtypeEnum.enumValues);
export const vehicleMileageUnitSchema = z.enum(vehicleMileageUnitEnum.enumValues);
export const loanAccountSubtypeSchema = z.enum(loanAccountSubtypeEnum.enumValues);
export const loanInterestRateTypeSchema = z.enum(loanInterestRateTypeEnum.enumValues);
export const loanPaymentFrequencySchema = z.enum(loanPaymentFrequencyEnum.enumValues);
export const otherAssetSubtypeSchema = z.enum(otherAssetSubtypeEnum.enumValues);
export const otherLiabilitySubtypeSchema = z.enum(otherLiabilitySubtypeEnum.enumValues);

export const accountSubtypeSchema = z.union([
  cashAccountSubtypeSchema,
  investmentAccountSubtypeSchema,
  cryptoAccountSubtypeSchema,
  propertyAccountSubtypeSchema,
  vehicleAccountSubtypeSchema,
  loanAccountSubtypeSchema,
  otherAssetSubtypeSchema,
  otherLiabilitySubtypeSchema,
  z.literal('credit'),
]);

export type AccountClassification = z.infer<typeof accountClassificationSchema>;
export type AccountType = z.infer<typeof accountTypeSchema>;
export type AccountSubtype = z.infer<typeof accountSubtypeSchema>;
