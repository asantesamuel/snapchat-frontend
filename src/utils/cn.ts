import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// merges Tailwind classes safely
// resolves conflicting classes e.g. p-2 and p-4 → p-4 wins
export const cn = (...inputs: ClassValue[]): string =>
  twMerge(clsx(inputs));