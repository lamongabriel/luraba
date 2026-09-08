import { isValid, parseISO } from "date-fns";
import { z } from "zod";

import { INSTITUTION_DOMAIN_ERROR, isValidInstitutionDomain } from "@/lib/domains";

const nextCalendarYear = new Date().getUTCFullYear() + 1;

const optionalNumber = (schema: z.ZodNumber) => z.union([schema, z.literal("")]).optional();
const optionalDate = (label: string) =>
  z
    .string()
    .refine(
      (value) => value === "" || isValid(parseISO(value)),
      `Enter a valid ${label.toLowerCase()}.`,
    );
const optionalText = (label: string, max: number) =>
  z.string().trim().max(max, `${label} must be ${max} characters or fewer.`);

const commonShape = {
  currencyCode: z
    .string()
    .trim()
    .regex(/^[A-Za-z]{3}$/, "Choose a valid three-letter currency."),
  institutionDomain: z
    .string()
    .trim()
    .max(255, "Institution domain must be 255 characters or fewer.")
    .refine(isValidInstitutionDomain, INSTITUTION_DOMAIN_ERROR),
  institutionName: optionalText("Institution name", 255),
  name: z
    .string()
    .trim()
    .min(1, "Enter an account name.")
    .max(255, "Account name must be 255 characters or fewer."),
  notes: optionalText("Notes", 4000),
};

const nonCardShape = {
  ...commonShape,
  openingBalance: optionalNumber(z.number({ error: "Enter a valid opening balance." }).finite()),
  balanceAsOfDate: optionalDate("balance date"),
};

export const createEditAccountFormSchema = z
  .discriminatedUnion("type", [
    z.object({
      ...nonCardShape,
      type: z.literal("cash"),
      subtype: z.enum(
        [
          "checking",
          "savings",
          "cash",
          "money_market",
          "certificate_of_deposit",
          "prepaid",
          "other",
        ],
        { error: "Choose a cash account subtype." },
      ),
    }),
    z.object({
      ...nonCardShape,
      type: z.literal("investment"),
      subtype: z.enum(
        ["brokerage", "retirement", "pension", "education", "employee_stock", "other"],
        { error: "Choose an investment subtype." },
      ),
    }),
    z.object({
      ...nonCardShape,
      type: z.literal("crypto"),
      subtype: z.enum(["exchange", "wallet", "custody", "staking", "other"], {
        error: "Choose a crypto account subtype.",
      }),
      walletAddress: optionalText("Wallet address", 255),
      network: optionalText("Network", 64),
    }),
    z.object({
      ...nonCardShape,
      type: z.literal("property"),
      subtype: z.enum(
        ["house", "apartment", "condominium", "land", "commercial", "storage", "parking", "other"],
        { error: "Choose a property subtype." },
      ),
      addressLine1: optionalText("Address", 255),
      addressLine2: optionalText("Address line 2", 255),
      city: optionalText("City", 128),
      region: optionalText("State or region", 128),
      postalCode: optionalText("Postal code", 32),
      countryCode: z.string().regex(/^$|^[A-Za-z]{2}$/, "Use a two-letter country code."),
      area: optionalNumber(
        z.number({ error: "Enter a valid area." }).positive("Area must be greater than zero."),
      ),
      areaUnit: z.enum(["", "sqm", "sqft"], {
        error: "Choose a valid area unit.",
      }),
      yearBuilt: optionalNumber(
        z
          .number({ error: "Enter a valid year built." })
          .int("Year built must be a whole year.")
          .min(0, "Year built cannot be negative.")
          .max(nextCalendarYear, `Year built cannot be after ${nextCalendarYear}.`),
      ),
    }),
    z.object({
      ...nonCardShape,
      type: z.literal("vehicle"),
      subtype: z.enum(
        ["car", "motorcycle", "truck", "van", "recreational_vehicle", "boat", "aircraft", "other"],
        { error: "Choose a vehicle subtype." },
      ),
      make: optionalText("Make", 128),
      model: optionalText("Model", 128),
      year: optionalNumber(
        z
          .number({ error: "Enter a valid vehicle year." })
          .int("Vehicle year must be a whole year.")
          .min(1886, "Vehicle year cannot be before 1886.")
          .max(nextCalendarYear, `Vehicle year cannot be after ${nextCalendarYear}.`),
      ),
      trim: optionalText("Trim", 128),
      vin: optionalText("VIN", 32),
      licensePlate: optionalText("License plate", 32),
      mileage: optionalNumber(
        z
          .number({ error: "Enter a valid mileage." })
          .int("Mileage must be a whole number.")
          .nonnegative("Mileage cannot be negative."),
      ),
      mileageUnit: z.enum(["", "km", "mi"], {
        error: "Choose a valid mileage unit.",
      }),
    }),
    z.object({
      ...nonCardShape,
      type: z.literal("loan"),
      subtype: z.enum(
        ["mortgage", "auto", "student", "personal", "business", "line_of_credit", "other"],
        { error: "Choose a loan subtype." },
      ),
      originalPrincipal: optionalNumber(
        z
          .number({ error: "Enter a valid original principal." })
          .positive("Original principal must be greater than zero."),
      ),
      annualInterestRate: optionalNumber(
        z
          .number({ error: "Enter a valid annual interest rate." })
          .min(0, "Annual interest rate cannot be negative.")
          .max(100, "Annual interest rate cannot exceed 100%."),
      ),
      interestRateType: z.enum(["", "fixed", "variable"], {
        error: "Choose a valid interest rate type.",
      }),
      termMonths: optionalNumber(
        z
          .number({ error: "Enter a valid loan term." })
          .int("Loan term must use whole months.")
          .positive("Loan term must be at least one month."),
      ),
      startDate: optionalDate("start date"),
      maturityDate: optionalDate("maturity date"),
      paymentAmount: optionalNumber(
        z
          .number({ error: "Enter a valid payment amount." })
          .positive("Payment amount must be greater than zero."),
      ),
      paymentFrequency: z.enum(
        ["", "weekly", "biweekly", "monthly", "quarterly", "annually", "other"],
        { error: "Choose a valid payment frequency." },
      ),
      securedAssetAccountId: z
        .string()
        .refine(
          (value) => value === "" || z.uuid().safeParse(value).success,
          "Choose a valid secured asset.",
        ),
    }),
    z.object({
      ...nonCardShape,
      type: z.literal("other_asset"),
      subtype: z.enum(
        ["collectible", "precious_metal", "business_ownership", "receivable", "other"],
        { error: "Choose an asset subtype." },
      ),
    }),
    z.object({
      ...nonCardShape,
      type: z.literal("other_liability"),
      subtype: z.enum(["tax", "medical", "payable", "legal", "other"], {
        error: "Choose a liability subtype.",
      }),
    }),
  ])
  .superRefine((values, context) => {
    if (
      values.type === "loan" &&
      values.startDate &&
      values.maturityDate &&
      values.startDate > values.maturityDate
    ) {
      context.addIssue({
        code: "custom",
        path: ["maturityDate"],
        message: "Maturity date must be on or after the start date.",
      });
    }
  });

export type CreateEditAccountFormValues = z.infer<typeof createEditAccountFormSchema>;
