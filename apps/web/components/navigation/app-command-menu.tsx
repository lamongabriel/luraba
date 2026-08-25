"use client"

import { Home01Icon, Search01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { usePathname, useRouter } from "next/navigation"
import * as React from "react"
import { type PermissionKey, useCan } from "@/components/permissions"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command"
import { Kbd, KbdGroup } from "@/components/ui/kbd"
import { Typography } from "@/components/ui/typography"
import { mainNav, userMenuLinks } from "@/lib/navigation"
import { cn } from "@/lib/utils"

type CommandEntry = {
  label: string
  href: string
  icon: typeof Home01Icon
  group: "Navigation" | "Preferences"
  keywords?: string[]
  permission?: PermissionKey
}

const commandEntries: CommandEntry[] = [
  {
    label: "Home",
    href: "/dashboard",
    icon: Home01Icon,
    group: "Navigation",
    keywords: ["dashboard"],
  },
  ...mainNav
    .filter((item) => item.href !== "/dashboard")
    .map((item) => ({
      label: item.title,
      href: item.href,
      icon: item.icon,
      group: "Navigation" as const,
      keywords: [item.title.toLowerCase()],
      permission: item.permission,
    })),
  ...userMenuLinks.map((item) => ({
    label: item.label,
    href: item.href,
    icon: item.icon,
    group: "Preferences" as const,
    keywords: [item.label.toLowerCase()],
  })),
]

export function AppCommandMenu({ className }: { className?: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const can = useCan()

  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const modifierKey = React.useMemo(() => {
    if (typeof window === "undefined") {
      return "⌘"
    }

    return window.navigator.platform.toLowerCase().includes("mac")
      ? "⌘"
      : "Ctrl"
  }, [])

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        setOpen((current) => !current)
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  const filteredEntries = React.useMemo(() => {
    const value = query.trim().toLowerCase()
    const availableEntries = commandEntries.filter(
      ({ permission }) => !permission || can(permission),
    )

    if (!value) return availableEntries

    return availableEntries.filter((item) => {
      const haystack = [item.label, item.href, ...(item.keywords ?? [])]
        .join(" ")
        .toLowerCase()
      return haystack.includes(value)
    })
  }, [can, query])

  const navigationEntries = filteredEntries.filter(
    (item) => item.group === "Navigation",
  )
  const preferenceEntries = filteredEntries.filter(
    (item) => item.group === "Preferences",
  )

  const handleSelect = (href: string) => {
    setOpen(false)
    setQuery("")
    router.push(href)
  }

  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && filteredEntries[0]) {
      event.preventDefault()
      handleSelect(filteredEntries[0].href)
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={cn(
          "ml-auto h-7 w-full max-w-54 justify-between rounded-xl border-border/80 px-2.5 text-muted-foreground sm:max-w-68",
          className,
        )}
        onClick={() => setOpen(true)}
      >
        <span className="flex min-w-0 items-center gap-2">
          <HugeiconsIcon
            icon={Search01Icon}
            strokeWidth={2}
            className="size-4 text-muted-foreground"
          />
          <Typography
            as="span"
            truncate
            variant="small-muted"
            className="text-[0.78rem]"
          >
            Search
          </Typography>
        </span>
        <KbdGroup className="hidden sm:inline-flex">
          <Kbd>{modifierKey}</Kbd>
          <Kbd>K</Kbd>
        </KbdGroup>
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <Command>
          <CommandInput
            autoFocus
            placeholder="Search pages..."
            value={query}
            onValueChange={setQuery}
            onKeyDown={handleInputKeyDown}
            aria-autocomplete="none"
          />
          <CommandList>
            {filteredEntries.length === 0 ? (
              <CommandEmpty>No results found.</CommandEmpty>
            ) : null}

            {navigationEntries.length > 0 ? (
              <CommandGroup heading="Navigation">
                {navigationEntries.map((item) => (
                  <CommandItem
                    key={item.href}
                    onSelect={() => handleSelect(item.href)}
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <HugeiconsIcon
                        icon={item.icon}
                        strokeWidth={2}
                        className="size-4 text-muted-foreground"
                      />
                      <span className="truncate">{item.label}</span>
                    </span>
                    <CommandShortcut>
                      {pathname === item.href ? "Current" : item.href}
                    </CommandShortcut>
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : null}

            {navigationEntries.length > 0 && preferenceEntries.length > 0 ? (
              <CommandSeparator />
            ) : null}

            {preferenceEntries.length > 0 ? (
              <CommandGroup heading="Preferences">
                {preferenceEntries.map((item) => (
                  <CommandItem
                    key={item.href}
                    onSelect={() => handleSelect(item.href)}
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <HugeiconsIcon
                        icon={item.icon}
                        strokeWidth={2}
                        className="size-4 text-muted-foreground"
                      />
                      <span className="truncate">{item.label}</span>
                    </span>
                    <CommandShortcut>
                      {pathname === item.href ? "Current" : item.href}
                    </CommandShortcut>
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : null}
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  )
}
