"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";

/** The label of a key, edited in place: Enter or leaving the field saves, Escape cancels. */
export function ApiKeyNameCell({
  name,
  onRename,
}: {
  name: string;
  onRename: (name: string) => void;
}) {
  const [value, setValue] = React.useState(name);

  React.useEffect(() => setValue(name), [name]);

  function commit() {
    const next = value.trim();
    if (!next) {
      setValue(name);
      return;
    }
    if (next !== name) onRename(next);
  }

  return (
    <Input
      aria-label="Key label"
      className="h-8 min-w-40 border-transparent bg-transparent px-2 hover:border-border focus-visible:border-ring"
      value={value}
      maxLength={80}
      onChange={(event) => setValue(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.currentTarget.blur();
        if (event.key === "Escape") {
          setValue(name);
          event.currentTarget.blur();
        }
      }}
    />
  );
}
