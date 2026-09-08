"use client";

import {
  type HTMLMotionProps,
  motion,
  type TargetAndTransition,
  type Transition,
  useReducedMotion,
} from "framer-motion";

type RevealConfig = {
  animate: TargetAndTransition;
  initial: TargetAndTransition;
  transition: Transition;
};

const REVEAL_CONFIGS = {
  item: {
    animate: { opacity: 1, y: 0 },
    initial: { opacity: 0, y: 8 },
    transition: { duration: 0.28, ease: "easeOut" },
  },
  page: {
    animate: { opacity: 1, y: 0 },
    initial: { opacity: 0, y: 16 },
    transition: { duration: 0.42, ease: "easeOut" },
  },
  section: {
    animate: { opacity: 1, y: 0 },
    initial: { opacity: 0, y: 10 },
    transition: { duration: 0.34, ease: "easeOut" },
  },
} satisfies Record<string, RevealConfig>;

type RevealDivProps = Omit<HTMLMotionProps<"div">, "animate" | "initial" | "transition"> & {
  delay?: number;
  transition?: Transition;
};

type RevealSectionProps = Omit<HTMLMotionProps<"section">, "animate" | "initial" | "transition"> & {
  delay?: number;
  transition?: Transition;
};

function getRevealTransition(config: RevealConfig, delay: number, transition?: Transition) {
  const baseDelay = typeof config.transition.delay === "number" ? config.transition.delay : 0;
  const overrideDelay = typeof transition?.delay === "number" ? transition.delay : 0;

  return {
    ...config.transition,
    ...transition,
    delay: baseDelay + overrideDelay + delay,
  } satisfies Transition;
}

function useRevealMotion(config: RevealConfig, delay: number, transition?: Transition) {
  const reduceMotion = Boolean(useReducedMotion());

  if (reduceMotion) {
    return {
      animate: undefined,
      initial: false as const,
      transition: undefined,
    };
  }

  return {
    animate: config.animate,
    initial: config.initial,
    transition: getRevealTransition(config, delay, transition),
  };
}

export function PageReveal({ delay = 0, transition, ...props }: RevealDivProps) {
  const animation = useRevealMotion(REVEAL_CONFIGS.page, delay, transition);

  return <motion.div {...props} {...animation} />;
}

export function SectionReveal({ delay = 0, transition, ...props }: RevealSectionProps) {
  const animation = useRevealMotion(REVEAL_CONFIGS.section, delay, transition);

  return <motion.section {...props} {...animation} />;
}

export function ItemReveal({ delay = 0, transition, ...props }: RevealDivProps) {
  const animation = useRevealMotion(REVEAL_CONFIGS.item, delay, transition);

  return <motion.div {...props} {...animation} />;
}
