import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Tremor Raw cx [v0.0.0]
export function cx(...args: ClassValue[]) {
  return twMerge(clsx(...args))
}