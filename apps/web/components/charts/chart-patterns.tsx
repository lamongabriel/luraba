export function DottedPattern({ id, color }: { id: string; color: string }) {
  return (
    <pattern id={id} width="8" height="8" patternUnits="userSpaceOnUse">
      <circle cx="2" cy="2" r="1.15" fill={color} />
    </pattern>
  );
}

export function StripePattern({ id, color }: { id: string; color: string }) {
  return (
    <pattern
      id={id}
      width="8"
      height="8"
      patternUnits="userSpaceOnUse"
      patternTransform="rotate(-45)"
    >
      <rect width="8" height="8" fill="transparent" />
      <rect width="3" height="8" fill={color} />
    </pattern>
  );
}
