"use client";

import { AmountDisplay, ProductDisplay } from "@/components/display";
import { SidePanelDetailRow, SidePanelSection } from "@/components/side-panel/side-panel-section";
import { useTransactionItemsQuery } from "@/queries/transactions/use-transaction-items-query";

/** What the transaction bought, if anything was listed. Renders nothing when there are no items. */
export function TransactionItemsList({
  transactionId,
  currencyCode,
  precision,
}: {
  transactionId: string;
  currencyCode: string;
  precision: number;
}) {
  const query = useTransactionItemsQuery(transactionId);
  const items = query.data ?? [];
  if (items.length === 0) return null;

  return (
    <SidePanelSection title="Items">
      {items.map((item) => (
        <SidePanelDetailRow key={item.id} label={`${item.quantity} ×`}>
          <div className="flex items-center justify-end gap-3">
            <ProductDisplay product={item} size="xs" />
            <AmountDisplay
              amount={item.unitPrice * item.quantity}
              currencyCode={currencyCode}
              precision={precision}
              showSign={false}
              size="xs"
            />
          </div>
        </SidePanelDetailRow>
      ))}
    </SidePanelSection>
  );
}
