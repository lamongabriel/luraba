import { NotFoundError } from "@/shared/errors";
import { createAuthenticatedContext } from "@/test/auth";
import { createHousehold, createHouseholdMembership, createUser } from "@/test/factories";
import { authRepository } from "../auth.repository";
import * as authService from "../auth.service";

describe("auth service", () => {
  it("getMe returns the selected active household session", async () => {
    const context = await createAuthenticatedContext();
    const secondHousehold = await createHousehold(context.user.id, {
      name: "Travel Household",
      createdByUserId: context.user.id,
    });
    await createHouseholdMembership(secondHousehold.id, context.user.id, "admin");

    const session = await authService.getMe(context.user.id, secondHousehold.id);

    expect(session.user.id).toBe(context.user.id);
    expect(session.household.id).toBe(secondHousehold.id);
    expect(session.household.name).toBe("Travel Household");
    expect(session.household.role).toBe("admin");
  });

  it("getMyPreferences returns persisted preferences", async () => {
    const user = await createUser({
      preferredLanguage: "pt-BR",
      preferredCurrency: "BRL",
      preferredTimezone: "America/Sao_Paulo",
      preferredDateFormat: "DD/MM/YYYY",
      preferredPeriod: "current_month",
      preferredTheme: "system",
    });

    const preferences = await authService.getMyPreferences(user.id);

    expect(preferences.language).toBe("pt-BR");
    expect(preferences.currency).toBe("BRL");
    expect(preferences.timezone).toBe("America/Sao_Paulo");
  });

  it("updateMyPreferences persists changes and validates currency existence", async () => {
    const user = await createUser();

    const updated = await authService.updateMyPreferences(user.id, {
      currency: "USD",
      preferredTheme: "dark",
    });

    expect(updated.currency).toBe("USD");
    expect(updated.preferredTheme).toBe("dark");

    const stored = await authRepository.getUserPreferences(user.id);
    expect(stored?.currency).toBe("USD");
    expect(stored?.preferredTheme).toBe("dark");

    await expect(
      authService.updateMyPreferences(user.id, {
        currency: "ZZZ",
      }),
    ).rejects.toThrow(NotFoundError);
  });
});
