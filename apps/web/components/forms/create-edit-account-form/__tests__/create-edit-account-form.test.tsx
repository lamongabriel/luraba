import type { AccountDetails } from "@luraba/contracts";
import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import type * as React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CreateEditAccountForm } from "@/components/forms/create-edit-account-form/create-edit-account-form";
import { PERMISSIONS } from "@/components/permissions";
import { TooltipProvider } from "@/components/ui/tooltip";
import { queryClient } from "@/lib/query-client";
import { server } from "@/test/msw/server";

const apiUrl = "http://localhost:3001/api/v1";

function apiSuccess<TData>(data: TData) {
  return HttpResponse.json({ success: true, data });
}

function apiList<TData>(data: TData[]) {
  return HttpResponse.json({
    success: true,
    data,
    meta: {
      pagination: {
        page: 1,
        perPage: 20,
        totalCount: data.length,
        totalPages: data.length ? 1 : 0,
      },
    },
  });
}

function renderCreateEditAccountForm(
  props: Partial<React.ComponentProps<typeof CreateEditAccountForm>> = {},
) {
  return render(
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <CreateEditAccountForm
          defaultCurrencyCode="USD"
          onCancel={vi.fn()}
          onSuccess={vi.fn()}
          {...props}
        />
      </TooltipProvider>
    </QueryClientProvider>,
  );
}

function buildAccount(
  details: AccountDetails["details"],
  overrides: Partial<AccountDetails> = {},
): AccountDetails {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    balance: 0,
    classification:
      details.kind === "loan" || details.kind === "other_liability" ? "liability" : "asset",
    createdAt: "2026-01-01T00:00:00.000Z",
    currencyCode: "USD",
    details,
    institutionDomain: null,
    institutionLogoUrl: null,
    institutionName: "Chase",
    name: "Main account",
    notes: null,
    type: details.kind,
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("CreateEditAccountForm", () => {
  beforeEach(() => {
    queryClient.clear();
    Element.prototype.scrollIntoView = vi.fn();
    Element.prototype.hasPointerCapture = vi.fn(() => false);
    Element.prototype.releasePointerCapture = vi.fn();
    Element.prototype.setPointerCapture = vi.fn();
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );
    vi.stubGlobal("matchMedia", () => ({
      addEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
      matches: false,
      media: "",
      onchange: null,
      removeEventListener: vi.fn(),
    }));
    server.use(
      http.get(`${apiUrl}/auth/me`, () =>
        apiSuccess({
          user: {
            id: "user-1",
            email: "owner@example.com",
            name: "Owner",
            image: null,
            emailVerified: true,
            defaultHouseholdId: "household-1",
            lastActiveAt: null,
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z",
          },
          household: {
            id: "household-1",
            name: "Main household",
            role: "owner",
            permissions: [PERMISSIONS.ACCOUNTS_CREATE],
            settings: {
              defaultCurrencyId: "currency-usd",
              countryCode: "US",
              timezone: "America/New_York",
              budgetMonthStartsOn: 1,
              creditExpenseTiming: "spend_month",
              creditInstallmentBudgetMode: "per_installment",
            },
          },
        }),
      ),
      http.get(`${apiUrl}/currencies`, () => apiList([{ code: "USD", symbol: "$", precision: 2 }])),
      http.get(`${apiUrl}/accounts`, () => apiList([])),
      http.get(`${apiUrl}/reference-data/locations`, () =>
        apiSuccess({ countries: [], timezones: [] }),
      ),
    );
  });

  it("renders loan-specific fields when the selected type is loan", async () => {
    const user = userEvent.setup();

    renderCreateEditAccountForm();

    await user.click(await screen.findByRole("combobox", { name: "Type" }));
    await user.click(screen.getByRole("option", { name: "Loan" }));

    const details = screen.getByText("Account details").closest("section");
    expect(details).not.toBeNull();
    expect(within(details as HTMLElement).getByLabelText("Original principal")).toBeVisible();
    expect(within(details as HTMLElement).getByLabelText("Rate type")).toBeVisible();
    expect(within(details as HTMLElement).getByLabelText("Secured asset")).toBeVisible();
  });

  it.each([
    [
      "crypto",
      buildAccount({
        kind: "crypto",
        subtype: "wallet",
        network: "Ethereum",
        walletAddress: "0xabc",
      }),
      ["Network", "Wallet address"],
    ],
    [
      "property",
      buildAccount({
        kind: "property",
        subtype: "house",
        addressLine1: "123 Main St",
        addressLine2: null,
        area: 120,
        areaUnit: "sqm",
        city: "Sao Paulo",
        countryCode: "BR",
        postalCode: "01000",
        region: "SP",
        yearBuilt: 2020,
      }),
      ["Address", "Area", "Year built"],
    ],
    [
      "vehicle",
      buildAccount({
        kind: "vehicle",
        subtype: "car",
        licensePlate: "ABC1234",
        make: "Toyota",
        mileage: 12_000,
        mileageUnit: "km",
        model: "Corolla",
        trim: "XEi",
        vin: "VIN123",
        year: 2024,
      }),
      ["Make", "Model", "VIN", "Mileage"],
    ],
    [
      "loan",
      buildAccount({
        kind: "loan",
        subtype: "personal",
        annualInterestRate: 9.25,
        interestRateType: "fixed",
        maturityDate: "2028-01-01",
        originalPrincipal: 100_000,
        paymentAmount: 4_500,
        paymentFrequency: "monthly",
        securedAssetAccountId: null,
        startDate: "2026-01-01",
        termMonths: 24,
      }),
      ["Original principal", "Annual interest rate", "Payment amount"],
    ],
  ] as const)(
    "renders %s edit fields with immutable type and currency context",
    async (_kind, account, labels) => {
      renderCreateEditAccountForm({ account });

      expect(await screen.findByText("Type cannot be changed after creation.")).toBeVisible();
      expect(screen.getByText("Currency cannot be changed after creation.")).toBeVisible();
      expect(screen.queryByLabelText("Opening balance")).not.toBeInTheDocument();

      for (const label of labels) {
        expect(screen.getByLabelText(label)).toBeVisible();
      }
    },
  );

  it("updates a typed account through the shared edit form", async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    let submittedBody: unknown;
    const account = buildAccount({
      kind: "property",
      subtype: "house",
      addressLine1: "123 Main St",
      addressLine2: null,
      area: 120,
      areaUnit: "sqm",
      city: "Sao Paulo",
      countryCode: "BR",
      postalCode: "01000",
      region: "SP",
      yearBuilt: 2020,
    });

    server.use(
      http.patch(`${apiUrl}/accounts/${account.id}`, async ({ request }) => {
        submittedBody = await request.json();

        return apiSuccess({
          ...account,
          name: "Updated property",
        });
      }),
    );

    renderCreateEditAccountForm({ account, onSuccess });

    await user.clear(await screen.findByLabelText("Name"));
    await user.type(screen.getByLabelText("Name"), "Updated property");
    await user.clear(screen.getByLabelText("City"));
    await user.type(screen.getByLabelText("City"), "Rio de Janeiro");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    expect(submittedBody).toEqual(
      expect.objectContaining({
        name: "Updated property",
        details: expect.objectContaining({
          kind: "property",
          city: "Rio de Janeiro",
          subtype: "house",
        }),
      }),
    );
  });
});
