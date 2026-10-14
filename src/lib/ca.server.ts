// Shared types for the daily current-affairs packs (uploaded manually by the admin).
export type CAQ = { q: string; options: string[]; answer: number };
export type CADaily = { id: string; category: string; title: string; fact: string; trick: string; quiz?: CAQ };
