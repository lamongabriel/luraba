import { z } from 'zod';
import {
  cashAccountSubtypeSchema,
  cryptoAccountSubtypeSchema,
  investmentAccountSubtypeSchema,
  loanAccountSubtypeSchema,
  loanInterestRateTypeSchema,
  loanPaymentFrequencySchema,
  otherAssetSubtypeSchema,
  otherLiabilitySubtypeSchema,
  propertyAccountSubtypeSchema,
  propertyAreaUnitSchema,
  vehicleAccountSubtypeSchema,
  vehicleMileageUnitSchema,
} from '@/shared/validation/accounts';
import { moneyAmountSchema } from '@/shared/validation/money';

const optionalText = (max: number) => z.string().trim().min(1).max(max).optional();
const nullableText = (max: number) => z.string().trim().min(1).max(max).nullable().optional();
const last4Schema = z.string().regex(/^\d{4}$/, 'Must contain exactly four digits');
const percentageSchema = z.coerce.number().min(0).max(100);
const nextCalendarYear = new Date().getUTCFullYear() + 1;
const countryCodeSchema = z
  .string()
  .trim()
  .regex(/^[A-Za-z]{2}$/)
  .transform((value) => value.toUpperCase());

export const cashAccountDetailsSchema = z.strictObject({
  kind: z.literal('cash'),
  subtype: cashAccountSubtypeSchema,
});

export const investmentAccountDetailsSchema = z.strictObject({
  kind: z.literal('investment'),
  subtype: investmentAccountSubtypeSchema,
});

export const cryptoAccountDetailsSchema = z.strictObject({
  kind: z.literal('crypto'),
  subtype: cryptoAccountSubtypeSchema,
  walletAddress: z.string().nullable(),
  network: z.string().nullable(),
});

export const propertyAccountDetailsSchema = z.strictObject({
  kind: z.literal('property'),
  subtype: propertyAccountSubtypeSchema,
  addressLine1: z.string().nullable(),
  addressLine2: z.string().nullable(),
  city: z.string().nullable(),
  region: z.string().nullable(),
  postalCode: z.string().nullable(),
  countryCode: countryCodeSchema.nullable(),
  area: z.number().positive().nullable(),
  areaUnit: propertyAreaUnitSchema.nullable(),
  yearBuilt: z.number().int().min(0).max(nextCalendarYear).nullable(),
});

export const vehicleAccountDetailsSchema = z.strictObject({
  kind: z.literal('vehicle'),
  subtype: vehicleAccountSubtypeSchema,
  make: z.string().nullable(),
  model: z.string().nullable(),
  year: z.number().int().min(1886).max(nextCalendarYear).nullable(),
  trim: z.string().nullable(),
  vin: z.string().nullable(),
  licensePlate: z.string().nullable(),
  mileage: z.number().int().nonnegative().nullable(),
  mileageUnit: vehicleMileageUnitSchema.nullable(),
});

export const loanAccountDetailsSchema = z.strictObject({
  kind: z.literal('loan'),
  subtype: loanAccountSubtypeSchema,
  originalPrincipal: moneyAmountSchema.nullable(),
  annualInterestRate: percentageSchema.nullable(),
  interestRateType: loanInterestRateTypeSchema.nullable(),
  termMonths: z.number().int().positive().nullable(),
  startDate: z.iso.date().nullable(),
  maturityDate: z.iso.date().nullable(),
  paymentAmount: moneyAmountSchema.nullable(),
  paymentFrequency: loanPaymentFrequencySchema.nullable(),
  securedAssetAccountId: z.uuid().nullable(),
});

export const otherAssetAccountDetailsSchema = z.strictObject({
  kind: z.literal('other_asset'),
  subtype: otherAssetSubtypeSchema,
});

export const otherLiabilityAccountDetailsSchema = z.strictObject({
  kind: z.literal('other_liability'),
  subtype: otherLiabilitySubtypeSchema,
});

export const creditCardAccountDetailsSchema = z.strictObject({
  kind: z.literal('credit_card'),
  creditCardId: z.uuid(),
  subtype: z.literal('credit'),
  brand: z.string(),
  productType: z.literal('credit'),
  last4: last4Schema,
  color: z.string().nullable(),
  closingDay: z.number().int(),
  dueDay: z.number().int(),
  creditLimitAmount: z.number().int().nullable(),
});

export const accountProfileSchema = z.discriminatedUnion('kind', [
  cashAccountDetailsSchema,
  investmentAccountDetailsSchema,
  cryptoAccountDetailsSchema,
  propertyAccountDetailsSchema,
  vehicleAccountDetailsSchema,
  loanAccountDetailsSchema,
  otherAssetAccountDetailsSchema,
  otherLiabilityAccountDetailsSchema,
  creditCardAccountDetailsSchema,
]);

