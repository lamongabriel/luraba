"use client"

import { HugeiconsIcon } from "@hugeicons/react"
import type { Column } from "@tanstack/react-table"

import { FilterFaceted } from "@/components/filters/filter-faceted"
import { MAX_PER_PAGE } from "@/interfaces/api"
import type { Tag } from "@/interfaces/tag"
import { DEFAULT_TAG_ICON, resolveTagIcon } from "@/lib/tags"
import { useTagsQuery } from "@/queries/tags/use-tags-query"
import type { Option } from "@/types/data-table"

/**
 * Builds a small svg icon component tinted with the tag color, matching the
 * `Option.icon` contract expected by FilterFaceted. Color lives only on the icon.
 */
function createTagOptionIcon(tag: Tag) {
  const icon = resolveTagIcon(tag.icon) ?? resolveTagIcon(DEFAULT_TAG_ICON)

  return function TagOptionIcon({
    strokeWidth: _strokeWidth,
    style,
    ...props
  }: React.ComponentProps<"svg">) {
    if (!icon) {
      return null
    }

    return (
      <HugeiconsIcon
        icon={icon}
        strokeWidth={2}
        {...props}
        style={{ color: tag.color ?? undefined, ...style }}
      />
    )
  }
}

function buildTagOptions(tags: Tag[]): Option[] {
  return tags.map((tag) => ({
    label: tag.name,
    value: tag.id,
    icon: createTagOptionIcon(tag),
  }))
}

type FilterTagProps<TData, TValue> =
  | {
      column: Column<TData, TValue>
      title?: string
      multiple?: boolean
    }
  | {
      value?: string | string[]
      onValueChange?: (value: string | string[] | undefined) => void
      title?: string
      multiple?: boolean
    }

/**
 * Faceted filter for tags. Fetches tags and renders each option with its
 * resolved icon tinted by the tag color. Reusable in tables (via `column`) or
 * as a controlled filter (via `value`/`onValueChange`).
 */
export function FilterTag<TData, TValue>(props: FilterTagProps<TData, TValue>) {
  const tagsQuery = useTagsQuery({ perPage: MAX_PER_PAGE })
  const options = buildTagOptions(tagsQuery.data?.data ?? [])
  const title = props.title ?? "Tag"
  const multiple = props.multiple ?? true

  if ("column" in props) {
    return (
      <FilterFaceted
        column={props.column}
        title={title}
        options={options}
        multiple={multiple}
      />
    )
  }

  return (
    <FilterFaceted
      value={props.value}
      onValueChange={props.onValueChange}
      title={title}
      options={options}
      multiple={multiple}
    />
  )
}
