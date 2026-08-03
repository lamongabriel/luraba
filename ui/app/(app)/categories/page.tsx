"use client"

import {
  ArrowRight01Icon,
  Delete02Icon,
  MoreHorizontalIcon,
  PencilEdit02Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import * as React from "react"
import { CategorySheet } from "@/components/categories/category-sheet"
import { DeleteCategoryModal } from "@/components/categories/delete-category-modal"
import { FilterFaceted } from "@/components/filters/filter-faceted"
import { InternalPageLayout } from "@/components/finance/internal-page-layout"
import { ItemReveal, SectionReveal } from "@/components/motion/reveal"
import { PERMISSIONS, PermissionButton, useCan } from "@/components/permissions"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Icon } from "@/components/ui/icon"
import { Input } from "@/components/ui/input"
import { Typography } from "@/components/ui/typography"
import { useApiParams } from "@/hooks/use-api-params"
import { useEntityDisclosure } from "@/hooks/use-disclosure"
import { MAX_PER_PAGE } from "@/interfaces/api"
import type { Category, CategoryType } from "@/interfaces/category"
import { CATEGORY_TYPE_OPTIONS } from "@/lib/categories"
import { cn } from "@/lib/utils"
import { useCategoriesQuery } from "@/queries/categories/use-categories-query"

import { CategoriesEmpty } from "./_empty"
import { CategoriesError } from "./_error"
import { CategoriesLoading } from "./_loading"

const TYPE_KEY = "type"
const CATEGORY_API_FILTERS = {
  [TYPE_KEY]: { type: "stringArray" },
} as const

type CategoryNode = {
  category: Category
  children: CategoryNode[]
}

const TYPE_GROUPS: ReadonlyArray<{ type: CategoryType; title: string }> = [
  { type: "income", title: "Income" },
  { type: "expense", title: "Expense" },
]

/** Builds a parent→children tree from the flat category list (defensive to orphans). */
function buildTree(categories: Category[]): CategoryNode[] {
  const byId = new Map(categories.map((category) => [category.id, category]))
  const childrenByParent = new Map<string, Category[]>()
  const roots: Category[] = []

  for (const category of categories) {
    const parentId = category.parentId
    // Treat a parent that is missing from the set as a root (orphan fallback).
    if (parentId && byId.has(parentId)) {
      const bucket = childrenByParent.get(parentId) ?? []
      bucket.push(category)
      childrenByParent.set(parentId, bucket)
    } else {
      roots.push(category)
    }
  }

  const toNode = (category: Category): CategoryNode => ({
    category,
    children: (childrenByParent.get(category.id) ?? []).map(toNode),
  })

  return roots.map(toNode)
}

