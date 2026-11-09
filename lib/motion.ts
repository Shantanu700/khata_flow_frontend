/** The user asked the system for less motion: skip movement, keep opacity. */
export const reduceMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches

export const EASE_OUT = "power3.out"
export const EASE_IN_OUT = "power3.inOut"
