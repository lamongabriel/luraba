"use client"

import { ArrowDown01Icon, Tick02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import * as React from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Icon } from "@/components/ui/icon"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { MAX_PER_PAGE } from "@/interfaces/api"
import type { Tag } from "@/interfaces/tag"
import { cn } from "@/lib/utils"
import { useTagsQuery } from "@/queries/tags/use-tags-query"

export interface TagSelectControlProps {
  id: string
  value: string[]
  onChange: (value: string[]) => void
  placeholder?: string
  disabled?: boolean
  ariaInvalid?: boolean
  triggerClassName?: string
  popoverClassName?: string
  maxVisibleTags?: number
  dataRowAction?: boolean
}

/**
 * Raw multi-select tag combobox control (no `Controller`, no `Field`
 * wrapper). This is only meant to be rendered by `FormItem` (`type="tag"`) -
 * it is not intended to be used standalone outside of a form field context.
 */
export function TagSelectControl({
  id,
  value,
  onChange,
  placeholder = "Select tags",
  disabled,
  ariaInvalid,
  triggerClassName,
  popoverClassName,
  maxVisibleTags = 1,
  dataRowAction,
}: TagSelectControlProps) {
  const [open, setOpen] = React.useState(false)
  const tagsQuery = useTagsQuery({ perPage: MAX_PER_PAGE })
  const tags = tagsQuery.data?.data ?? []
  const tagById = new Map(tags.map((tag) => [tag.id, tag]))
  const isPending = tagsQuery.isPending
  const isDisabled = disabled || isPending

  const selectedIds = value
  const selectedTags = selectedIds
    .map((id) => tagById.get(id))
    .filter((tag): tag is Tag => Boolean(tag))
  const visibleSelectedTags = maxVisibleTags
    ? selectedTags.slice(0, maxVisibleTags)
    : selectedTags
  const hiddenTagCount = selectedTags.length - visibleSelectedTags.length

  const toggleTag = (tagId: string) => {
    const nextIds = selectedIds.includes(tagId)
      ? selectedIds.filter((id) => id !== tagId)
      : [...selectedIds, tagId]
    onChange(nextIds)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={isDisabled}
          aria-invalid={ariaInvalid}
          data-row-action={dataRowAction ? "true" : undefined}
          onPointerDown={
            dataRowAction ? (event) => event.stopPropagation() : undefined
          }
          onClick={
            dataRowAction ? (event) => event.stopPropagation() : undefined
          }
          className={cn(
            "h-7 min-h-7 w-full justify-between px-2 py-1 text-left font-normal",
            triggerClassName,
          )}
        >
          <span className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
            {selectedTags.length === 0 ? (
              <span className="text-muted-foreground">
                {isPending ? "Loading tags..." : placeholder}
              </span>
            ) : (
              visibleSelectedTags.map((tag) => (
                <Badge
                  key={tag.id}
                  variant="secondary"
                  className="h-5 max-w-40 rounded-md bg-muted/60 px-1.5 py-0.5 text-[0.65rem] font-normal text-foreground"
                >
                  <Icon
                    name={tag.icon}
                    color={tag.color}
                    variant="chip"
                    size="sm"
                    className="size-3.5"
                  />
                  <span className="truncate">{tag.name}</span>
                </Badge>
              ))
            )}
            {hiddenTagCount > 0 ? (
              <Badge variant="secondary" className="shrink-0">
                +{hiddenTagCount}
              </Badge>
            ) : null}
          </span>
          <HugeiconsIcon
            icon={ArrowDown01Icon}
            strokeWidth={2}
            className="size-3.5 shrink-0 text-muted-foreground"
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        data-row-action={dataRowAction ? "true" : undefined}
        onPointerDown={
          dataRowAction ? (event) => event.stopPropagation() : undefined
        }
        onClick={dataRowAction ? (event) => event.stopPropagation() : undefined}
        className={cn(
          "max-h-[min(24rem,var(--radix-popover-content-available-height))] w-[min(20rem,calc(100vw-1rem))] max-w-[calc(100vw-1rem)] p-0",
          popoverClassName,
        )}
        align="start"
      >
        <Command>
          <CommandInput placeholder="Search tags..." />
          <CommandList className="max-h-[min(28rem,var(--radix-popover-content-available-height))]">
            <CommandEmpty>No tags found.</CommandEmpty>
            <CommandGroup>
              {tags.map((tag) => {
                const selected = selectedIds.includes(tag.id)

                return (
                  <CommandItem
                    key={tag.id}
                    value={tag.name}
                    className="[&>svg:last-child]:hidden"
                    onSelect={() => toggleTag(tag.id)}
                  >
                    <div
                      className={cn(
                        "flex size-4 items-center justify-center rounded-sm border border-primary",
                        selected
                          ? "bg-primary text-primary-foreground"
                          : "opacity-50 [&_svg]:invisible",
                      )}
                    >
                      <HugeiconsIcon icon={Tick02Icon} strokeWidth={2} />
                    </div>
                    <Icon
                      name={tag.icon}
                      color={tag.color}
                      variant="chip"
                      size="sm"
                    />
                    <span className="truncate">{tag.name}</span>
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
