import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Typography } from "@/components/ui/typography";

export function RegisterForm() {
  return (
    <div className="space-y-5 rounded-[1.6rem] border border-border/70 bg-[var(--color-container)] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" type="text" placeholder="Your name" defaultValue="Gabriel Lamonga" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" placeholder="you@example.com" defaultValue="gabriel@luraba.app" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input id="password" type="password" placeholder="********" defaultValue="design-preview" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm Password</Label>
        <Input id="confirmPassword" type="password" placeholder="********" defaultValue="design-preview" />
      </div>

      <Typography variant="small-muted">
        Use this surface to tune spacing, focus styles, field groups, and brand voice without any form validation.
      </Typography>

      <Button asChild className="h-10 w-full rounded-xl">
        <Link href="/dashboard">Open workspace preview</Link>
      </Button>

      <Typography as="p" variant="body-muted" className="text-center">
        Already have an account?{" "}
        <Link href="/login" className="text-primary underline-offset-4 hover:underline">
          Sign in
        </Link>
      </Typography>
    </div>
  );
}
