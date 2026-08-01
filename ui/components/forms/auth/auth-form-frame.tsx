"use client"

import { motion, useReducedMotion } from "framer-motion"
import type { ReactNode } from "react"

import { Typography } from "@/components/ui/typography"

type AuthFormFrameProps = {
  children: ReactNode
  footer: ReactNode
}

export function AuthFormFrame({ children, footer }: AuthFormFrameProps) {
  const reduceMotion = useReducedMotion()

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 18, scale: 0.985 }}
      animate={reduceMotion ? undefined : { opacity: 1, y: 0, scale: 1 }}
      transition={
        reduceMotion
          ? undefined
          : {
              delay: 0.1,
              duration: 0.46,
              ease: "easeOut",
            }
      }
      className="rounded-[1.6rem] border border-white/8 bg-[var(--color-container)] p-6 md:p-7"
    >
      <div className="space-y-6">
        {children}

        <div className="border-t border-white/7 pt-4">
          <Typography
            variant="small-muted"
            className="text-center text-[0.72rem] leading-5 text-muted-foreground/80"
          >
            {footer}
          </Typography>
        </div>
      </div>
    </motion.div>
  )
}
