import type { AccountDetails } from "@luraba/contracts"
import type { ReactNode } from "react"
import { MoneyValue } from "@/components/finance/money-value"
import { Typography } from "@/components/ui/typography"
import { formatAccountSubtypeLabel } from "@/lib/accounts"
import { formatShortDate } from "@/lib/format"

function Detail({ label, value }: { label: string; value: ReactNode }) {
  if (value === null || value === undefined || value === "") return null

  return (
    <div className="flex items-start justify-between gap-6 border-b border-border/60 py-3 last:border-b-0">
      <Typography variant="small-muted">{label}</Typography>
      <div className="text-right text-sm text-foreground">{value}</div>
    </div>
  )
}

export function AccountProfileDetails({
  account,
  language,
}: {
  account: AccountDetails
  language: string
}) {
  const details = account.details
  const money = (amount: number | null) =>
    amount === null ? null : (
      <MoneyValue
        amount={amount}
        currencyCode={account.currencyCode}
        language={language}
      />
    )

  return (
    <div>
      <Detail
        label="Subtype"
        value={formatAccountSubtypeLabel(details.subtype)}
      />
      {details.kind === "crypto" ? (
        <>
          <Detail label="Network" value={details.network} />
          <Detail label="Wallet address" value={details.walletAddress} />
        </>
      ) : null}
      {details.kind === "property" ? (
        <>
          <Detail
            label="Address"
            value={[
              details.addressLine1,
              details.addressLine2,
              details.city,
              details.region,
              details.postalCode,
              details.countryCode,
            ]
              .filter(Boolean)
              .join(", ")}
          />
          <Detail
            label="Area"
            value={
              details.area === null
                ? null
                : `${details.area.toLocaleString()} ${details.areaUnit ?? ""}`
            }
          />
          <Detail label="Year built" value={details.yearBuilt} />
        </>
      ) : null}
      {details.kind === "vehicle" ? (
        <>
          <Detail
            label="Vehicle"
            value={[details.year, details.make, details.model, details.trim]
              .filter(Boolean)
              .join(" ")}
          />
          <Detail label="VIN" value={details.vin} />
          <Detail label="License plate" value={details.licensePlate} />
          <Detail
            label="Mileage"
            value={
              details.mileage === null
                ? null
                : `${details.mileage.toLocaleString()} ${details.mileageUnit ?? ""}`
            }
          />
        </>
      ) : null}
      {details.kind === "loan" ? (
        <>
          <Detail
            label="Original principal"
            value={money(details.originalPrincipal)}
          />
          <Detail
            label="Annual interest rate"
            value={
              details.annualInterestRate === null
                ? null
                : `${details.annualInterestRate}%`
            }
          />
          <Detail
            label="Rate type"
            value={
              details.interestRateType
                ? formatAccountSubtypeLabel(details.interestRateType)
                : null
            }
          />
          <Detail
            label="Term"
            value={details.termMonths ? `${details.termMonths} months` : null}
          />
          <Detail
            label="Start date"
            value={
              details.startDate
                ? formatShortDate(details.startDate, language)
                : null
            }
          />
          <Detail
            label="Maturity date"
            value={
              details.maturityDate
                ? formatShortDate(details.maturityDate, language)
                : null
            }
          />
          <Detail label="Payment amount" value={money(details.paymentAmount)} />
          <Detail
            label="Payment frequency"
            value={
              details.paymentFrequency
                ? formatAccountSubtypeLabel(details.paymentFrequency)
                : null
            }
          />
        </>
      ) : null}
    </div>
  )
}
