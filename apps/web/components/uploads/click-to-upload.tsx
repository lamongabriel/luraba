"use client";

import { Camera01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * The standard way to change a picture: the picture itself is the control. Hovering darkens it and
 * shows a camera, clicking opens the file picker. Wrap the record's mark (or avatar) in it; there is
 * no separate "Upload" button anywhere in the app.
 */
export function ClickToUpload({
  children,
  onFile,
  busy = false,
  disabled = false,
  label = "Change picture",
  rounded = "xl",
  className,
}: {
  children: React.ReactNode;
  onFile: (file: File) => void;
  busy?: boolean;
  disabled?: boolean;
  /** Accessible name and tooltip. */
  label?: string;
  rounded?: "xl" | "full";
  className?: string;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);

  return (
    <>
      <button
        type="button"
        title={label}
        aria-label={label}
        disabled={disabled || busy}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "group/upload relative inline-flex shrink-0 cursor-pointer overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default",
          rounded === "full" ? "rounded-full" : "rounded-xl",
          className,
        )}
      >
        {children}
        <span
          className={cn(
            "absolute inset-0 flex items-center justify-center bg-black/55 text-white transition-opacity group-hover/upload:opacity-100 group-focus-visible/upload:opacity-100",
            busy ? "opacity-100" : "opacity-0",
          )}
        >
          <HugeiconsIcon
            icon={Camera01Icon}
            strokeWidth={2}
            className={cn("size-1/4 min-w-4 max-w-6", busy && "animate-pulse")}
          />
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) onFile(file);
        }}
      />
    </>
  );
}
