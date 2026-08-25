import { z } from "zod"

const apiUrlEnvSchema = z
  .string()
  .trim()
  .default("http://localhost:22677")
  .refine(
    (value) => {
      try {
        new URL(value)
        return true
      } catch {
        return false
      }
    },
    {
      message: "NEXT_PUBLIC_API_URL must be a valid URL.",
    },
  )
  .transform((value) => new URL(value).origin)

const envSchema = z.object({
  NEXT_PUBLIC_API_URL: apiUrlEnvSchema,
})

const parsedEnv = envSchema.safeParse({
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
})

if (!parsedEnv.success) {
  throw new Error(
    `Invalid frontend environment configuration:\n${parsedEnv.error.issues
      .map((issue) => `- ${issue.path.join(".") || "env"}: ${issue.message}`)
      .join("\n")}`,
  )
}

export const env = {
  apiUrl: parsedEnv.data.NEXT_PUBLIC_API_URL,
} as const

export type Env = typeof env
