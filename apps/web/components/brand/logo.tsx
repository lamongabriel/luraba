import { Typography } from "@/components/ui/typography";
import { cn } from "@/lib/utils";
import { BrandMark } from "./brand-mark";
import { BRAND } from "./constants";

type LogoProps = {
  /** `full` is mark + wordmark, `mark` only the icon, `wordmark` only the name. */
  variant?: "full" | "mark" | "wordmark";
  /** `default` uses the brand tile; `mono` inherits the surrounding text color with no tile. */
  tone?: "default" | "mono";
  size?: "sm" | "md" | "lg";
  className?: string;
};

const SIZES = {
  sm: { icon: 14, text: "text-sm" },
  md: { icon: 18, text: "text-base" },
  lg: { icon: 26, text: "text-2xl" },
} as const;

export function Logo({ variant = "full", tone = "default", size = "md", className }: LogoProps) {
  const { icon, text } = SIZES[size];

  return (
    <div className={cn("flex items-center gap-2", className)} role="img" aria-label={BRAND.name}>
      {variant !== "wordmark" ? (
        <BrandMark size={icon} variant={tone === "mono" ? "plain" : "tile"} />
      ) : null}
      {variant !== "mark" ? (
        <Typography
          as="span"
          truncate
          variant="card-title"
          className={cn("min-w-0 leading-none", text)}
        >
          {BRAND.name}
        </Typography>
      ) : null}
    </div>
  );
}
