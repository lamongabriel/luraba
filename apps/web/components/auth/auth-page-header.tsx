"use client"

import { motion, useReducedMotion } from "framer-motion"

import { Logo } from "@/components/logo"
import { Typography } from "@/components/ui/typography"

type AuthPageHeaderProps = {
  eyebrow: string
  title: string
  description: string
}

export function AuthPageHeader({
  eyebrow,
  title,
  description,
}: AuthPageHeaderProps) {
  const reduceMotion = useReducedMotion()

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 14 }}
      animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      transition={
        reduceMotion
          ? undefined
          : {
              duration: 0.42,
              ease: "easeOut",
            }
      }
      className="space-y-4 text-center"
    >
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, scale: 0.96 }}
        animate={reduceMotion ? undefined : { opacity: 1, scale: 1 }}
        transition={
          reduceMotion
            ? undefined
            : {
                delay: 0.04,
                duration: 0.36,
                ease: "easeOut",
              }
        }
        className="mx-auto mb-8 flex w-fit justify-center"
      >
        <Logo />
      </motion.div>

      <div className="space-y-2">
        <Typography variant="eyebrow" className="text-foreground/50">
          {eyebrow}
        </Typography>
        <Typography
          as="h1"
          variant="page-title"
          className="text-[2.15rem] leading-[1.02] md:text-[2.5rem]"
        >
          {title}
        </Typography>
        <Typography
          variant="body-muted"
          className="mx-auto max-w-md text-sm leading-6 text-foreground/68"
        >
          {description}
        </Typography>
      </div>
    </motion.div>
  )
}
