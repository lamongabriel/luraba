import type {
  AccountProfile,
  AccountType,
  CreateAccountProfile,
  UpdateAccountProfile,
} from '@luraba/contracts/accounts';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import {
  cashAccountProfilesTable,
  cryptoAccountProfilesTable,
  investmentAccountProfilesTable,
  loanAccountProfilesTable,
  otherAssetAccountProfilesTable,
  otherLiabilityAccountProfilesTable,
  propertyAccountProfilesTable,
  vehicleAccountProfilesTable,
} from '@/db/schemas/account-profiles.schema';
import type { TxClient } from '@/db/types';

const nullable = <T>(value: T | null | undefined): T | null => value ?? null;
const withoutKind = <T extends { kind: string }>(details: T): Omit<T, 'kind'> => {
  const { kind: _kind, ...values } = details;
  return values;
};

export async function createAccountProfile(
  tx: TxClient,
  accountId: string,
  details: CreateAccountProfile,
): Promise<void> {
  switch (details.kind) {
    case 'cash':
      await tx.insert(cashAccountProfilesTable).values({ accountId, ...withoutKind(details) });
      return;
    case 'investment':
      await tx
        .insert(investmentAccountProfilesTable)
        .values({ accountId, ...withoutKind(details) });
      return;
    case 'crypto':
      await tx.insert(cryptoAccountProfilesTable).values({ accountId, ...withoutKind(details) });
      return;
    case 'property':
      await tx.insert(propertyAccountProfilesTable).values({ accountId, ...withoutKind(details) });
      return;
    case 'vehicle':
      await tx.insert(vehicleAccountProfilesTable).values({ accountId, ...withoutKind(details) });
      return;
    case 'loan':
      await tx.insert(loanAccountProfilesTable).values({ accountId, ...withoutKind(details) });
      return;
    case 'other_asset':
      await tx
        .insert(otherAssetAccountProfilesTable)
        .values({ accountId, subtype: details.subtype });
      return;
    case 'other_liability':
      await tx
        .insert(otherLiabilityAccountProfilesTable)
        .values({ accountId, subtype: details.subtype });
      return;
  }
}

export async function updateAccountProfile(
  tx: TxClient,
  accountId: string,
  details: UpdateAccountProfile,
): Promise<void> {
  switch (details.kind) {
    case 'cash':
      await tx
        .update(cashAccountProfilesTable)
        .set(withoutKind(details))
        .where(eq(cashAccountProfilesTable.accountId, accountId));
      return;
    case 'investment':
      await tx
        .update(investmentAccountProfilesTable)
        .set(withoutKind(details))
        .where(eq(investmentAccountProfilesTable.accountId, accountId));
      return;
    case 'crypto':
      await tx
        .update(cryptoAccountProfilesTable)
        .set(withoutKind(details))
        .where(eq(cryptoAccountProfilesTable.accountId, accountId));
      return;
    case 'property':
      await tx
        .update(propertyAccountProfilesTable)
        .set(withoutKind(details))
        .where(eq(propertyAccountProfilesTable.accountId, accountId));
      return;
    case 'vehicle':
      await tx
        .update(vehicleAccountProfilesTable)
        .set(withoutKind(details))
        .where(eq(vehicleAccountProfilesTable.accountId, accountId));
      return;
    case 'loan':
      await tx
        .update(loanAccountProfilesTable)
        .set(withoutKind(details))
        .where(eq(loanAccountProfilesTable.accountId, accountId));
      return;
    case 'other_asset':
      await tx
        .update(otherAssetAccountProfilesTable)
        .set(withoutKind(details))
        .where(eq(otherAssetAccountProfilesTable.accountId, accountId));
      return;
    case 'other_liability':
      await tx
        .update(otherLiabilityAccountProfilesTable)
        .set(withoutKind(details))
        .where(eq(otherLiabilityAccountProfilesTable.accountId, accountId));
      return;
  }
}

export async function getAccountProfile(
  accountId: string,
  type: AccountType,
): Promise<AccountProfile | undefined> {
  switch (type) {
    case 'cash': {
      const [row] = await db
        .select()
        .from(cashAccountProfilesTable)
        .where(eq(cashAccountProfilesTable.accountId, accountId));
      return row
        ? {
            kind: 'cash',
            subtype: row.subtype,
          }
        : undefined;
    }
    case 'investment': {
      const [row] = await db
        .select()
        .from(investmentAccountProfilesTable)
        .where(eq(investmentAccountProfilesTable.accountId, accountId));
      return row
        ? {
            kind: 'investment',
            subtype: row.subtype,
          }
        : undefined;
    }
    case 'crypto': {
      const [row] = await db
        .select()
        .from(cryptoAccountProfilesTable)
        .where(eq(cryptoAccountProfilesTable.accountId, accountId));
      return row
        ? {
            kind: 'crypto',
            subtype: row.subtype,
            walletAddress: nullable(row.walletAddress),
            network: nullable(row.network),
          }
        : undefined;
    }
    case 'property': {
      const [row] = await db
        .select()
        .from(propertyAccountProfilesTable)
        .where(eq(propertyAccountProfilesTable.accountId, accountId));
      return row
        ? {
            kind: 'property',
            subtype: row.subtype,
            addressLine1: nullable(row.addressLine1),
            addressLine2: nullable(row.addressLine2),
            city: nullable(row.city),
            region: nullable(row.region),
            postalCode: nullable(row.postalCode),
            countryCode: nullable(row.countryCode),
            area: nullable(row.area),
            areaUnit: nullable(row.areaUnit),
            yearBuilt: nullable(row.yearBuilt),
          }
        : undefined;
    }
    case 'vehicle': {
      const [row] = await db
        .select()
        .from(vehicleAccountProfilesTable)
        .where(eq(vehicleAccountProfilesTable.accountId, accountId));
      return row
        ? {
            kind: 'vehicle',
            subtype: row.subtype,
            make: nullable(row.make),
            model: nullable(row.model),
            year: nullable(row.year),
            trim: nullable(row.trim),
            vin: nullable(row.vin),
            licensePlate: nullable(row.licensePlate),
            mileage: nullable(row.mileage),
            mileageUnit: nullable(row.mileageUnit),
          }
        : undefined;
    }
    case 'loan': {
      const [row] = await db
        .select()
        .from(loanAccountProfilesTable)
        .where(eq(loanAccountProfilesTable.accountId, accountId));
      return row
        ? {
            kind: 'loan',
            subtype: row.subtype,
            originalPrincipal: nullable(row.originalPrincipal),
            annualInterestRate: nullable(row.annualInterestRate),
            interestRateType: nullable(row.interestRateType),
            termMonths: nullable(row.termMonths),
            startDate: nullable(row.startDate),
            maturityDate: nullable(row.maturityDate),
            paymentAmount: nullable(row.paymentAmount),
            paymentFrequency: nullable(row.paymentFrequency),
            securedAssetAccountId: nullable(row.securedAssetAccountId),
          }
        : undefined;
    }
    case 'other_asset': {
      const [row] = await db
        .select()
        .from(otherAssetAccountProfilesTable)
        .where(eq(otherAssetAccountProfilesTable.accountId, accountId));
      return row ? { kind: 'other_asset', subtype: row.subtype } : undefined;
    }
    case 'other_liability': {
      const [row] = await db
        .select()
        .from(otherLiabilityAccountProfilesTable)
        .where(eq(otherLiabilityAccountProfilesTable.accountId, accountId));
      return row ? { kind: 'other_liability', subtype: row.subtype } : undefined;
    }
  }

  return undefined;
}
