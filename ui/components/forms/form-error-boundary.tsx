"use client"

import * as React from "react"

import { Logo } from "@/components/logo"
import { Button } from "@/components/ui/button"
import { Typography } from "@/components/ui/typography"

type FormErrorBoundaryProps = {
  children: React.ReactNode
}

type FormErrorBoundaryState = {
  hasError: boolean
  resetKey: number
}

class FormErrorBoundaryRoot extends React.Component<
  FormErrorBoundaryProps,
  FormErrorBoundaryState
> {
  state: FormErrorBoundaryState = {
    hasError: false,
    resetKey: 0,
  }

  static getDerivedStateFromError() {
    return {
      hasError: true,
    }
  }

  handleReset = () => {
    this.setState((currentState) => ({
      hasError: false,
      resetKey: currentState.resetKey + 1,
    }))
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-[1.6rem] border border-white/8 bg-(--color-container)/96 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.28)] shadow-black/40 ring-1 ring-white/4 md:p-7">
          <div className="space-y-5">
            <div className="flex justify-center">
              <Logo />
            </div>

            <div className="space-y-2 text-center">
              <Typography
                as="h2"
                variant="subheading"
                className="text-[1.45rem]"
              >
                This form hit an unexpected error.
              </Typography>
              <Typography
                variant="body-muted"
                className="leading-6 text-foreground/72"
              >
                Try reloading the form. If this keeps happening, refresh the
                page and try again.
              </Typography>
            </div>

            <Button
              type="button"
              className="h-10 w-full rounded-xl border-primary/30 bg-primary text-primary-foreground shadow-none hover:brightness-105"
              onClick={this.handleReset}
            >
              Reload form
            </Button>
          </div>
        </div>
      )
    }

    return (
      <React.Fragment key={this.state.resetKey}>
        {this.props.children}
      </React.Fragment>
    )
  }
}

export function FormErrorBoundary({ children }: FormErrorBoundaryProps) {
  return <FormErrorBoundaryRoot>{children}</FormErrorBoundaryRoot>
}
