"use client";

import { Delete02Icon, MoreHorizontalIcon, PencilEdit02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { Merchant } from "@luraba/contracts";
import { MAX_PER_PAGE } from "@luraba/contracts";
import * as React from "react";
import { DataTableSearchInput } from "@/components/data-table/data-table-search-input";
import { MerchantDisplay } from "@/components/display";
import { InternalPageLayout } from "@/components/finance/internal-page-layout";
import { DeleteMerchantModal } from "@/components/merchants/delete-merchant-modal";
import { MerchantSheet } from "@/components/merchants/merchant-sheet";
import { ItemReveal, SectionReveal } from "@/components/motion/reveal";
import { PERMISSIONS, PermissionButton, useCan } from "@/components/permissions";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useApiParams } from "@/hooks/use-api-params";
import { useEntityDisclosure } from "@/hooks/use-disclosure";
import { useMerchantsQuery } from "@/queries/merchants/use-merchants-query";

import { MerchantsEmpty } from "./_empty";
import { MerchantsError } from "./_error";
import { MerchantsLoading } from "./_loading";

function MerchantRow({
  merchant,
  canUpdate,
  canDelete,
  onEdit,
  onDelete,
}: {
  merchant: Merchant;
  canUpdate: boolean;
  canDelete: boolean;
  onEdit: (merchant: Merchant) => void;
  onDelete: (merchant: Merchant) => void;
}) {
  const hasActions = canUpdate || canDelete;

  return (
    <div className="group flex items-center gap-2 rounded-lg py-1.5 pr-1.5 pl-1 transition-colors hover:bg-muted/50">
      <button
        type="button"
        disabled={!canUpdate}
        onClick={() => canUpdate && onEdit(merchant)}
        className="min-w-0 flex-1 text-left disabled:cursor-default"
      >
        <MerchantDisplay merchant={merchant} size="md" detail="domain" />
      </button>

      {hasActions ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="opacity-0 transition-opacity group-hover:opacity-100 data-[state=open]:opacity-100"
            >
              <HugeiconsIcon icon={MoreHorizontalIcon} strokeWidth={2} />
              <span className="sr-only">Merchant actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            {canUpdate ? (
              <DropdownMenuItem onSelect={() => onEdit(merchant)}>
                <HugeiconsIcon icon={PencilEdit02Icon} strokeWidth={2} />
                Edit
              </DropdownMenuItem>
            ) : null}
            {canDelete ? (
              <DropdownMenuItem variant="destructive" onSelect={() => onDelete(merchant)}>
                <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} />
                Delete
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </div>
  );
}

export default function MerchantsPage() {
  const can = useCan();
  const canUpdate = can(PERMISSIONS.MERCHANTS_UPDATE);
  const canDelete = can(PERMISSIONS.MERCHANTS_DELETE);

  const { search, setSearch, normalizedSearch, hasFilters } = useApiParams();
  const createEdit = useEntityDisclosure<Merchant>();
  const deleteDisclosure = useEntityDisclosure<Merchant>();

  const query = useMerchantsQuery({ perPage: MAX_PER_PAGE });
  const merchants = React.useMemo(() => query.data?.data ?? [], [query.data]);

  const visibleMerchants = React.useMemo(() => {
    if (!normalizedSearch) {
      return merchants;
    }

    return merchants.filter((merchant) => merchant.name.toLowerCase().includes(normalizedSearch));
  }, [merchants, normalizedSearch]);

  let content: React.ReactNode;

  if (query.isPending) {
    content = <MerchantsLoading />;
  } else if (query.isError) {
    content = (
      <MerchantsError
        message={query.error.message || "An unexpected error occurred while loading this page."}
        onRetry={() => void query.refetch()}
      />
    );
  } else if (merchants.length === 0) {
    content = <MerchantsEmpty hasFilters={false} onCreate={createEdit.onCreate} />;
  } else if (visibleMerchants.length === 0) {
    content = <MerchantsEmpty hasFilters={hasFilters} onCreate={createEdit.onCreate} />;
  } else {
    content = (
      <SectionReveal className="space-y-0.5">
        {visibleMerchants.map((merchant) => (
          <MerchantRow
            key={merchant.id}
            merchant={merchant}
            canUpdate={canUpdate}
            canDelete={canDelete}
            onEdit={createEdit.onEdit}
            onDelete={deleteDisclosure.onEdit}
          />
        ))}
      </SectionReveal>
    );
  }

  return (
    <InternalPageLayout
      title="Merchants"
      subtitle="The shops and services you pay, with their logos."
      actions={
        <PermissionButton
          permission={PERMISSIONS.MERCHANTS_CREATE}
          deniedMessage="Your household role cannot create merchants."
          onClick={createEdit.onCreate}
        >
          Add merchant
        </PermissionButton>
      }
    >
      <ItemReveal className="flex flex-wrap items-center gap-2">
        <DataTableSearchInput
          value={search}
          placeholder="Search merchants..."
          className="max-w-xs"
          onChange={(event) => setSearch(event.target.value)}
        />
      </ItemReveal>

      {content}

      <MerchantSheet
        open={createEdit.isOpen}
        onOpenChange={createEdit.setIsOpen}
        merchant={createEdit.entity}
      />
      <DeleteMerchantModal
        open={deleteDisclosure.isOpen}
        onOpenChange={deleteDisclosure.setIsOpen}
        merchant={deleteDisclosure.entity}
      />
    </InternalPageLayout>
  );
}
