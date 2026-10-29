import {
  billOccurrencesTable as billOccurrences,
  billsTable as bills,
  householdMembers,
  households,
} from "@luraba/db";
import { addDays, formatISODate, getBillDueDates, getTodayInTimezone } from "@luraba/domain";
import type { createNotifier } from "@luraba/notifications";
import { and, eq, gte, isNull, lte } from "drizzle-orm";
import { db } from "../db.js";
import { logger } from "../logger.js";
import {
  buildReminderMessage,
  getLocalDate,
  getLocalHour,
  planReminder,
  REMINDER_HOUR,
} from "./reminders.js";

const HORIZON_DAYS = 90;
const REMINDER_WINDOW_DAYS = 14;

type Notifier = ReturnType<typeof createNotifier>;

/** Tops up open-ended bills so there are always upcoming occurrences to show and remind about. */
export async function generateOccurrences(): Promise<number> {
  const rows = await db
    .select({ bill: bills, timezone: households.timezone })
    .from(bills)
    .innerJoin(households, eq(households.id, bills.householdId))
    .where(and(eq(bills.status, "active"), isNull(bills.installmentCount)));

  let created = 0;

  for (const { bill, timezone } of rows) {
    const today = getTodayInTimezone(timezone);
    const values = getBillDueDates(bill, addDays(today, HORIZON_DAYS))
      .filter(({ dueDate }) => dueDate >= today)
      .map(({ dueDate, installmentNumber }) => ({
        billId: bill.id,
        dueDate,
        installmentNumber,
        expectedAmount: bill.expectedAmount,
      }));
    if (values.length === 0) continue;

    const inserted = await db
      .insert(billOccurrences)
      .values(values)
      .onConflictDoNothing()
      .returning({ id: billOccurrences.id });
    created += inserted.length;
  }

  if (created > 0) logger.info(`[bills] Generated ${created} occurrences`);
  return created;
}

async function getAudience(bill: {
  householdId: string;
  createdByUserId: string;
  audience: "owner" | "household";
}): Promise<string[]> {
  if (bill.audience === "owner") return [bill.createdByUserId];

  const members = await db
    .select({ userId: householdMembers.userId })
    .from(householdMembers)
    .where(eq(householdMembers.householdId, bill.householdId));
  return members.map((member) => member.userId);
}

/** Sends due-soon and overdue reminders. Safe to run often: every reminder carries a dedupe key. */
export async function sendBillReminders(notifier: Notifier, now = new Date()): Promise<number> {
  const windowStart = addDays(now, -(REMINDER_WINDOW_DAYS + 1));
  const windowEnd = addDays(now, REMINDER_WINDOW_DAYS + 1);

  const rows = await db
    .select({
      occurrence: billOccurrences,
      bill: bills,
      timezone: households.timezone,
    })
    .from(billOccurrences)
    .innerJoin(bills, eq(bills.id, billOccurrences.billId))
    .innerJoin(households, eq(households.id, bills.householdId))
    .where(
      and(
        eq(bills.status, "active"),
        isNull(billOccurrences.paidAt),
        isNull(billOccurrences.skippedAt),
        gte(billOccurrences.dueDate, windowStart),
        lte(billOccurrences.dueDate, windowEnd),
      ),
    );

  let sent = 0;

  for (const { occurrence, bill, timezone } of rows) {
    if (getLocalHour(timezone, now) < REMINDER_HOUR) continue;

    const today = getLocalDate(timezone, now);
    const reminder = planReminder({
      dueDate: occurrence.dueDate,
      today,
      remindDaysBefore: bill.remindDaysBefore,
      createdDate: getLocalDate(timezone, bill.createdAt),
    });
    if (!reminder) continue;

    const message = buildReminderMessage(reminder, {
      name: bill.name,
      amount: occurrence.expectedAmount,
      currencyCode: bill.currencyCode,
    });

    await notifier.notify({
      userIds: await getAudience(bill),
      eventType: reminder.event,
      ...message,
      url: `/bills/${bill.id}`,
      householdId: bill.householdId,
      data: {
        billId: bill.id,
        occurrenceId: occurrence.id,
        dueDate: formatISODate(occurrence.dueDate),
      },
      dedupeKey: `${reminder.key}:${occurrence.id}`,
    });
    sent += 1;
  }

  return sent;
}