function CategoryRow({
  node,
  depth,
  canUpdate,
  canDelete,
  onEdit,
  onDelete,
}: {
  node: CategoryNode
  depth: number
  canUpdate: boolean
  canDelete: boolean
  onEdit: (category: Category) => void
  onDelete: (category: Category) => void
}) {
  const [expanded, setExpanded] = React.useState(true)
  const { category, children } = node
  const hasChildren = children.length > 0
  const hasActions = canUpdate || canDelete

  return (
    <>
      <div
        className="group flex items-center gap-2 rounded-lg py-1.5 pr-1.5 transition-colors hover:bg-muted/50"
        style={{ paddingLeft: `${depth * 1.25 + 0.25}rem` }}
      >
        {hasChildren ? (
          <button
            type="button"
            aria-label={expanded ? "Collapse" : "Expand"}
            aria-expanded={expanded}
            onClick={() => setExpanded((value) => !value)}
            className="flex size-4 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:text-foreground"
          >
            <HugeiconsIcon
              icon={ArrowRight01Icon}
              strokeWidth={2}
              className={cn(
                "size-3.5 transition-transform",
                expanded && "rotate-90",
              )}
            />
          </button>
        ) : (
          <span className="size-4 shrink-0" />
        )}

        <Icon
          name={category.icon}
          color={category.color}
          variant="chip"
          size="sm"
        />

        <button
          type="button"
          disabled={!canUpdate}
          onClick={() => canUpdate && onEdit(category)}
          className="min-w-0 flex-1 truncate text-left text-sm disabled:cursor-default"
        >
          {category.name}
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
                <span className="sr-only">Category actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              {canUpdate ? (
                <DropdownMenuItem onSelect={() => onEdit(category)}>
                  <HugeiconsIcon icon={PencilEdit02Icon} strokeWidth={2} />
                  Edit
                </DropdownMenuItem>
              ) : null}
              {canDelete ? (
                <DropdownMenuItem
                  variant="destructive"
                  onSelect={() => onDelete(category)}
                >
                  <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} />
                  Delete
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>

      {hasChildren && expanded
        ? children.map((child) => (
            <CategoryRow
              key={child.category.id}
              node={child}
              depth={depth + 1}
              canUpdate={canUpdate}
              canDelete={canDelete}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))
        : null}
    </>
  )
}

function CategoryGroup({
  title,
  nodes,
  canUpdate,
  canDelete,
  onEdit,
  onDelete,
}: {
  title: string
  nodes: CategoryNode[]
  canUpdate: boolean
  canDelete: boolean
  onEdit: (category: Category) => void
  onDelete: (category: Category) => void
}) {
  if (nodes.length === 0) {
    return null
  }

  return (
    <SectionReveal className="space-y-1">
      <Typography as="h2" variant="eyebrow" className="px-1">
        {title}
      </Typography>
      <div>
        {nodes.map((node) => (
          <CategoryRow
            key={node.category.id}
            node={node}
            depth={0}
            canUpdate={canUpdate}
            canDelete={canDelete}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>
    </SectionReveal>
  )
}

export default function CategoriesPage() {
  const can = useCan()
  const canUpdate = can(PERMISSIONS.CATEGORIES_UPDATE)
  const canDelete = can(PERMISSIONS.CATEGORIES_DELETE)

  const {
    filters: { [TYPE_KEY]: typeFilter },
    hasFilters,
    normalizedSearch,
    search,
    setFilter,
    setSearch,
  } = useApiParams({ filters: CATEGORY_API_FILTERS })

  const setTypeFilter = React.useCallback(
    (value: string[]) => {
      setFilter(TYPE_KEY, value)
    },
    [setFilter],
  )

  const createEdit = useEntityDisclosure<Category>()
  const deleteDisclosure = useEntityDisclosure<Category>()

  const query = useCategoriesQuery({ perPage: MAX_PER_PAGE })
  const categories = React.useMemo(() => query.data?.data ?? [], [query.data])

  // Filter for the search term, but keep ancestors of matches so nesting holds.
  const visibleCategories = React.useMemo(() => {
    if (!normalizedSearch) {
      return categories
    }

    const byId = new Map(categories.map((category) => [category.id, category]))
    const keep = new Set<string>()

    for (const category of categories) {
      if (category.name.toLowerCase().includes(normalizedSearch)) {
        keep.add(category.id)
        let parentId = category.parentId
        while (parentId && byId.has(parentId) && !keep.has(parentId)) {
          keep.add(parentId)
          parentId = byId.get(parentId)?.parentId ?? null
        }
      }
    }

    return categories.filter((category) => keep.has(category.id))
  }, [categories, normalizedSearch])

  const activeTypes =
    typeFilter.length > 0
      ? TYPE_GROUPS.filter((group) => typeFilter.includes(group.type))
      : TYPE_GROUPS

  const groups = activeTypes.map((group) => ({
    ...group,
    nodes: buildTree(
      visibleCategories.filter((category) => category.type === group.type),
    ),
  }))

  const hasAnyVisible = groups.some((group) => group.nodes.length > 0)

  let content: React.ReactNode

  if (query.isPending) {
    content = <CategoriesLoading />
  } else if (query.isError) {
    content = (
      <CategoriesError
        message={
          query.error.message ||
          "An unexpected error occurred while loading this page."
        }
        onRetry={() => void query.refetch()}
      />
    )
  } else if (categories.length === 0) {
    content = (
      <CategoriesEmpty hasFilters={false} onCreate={createEdit.onCreate} />
    )
  } else if (!hasAnyVisible) {
    content = (
      <CategoriesEmpty hasFilters={hasFilters} onCreate={createEdit.onCreate} />
    )
  } else {
    content = (
      <div className="space-y-6">
        {groups.map((group) => (
          <CategoryGroup
            key={group.type}
            title={group.title}
            nodes={group.nodes}
            canUpdate={canUpdate}
            canDelete={canDelete}
            onEdit={createEdit.onEdit}
            onDelete={deleteDisclosure.onEdit}
          />
        ))}
      </div>
    )
  }

  return (
    <InternalPageLayout
      title="Categories"
      actions={
        <PermissionButton
          permission={PERMISSIONS.CATEGORIES_CREATE}
          deniedMessage="Your household role cannot create categories."
          onClick={createEdit.onCreate}
        >
          Add category
        </PermissionButton>
      }
    >
      <ItemReveal className="flex flex-wrap items-center gap-2">
        <Input
          value={search}
          placeholder="Search categories..."
          className="h-8 max-w-xs"
          onChange={(event) => setSearch(event.target.value)}
        />
        <FilterFaceted
          title="Type"
          multiple
          value={typeFilter}
          options={CATEGORY_TYPE_OPTIONS.map((option) => ({
            label: option.label,
            value: option.value,
          }))}
          onValueChange={(value) =>
            setTypeFilter(Array.isArray(value) ? value : value ? [value] : [])
          }
        />
      </ItemReveal>

      {content}

      <CategorySheet
        open={createEdit.isOpen}
        onOpenChange={createEdit.setIsOpen}
        category={createEdit.entity}
      />
      <DeleteCategoryModal
        open={deleteDisclosure.isOpen}
        onOpenChange={deleteDisclosure.setIsOpen}
        category={deleteDisclosure.entity}
      />
    </InternalPageLayout>
  )
}
