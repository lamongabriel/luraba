import { now } from "@luraba/domain";
import { and, asc, eq, isNull, or, sql } from "drizzle-orm";
import type { HouseholdContext } from "@/config/permissions";
import { db } from "@/db";
import { paymentMethodsTable } from "@/db/schemas/payment-methods.schema";
import { type DbListPage, getPagination } from "@/shared/list";
import {
  buildPaymentMethodsListOrder,
  buildPaymentMethodsListWhere,
  type ListPaymentMethodsQuery,
} from "./payment-methods.query";
import type { PaymentMethodRecord } from "./payment-methods.types";

type CreatePaymentMethodValues = {
  code: string;
  name: string;
  currencyId?: string | null;
  color?: string | null;
  icon?: string | null;
};

class PaymentMethodsRepository {
  async list(context: HouseholdContext, currencyCode?: string): Promise<PaymentMethodRecord[]> {
    const scopeCondition = or(
      isNull(paymentMethodsTable.householdId),
      eq(paymentMethodsTable.householdId, context.householdId),
    );
    const currencyCondition = currencyCode
      ? or(isNull(paymentMethodsTable.currencyId), eq(paymentMethodsTable.currencyId, currencyCode))
      : undefined;

    return db
      .select()
      .from(paymentMethodsTable)
      .where(currencyCondition ? and(scopeCondition, currencyCondition) : scopeCondition)
      .orderBy(
        asc(paymentMethodsTable.name),
        asc(paymentMethodsTable.code),
        asc(paymentMethodsTable.currencyId),
      );
  }

  async listPage(
    context: HouseholdContext,
    query: ListPaymentMethodsQuery,
  ): Promise<DbListPage<PaymentMethodRecord>> {
    const where = buildPaymentMethodsListWhere(context.householdId, query);
    const orderBy = buildPaymentMethodsListOrder(query);
    const { limit, offset } = getPagination(query);
    const [countRow, rows] = await Promise.all([
      db.select({ count: sql<number>`count(*)::integer` }).from(paymentMethodsTable).where(where),
      db
        .select()
        .from(paymentMethodsTable)
        .where(where)
        .orderBy(...orderBy)
        .limit(limit)
        .offset(offset),
    ]);

    return {
      rows,
      totalCount: countRow[0]?.count ?? 0,
    };
  }

  async findByCode(
    context: HouseholdContext,
    code: string,
    currencyCode?: string | null,
  ): Promise<PaymentMethodRecord | undefined> {
    const rows = await db
      .select()
      .from(paymentMethodsTable)
      .where(
        and(
          eq(paymentMethodsTable.householdId, context.householdId),
          eq(paymentMethodsTable.code, code),
          currencyCode
            ? eq(paymentMethodsTable.currencyId, currencyCode)
            : isNull(paymentMethodsTable.currencyId),
        ),
      )
      .limit(1);

    return rows[0];
  }

  async create(
    context: HouseholdContext,
    values: CreatePaymentMethodValues,
  ): Promise<PaymentMethodRecord> {
    const rows = await db
      .insert(paymentMethodsTable)
      .values({
        householdId: context.householdId,
        code: values.code,
        name: values.name,
        currencyId: values.currencyId ?? null,
        translationKey: null,
        color: values.color ?? null,
        icon: values.icon ?? null,
      })
      .returning();

    return rows[0];
  }

  async get(id: string, context: HouseholdContext): Promise<PaymentMethodRecord | undefined> {
    const rows = await db
      .select()
      .from(paymentMethodsTable)
      .where(
        and(
          eq(paymentMethodsTable.id, id),
          eq(paymentMethodsTable.householdId, context.householdId),
        ),
      )
      .limit(1);

    return rows[0];
  }

  async update(
    id: string,
    context: HouseholdContext,
    values: Partial<CreatePaymentMethodValues>,
  ): Promise<PaymentMethodRecord | undefined> {
    const rows = await db
      .update(paymentMethodsTable)
      .set({
        code: values.code,
        name: values.name,
        currencyId: values.currencyId,
        color: values.color,
        icon: values.icon,
        updatedAt: now(),
      })
      .where(
        and(
          eq(paymentMethodsTable.id, id),
          eq(paymentMethodsTable.householdId, context.householdId),
        ),
      )
      .returning();

    return rows[0];
  }

  async delete(id: string, context: HouseholdContext): Promise<PaymentMethodRecord | undefined> {
    const rows = await db
      .delete(paymentMethodsTable)
      .where(
        and(
          eq(paymentMethodsTable.id, id),
          eq(paymentMethodsTable.householdId, context.householdId),
        ),
      )
      .returning();

    return rows[0];
  }

  async findAvailableByCode(
    context: HouseholdContext,
    code: string,
    currencyCode: string,
  ): Promise<
    | {
        id: string;
        code: string;
        name: string;
        currencyCode: string | null;
      }
    | undefined
  > {
    const rows = await db
      .select({
        id: paymentMethodsTable.id,
        code: paymentMethodsTable.code,
        name: paymentMethodsTable.name,
        currencyCode: paymentMethodsTable.currencyId,
      })
      .from(paymentMethodsTable)
      .where(
        and(
          eq(paymentMethodsTable.code, code),
          or(
            isNull(paymentMethodsTable.householdId),
            eq(paymentMethodsTable.householdId, context.householdId),
          ),
          or(
            isNull(paymentMethodsTable.currencyId),
            eq(paymentMethodsTable.currencyId, currencyCode),
          ),
        ),
      )
      .orderBy(
        sql`case when ${paymentMethodsTable.currencyId} = ${currencyCode} then 0 else 1 end`,
        sql`case when ${paymentMethodsTable.householdId} = ${context.householdId} then 0 else 1 end`,
        asc(paymentMethodsTable.code),
      )
      .limit(1);

    return rows[0];
  }
}

export const paymentMethodsRepository = new PaymentMethodsRepository();
