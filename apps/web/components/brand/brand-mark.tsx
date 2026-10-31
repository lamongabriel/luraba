import { cn } from "@/lib/utils";
import { MARK_PATHS, MARK_STROKE_WIDTH, MARK_VIEWBOX } from "./mark-paths";

type BrandMarkProps = {
  /** Pixel size of the icon itself. */
  size?: number;
  /**
   * `plain` draws just the wallet in `currentColor`; `tile` puts it in the rounded, tinted tile used
   * by the sidebar and the auth pages.
   */
  variant?: "plain" | "tile";
  className?: string;
};

/** The Luraba mark. Colored by `currentColor`, so it works on light, dark and monochrome surfaces. */
export function BrandMark({ size = 18, variant = "plain", className }: BrandMarkProps) {
  const icon = (
    <svg
      aria-hidden="true"
      className={variant === "plain" ? className : undefined}
      fill="none"
      height={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={MARK_STROKE_WIDTH}
      viewBox={`0 0 ${MARK_VIEWBOX} ${MARK_VIEWBOX}`}
      width={size}
    >
      {MARK_PATHS.map((d) => (
        <path d={d} key={d} />
      ))}
    </svg>
  );

  if (variant === "plain") return icon;

  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary",
        className,
      )}
      style={{ width: size * 2, height: size * 2 }}
    >
      {icon}
    </span>
  );
}
