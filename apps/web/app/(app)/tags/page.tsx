"use client"

import {
  Delete02Icon,
  MoreHorizontalIcon,
  PencilEdit02Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import * as React from "react"
import { DataTableSearchInput } from "@/components/data-table/data-table-search-input"
import { InternalPageLayout } from "@/components/finance/internal-page-layout"
import { ItemReveal, SectionReveal } from "@/components/motion/reveal"
import { PERMISSIONS, PermissionButton, useCan } from "@/components/permissions"
import { DeleteTagModal } from "@/components/tags/delete-tag-modal"
import { TagSheet } from "@/components/tags/tag-sheet"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Icon } from "@/components/ui/icon"
import { useApiParams } from "@/hooks/use-api-params"
import { useEntityDisclosure } from "@/hooks/use-disclosure"
import { MAX_PER_PAGE } from "@/interfaces/api"
import type { Tag } from "@/interfaces/tag"
import { useTagsQuery } from "@/queries/tags/use-tags-query"

import { TagsEmpty } from "./_empty"
import { TagsError } from "./_error"
import { TagsLoading } from "./_loading"

function TagRow({
  tag,
  canUpdate,
  canDelete,
  onEdit,
  onDelete,
}: {
  tag: Tag
  canUpdate: boolean
  canDelete: boolean
  onEdit: (tag: Tag) => void
  onDelete: (tag: Tag) => void
}) {
  const hasActions = canUpdate || canDelete

  return (
    <div className="group flex items-center gap-2 rounded-lg py-1.5 pr-1.5 pl-1 transition-colors hover:bg-muted/50">
      <Icon name={tag.icon} color={tag.color} variant="chip" size="sm" />

      <button
        type="button"
        disabled={!canUpdate}
        onClick={() => canUpdate && onEdit(tag)}
        className="min-w-0 flex-1 truncate text-left text-sm disabled:cursor-default"
      >
        {tag.name}
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
              <span className="sr-only">Tag actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            {canUpdate ? (
              <DropdownMenuItem onSelect={() => onEdit(tag)}>
                <HugeiconsIcon icon={PencilEdit02Icon} strokeWidth={2} />
                Edit
              </DropdownMenuItem>
            ) : null}
            {canDelete ? (
              <DropdownMenuItem
                variant="destructive"
                onSelect={() => onDelete(tag)}
              >
                <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} />
                Delete
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </div>
  )
}

export default function TagsPage() {
  const can = useCan()
  const canUpdate = can(PERMISSIONS.TAGS_UPDATE)
  const canDelete = can(PERMISSIONS.TAGS_DELETE)

  const { search, setSearch, normalizedSearch, hasFilters } = useApiParams()
  const createEdit = useEntityDisclosure<Tag>()
  const deleteDisclosure = useEntityDisclosure<Tag>()

  const query = useTagsQuery({ perPage: MAX_PER_PAGE })
  const tags = React.useMemo(() => query.data?.data ?? [], [query.data])

  const visibleTags = React.useMemo(() => {
    if (!normalizedSearch) {
      return tags
    }

    return tags.filter((tag) =>
      tag.name.toLowerCase().includes(normalizedSearch),
    )
  }, [tags, normalizedSearch])

  let content: React.ReactNode

  if (query.isPending) {
    content = <TagsLoading />
  } else if (query.isError) {
    content = (
      <TagsError
        message={
          query.error.message ||
          "An unexpected error occurred while loading this page."
        }
        onRetry={() => void query.refetch()}
      />
    )
  } else if (tags.length === 0) {
    content = <TagsEmpty hasFilters={false} onCreate={createEdit.onCreate} />
  } else if (visibleTags.length === 0) {
    content = (
      <TagsEmpty hasFilters={hasFilters} onCreate={createEdit.onCreate} />
    )
  } else {
    content = (
      <SectionReveal className="space-y-0.5">
        {visibleTags.map((tag) => (
          <TagRow
            key={tag.id}
            tag={tag}
            canUpdate={canUpdate}
            canDelete={canDelete}
            onEdit={createEdit.onEdit}
            onDelete={deleteDisclosure.onEdit}
          />
        ))}
      </SectionReveal>
    )
  }

  return (
    <InternalPageLayout
      title="Tags"
      actions={
        <PermissionButton
          permission={PERMISSIONS.TAGS_CREATE}
          deniedMessage="Your household role cannot create tags."
          onClick={createEdit.onCreate}
        >
          Add tag
        </PermissionButton>
      }
    >
      <ItemReveal className="flex flex-wrap items-center gap-2">
        <DataTableSearchInput
          value={search}
          placeholder="Search tags..."
          className="max-w-xs"
          onChange={(event) => setSearch(event.target.value)}
        />
      </ItemReveal>

      {content}

      <TagSheet
        open={createEdit.isOpen}
        onOpenChange={createEdit.setIsOpen}
        tag={createEdit.entity}
      />
      <DeleteTagModal
        open={deleteDisclosure.isOpen}
        onOpenChange={deleteDisclosure.setIsOpen}
        tag={deleteDisclosure.entity}
      />
    </InternalPageLayout>
  )
}