export const createAccountProfileSchema = z
  .discriminatedUnion('kind', [
    z.strictObject({
      kind: z.literal('cash'),
      subtype: cashAccountSubtypeSchema,
    }),
    z.strictObject({
      kind: z.literal('investment'),
      subtype: investmentAccountSubtypeSchema,
    }),
    z.strictObject({
      kind: z.literal('crypto'),
      subtype: cryptoAccountSubtypeSchema,
      walletAddress: optionalText(255),
      network: optionalText(64),
    }),
    z.strictObject({
      kind: z.literal('property'),
      subtype: propertyAccountSubtypeSchema,
      addressLine1: optionalText(255),
      addressLine2: optionalText(255),
      city: optionalText(128),
      region: optionalText(128),
      postalCode: optionalText(32),
      countryCode: countryCodeSchema.optional(),
      area: z.coerce.number().positive().optional(),
      areaUnit: propertyAreaUnitSchema.optional(),
      yearBuilt: z.coerce.number().int().min(0).max(nextCalendarYear).optional(),
    }),
    z.strictObject({
      kind: z.literal('vehicle'),
      subtype: vehicleAccountSubtypeSchema,
      make: optionalText(128),
      model: optionalText(128),
      year: z.coerce.number().int().min(1886).max(nextCalendarYear).optional(),
      trim: optionalText(128),
      vin: optionalText(32),
      licensePlate: optionalText(32),
      mileage: z.coerce.number().int().nonnegative().optional(),
      mileageUnit: vehicleMileageUnitSchema.optional(),
    }),
    z.strictObject({
      kind: z.literal('loan'),
      subtype: loanAccountSubtypeSchema,
      originalPrincipal: moneyAmountSchema.optional(),
      annualInterestRate: percentageSchema.optional(),
      interestRateType: loanInterestRateTypeSchema.optional(),
      termMonths: z.coerce.number().int().positive().optional(),
      startDate: z.iso.date().optional(),
      maturityDate: z.iso.date().optional(),
      paymentAmount: moneyAmountSchema.optional(),
      paymentFrequency: loanPaymentFrequencySchema.optional(),
      securedAssetAccountId: z.uuid().optional(),
    }),
    z.strictObject({ kind: z.literal('other_asset'), subtype: otherAssetSubtypeSchema }),
    z.strictObject({ kind: z.literal('other_liability'), subtype: otherLiabilitySubtypeSchema }),
  ])
  .superRefine((details, ctx) => {
    if (
      details.kind === 'loan' &&
      details.startDate &&
      details.maturityDate &&
      details.startDate > details.maturityDate
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['maturityDate'],
        message: 'Maturity date must be on or after the start date',
      });
    }
  });

export const updateAccountProfileSchema = z
  .discriminatedUnion('kind', [
    z.strictObject({
      kind: z.literal('cash'),
      subtype: cashAccountSubtypeSchema.optional(),
    }),
    z.strictObject({
      kind: z.literal('investment'),
      subtype: investmentAccountSubtypeSchema.optional(),
    }),
    z.strictObject({
      kind: z.literal('crypto'),
      subtype: cryptoAccountSubtypeSchema.optional(),
      walletAddress: nullableText(255),
      network: nullableText(64),
    }),
    z.strictObject({
      kind: z.literal('property'),
      subtype: propertyAccountSubtypeSchema.optional(),
      addressLine1: nullableText(255),
      addressLine2: nullableText(255),
      city: nullableText(128),
      region: nullableText(128),
      postalCode: nullableText(32),
      countryCode: countryCodeSchema.nullable().optional(),
      area: z.coerce.number().positive().nullable().optional(),
      areaUnit: propertyAreaUnitSchema.nullable().optional(),
      yearBuilt: z.coerce.number().int().min(0).max(nextCalendarYear).nullable().optional(),
    }),
    z.strictObject({
      kind: z.literal('vehicle'),
      subtype: vehicleAccountSubtypeSchema.optional(),
      make: nullableText(128),
      model: nullableText(128),
      year: z.coerce.number().int().min(1886).max(nextCalendarYear).nullable().optional(),
      trim: nullableText(128),
      vin: nullableText(32),
      licensePlate: nullableText(32),
      mileage: z.coerce.number().int().nonnegative().nullable().optional(),
      mileageUnit: vehicleMileageUnitSchema.nullable().optional(),
    }),
    z.strictObject({
      kind: z.literal('loan'),
      subtype: loanAccountSubtypeSchema.optional(),
      originalPrincipal: moneyAmountSchema.nullable().optional(),
      annualInterestRate: percentageSchema.nullable().optional(),
      interestRateType: loanInterestRateTypeSchema.nullable().optional(),
      termMonths: z.coerce.number().int().positive().nullable().optional(),
      startDate: z.iso.date().nullable().optional(),
      maturityDate: z.iso.date().nullable().optional(),
      paymentAmount: moneyAmountSchema.nullable().optional(),
      paymentFrequency: loanPaymentFrequencySchema.nullable().optional(),
      securedAssetAccountId: z.uuid().nullable().optional(),
    }),
    z.strictObject({ kind: z.literal('other_asset'), subtype: otherAssetSubtypeSchema.optional() }),
    z.strictObject({
      kind: z.literal('other_liability'),
      subtype: otherLiabilitySubtypeSchema.optional(),
    }),
  ])
  .refine((details) => Object.keys(details).length > 1, {
    message: 'At least one account detail must be provided',
  });

export type AccountProfile = z.infer<typeof accountProfileSchema>;
export type CreateAccountProfile = z.infer<typeof createAccountProfileSchema>;
export type UpdateAccountProfile = z.infer<typeof updateAccountProfileSchema>;
