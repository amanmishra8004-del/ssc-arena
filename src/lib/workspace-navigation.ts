import { useNavigate, useSearch } from "@tanstack/react-router";
import { useCallback } from "react";

export type WorkspaceSearch = {
  tab?: "today" | "syllabus" | "quiz" | "extras" | "arena";
  profile?: string;
  panel?: "menu" | "notifications" | "password";
  practice?: "ca" | "quiz" | "tables" | "mock" | "vocab" | "idioms" | "tests" | "pyq";
  ca?: "today" | "cards" | "quiz" | "week" | "notes";
  subject?: number;
  sub?: "gk" | "maths" | "reasoning";
  chapter?: string;
  quizId?: string;
};

export function validateWorkspaceSearch(raw: Record<string, unknown>): WorkspaceSearch {
  const result: WorkspaceSearch = {};
  if (raw['tab'] === "today" || raw["tab"] === "syllabus" || raw["tab"] === "quiz" || raw['tab'] === "extras" || raw['tab'] === "arena") result.tab = raw['tab'];
  if (raw['sub'] === "gk" || raw['sub'] === "maths" || raw['sub'] === "reasoning") result.sub = raw['sub'];
  if (typeof raw['profile'] === "string" && /^[a-zA-Z0-9_-]{1,64}$/.test(raw['profile'])) result.profile = raw['profile'];
  if (raw['panel'] === "menu" || raw['panel'] === "notifications" || raw['panel'] === "password") result.panel = raw['panel'];
  if (raw["practice"] === "ca" || raw["practice"] === "quiz" || raw['practice'] === "tables" || raw['practice'] === "mock" || raw['practice'] === "vocab" || raw['practice'] === "idioms" || raw['practice'] === "tests" || raw['practice'] === "pyq") result.practice = raw['practice'];
  if (raw['ca'] === "today" || raw['ca'] === "cards" || raw['ca'] === "quiz" || raw['ca'] === "week" || raw['ca'] === "notes") result.ca = raw['ca'];
  const subject = Number(raw['subject']);
  if (raw['subject'] !== undefined && Number.isInteger(subject) && subject >= 0 && subject < 4) result.subject = subject;
  if (typeof raw['chapter'] === "string" && raw['chapter'].length > 0 && raw['chapter'].length <= 200) result.chapter = raw['chapter'];
  const qId = raw['quizId'] || raw['quiz'];
  if (typeof qId === "string" && qId.length > 0 && qId.length <= 128) result.quizId = qId;
  return result;
}

export function useWorkspaceNavigation() {
  const search = useSearch({ from: "/" });
  const navigate = useNavigate();
  const change = useCallback((patch: { [K in keyof WorkspaceSearch]?: WorkspaceSearch[K] | undefined }, replace = false) => {
    void navigate({ to: "/", search: (previous) => validateWorkspaceSearch({ ...previous, ...patch }), replace: replace || search.panel === "menu" && patch.panel !== "menu" });
  }, [navigate, search.panel]);
  return { search, change };
}