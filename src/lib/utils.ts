import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const AVATAR_COLORS = [
  'bg-gradient-to-br from-orange-400 to-amber-500 text-white',
  'bg-gradient-to-br from-blue-400 to-blue-600 text-white',
  'bg-gradient-to-br from-cyan-400 to-teal-500 text-white',
  'bg-gradient-to-br from-rose-400 to-pink-600 text-white',
  'bg-gradient-to-br from-violet-400 to-purple-600 text-white',
  'bg-gradient-to-br from-emerald-400 to-green-600 text-white',
  'bg-gradient-to-br from-sky-400 to-indigo-500 text-white',
  'bg-gradient-to-br from-fuchsia-400 to-pink-500 text-white',
  'bg-gradient-to-br from-amber-400 to-orange-600 text-white',
  'bg-gradient-to-br from-lime-400 to-emerald-600 text-white',
  'bg-gradient-to-br from-red-400 to-rose-600 text-white',
  'bg-gradient-to-br from-indigo-400 to-violet-600 text-white',
  'bg-gradient-to-br from-teal-400 to-cyan-600 text-white',
  'bg-gradient-to-br from-pink-400 to-rose-500 text-white',
  'bg-gradient-to-br from-purple-400 to-fuchsia-600 text-white',
  'bg-gradient-to-br from-green-400 to-teal-600 text-white',
];

export function getAvatarColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}
