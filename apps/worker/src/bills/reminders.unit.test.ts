import { describe, expect, it } from "vitest";
import { buildReminderMessage, planReminder } from "./reminders.js";

const d = (value: string) => new Date(`${value}T00:00:00.000Z`);
const base = { createdDate: d("2026-01-01"), remindDaysBefore: null };

describe("planReminder", () => {
  it("reminds on the due date", () => {
    expect(
      planReminder({ ...base, dueDate: d("2026-03-10"), today: d("2026-03-10") }),
    ).toMatchObject({
      event: "bill.due_soon",
      daysBefore: 0,
    });
  });

  it("reminds early only on the configured day", () => {
    const input = { ...base, remindDaysBefore: 3, dueDate: d("2026-03-10") };
    expect(planReminder({ ...input, today: d("2026-03-07") })?.event).toBe("bill.due_soon");
    expect(planReminder({ ...input, today: d("2026-03-08") })).toBeUndefined();
  });

  it("nags when overdue on milestones and keeps the milestone after a missed day", () => {
    const input = { ...base, dueDate: d("2026-03-10") };
    expect(planReminder({ ...input, today: d("2026-03-11") })).toMatchObject({ milestone: 1 });
    expect(planReminder({ ...input, today: d("2026-03-14") })).toMatchObject({ milestone: 3 });
    expect(planReminder({ ...input, today: d("2026-03-30") })).toMatchObject({ milestone: 7 });
  });

  it("ignores occurrences from before the bill was created", () => {
    expect(
      planReminder({
        dueDate: d("2025-12-10"),
        today: d("2026-03-10"),
        createdDate: d("2026-01-01"),
        remindDaysBefore: null,
      }),
    ).toBeUndefined();
  });
});

describe("buildReminderMessage", () => {
  it("says you forgot to pay when overdue", () => {
    const reminder = { event: "bill.overdue", daysLate: 1, milestone: 1, key: "k" } as const;
    expect(
      buildReminderMessage(reminder, { name: "Water", amount: 8000, currencyCode: "BRL" }).title,
    ).toBe("You forgot to pay Water");
  });
});
