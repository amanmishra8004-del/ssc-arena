import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { FileUp, Trash2, Trophy, Play, Check, X, Clock, RotateCcw, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SYLLABUS, chapterKey } from "@/lib/syllabus";
import { createQuiz, deleteQuiz, deleteResults, listQuizzes, submitQuiz, cleanText, parseQuizHtml, type QQ } from "@/lib/quiz.functions";

type Quiz = { id: string; title: string; chapter: string | null; day: string | null; questions: QQ[]; created_at: string; expired: boolean };
type Attempt = { quiz_id: string; username: string; score: number; total: number; answers: unknown; at: string };
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const creds = () => { try { const a = JSON.parse(localStorage.getItem("arena-auth") ?? "{}"); return { username: a.username ?? "", password: a.password ?? "" }; } catch { return { username: "", password: "" }; } };
// Quizzes show content as-is (Bilingual/English/Hindi and matching tables fully preserved):
export const en = (raw: string) => cleanText(raw);
const chapterLabel = (k: string) => k.startsWith("test:") ? `${k.slice(5)} test` : k.split("|").join(" · ");

export async function shareQuizLink(quiz: { id: string; title: string; chapter?: string | null; questions?: unknown[] }) {
  const isPyq = quiz.chapter?.startsWith("pyq:");
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const count = Array.isArray(quiz.questions) ? quiz.questions.length : 0;
  const countText = count > 0 ? ` (${count} Questions)` : "";
  const url = isPyq
    ? `${origin}/?tab=extras&practice=pyq&quizId=${encodeURIComponent(quiz.id)}`
    : `${origin}/?tab=quiz&quizId=${encodeURIComponent(quiz.id)}`;

  const text = `🎯 Attempt this SSC quiz: "${quiz.title}"${countText} on SSC Arena!\n\n${url}`;

  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share({
        title: `SSC Arena: ${quiz.title}`,
        text,
        url,
      });
      return { status: "shared", url };
    } catch (err: any) {
      if (err?.name === "AbortError") {
        return { status: "cancelled", url };
      }
    }
  }

  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(url);
      return { status: "copied", url };
    } catch { }
  }

  if (typeof window !== "undefined") {
    window.prompt("Copy link to share this quiz with friends:", url);
    return { status: "copied", url };
  }

  return { status: "error", url };
}

export function useQuizzes() {
  const list = useServerFn(listQuizzes);
  return useQuery({
    queryKey: ["quizzes"],
    queryFn: () => list({ data: creds() }),
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    retry: 2,
  });
}

// Popup reminding a player about active quizzes they have not attempted yet. Reappears on every app open until attempted.
// My best quiz score per syllabus chapter key (includes expired quizzes, so history stays).
export function useQuizScores() {
  const q = useQuizzes();
  return useMemo(() => {
    const who = creds().username;
    const out: Record<string, { score: number; total: number }> = {};
    const qz = (q.data?.quizzes ?? []) as Quiz[];
    for (const a of (q.data?.attempts ?? []) as Attempt[]) {
      if (a.username !== who) continue;
      const z = qz.find((x) => x.id === a.quiz_id);
      if (!z) continue;

      const recordScore = (k: string) => {
        if (!out[k] || (a.total > 0 && a.score / a.total > out[k].score / out[k].total)) {
          out[k] = { score: a.score, total: a.total };
        }
      };

      if (z.chapter) {
        recordScore(z.chapter);
        if (z.chapter.includes("|")) {
          const chapOnly = z.chapter.split("|")[1]?.trim();
          if (chapOnly) recordScore(chapOnly);
        }
      }

      for (const s of SYLLABUS) {
        for (const sec of s.sections) {
          for (const c of sec.chapters) {
            const k = chapterKey(sec.name, c);
            const cLower = c.toLowerCase();
            const zChap = String(z.chapter || "").toLowerCase();
            const zTitle = String(z.title || "").toLowerCase();
            if (zChap === cLower || (zChap && zChap.includes(cLower)) || zTitle.includes(cLower)) {
              recordScore(k);
            }
          }
        }
      }
    }
    return out;
  }, [q.data]);
}

// Available active chapter quizzes mapping for direct Syllabus button launch
export function useChapterQuizMap() {
  const q = useQuizzes();
  return useMemo(() => {
    const out: Record<string, { id: string; title: string; count: number; quiz: Quiz }> = {};
    const qz = (q.data?.quizzes ?? []) as Quiz[];
    for (const z of qz) {
      if (!z.expired) {
        const qCount = Array.isArray(z.questions) ? z.questions.length : 0;
        const entry = { id: z.id, title: z.title || "", count: qCount, quiz: z };

        if (z.chapter) {
          out[z.chapter] = entry;
          if (z.chapter.includes("|")) {
            const chapOnly = z.chapter.split("|")[1]?.trim();
            if (chapOnly) out[chapOnly] = entry;
          }
        }

        // Match with syllabus chapters by chapter name or quiz title
        for (const s of SYLLABUS) {
          for (const sec of s.sections) {
            for (const c of sec.chapters) {
              const k = chapterKey(sec.name, c);
              if (!out[k]) {
                const cLower = c.toLowerCase();
                const zChap = String(z.chapter || "").toLowerCase();
                const zTitle = String(z.title || "").toLowerCase();
                if (zChap === cLower || (zChap && zChap.includes(cLower)) || zTitle.includes(cLower)) {
                  out[k] = entry;
                }
              }
            }
          }
        }
      }
    }
    return out;
  }, [q.data]);
}

export function detectQuizSubject(quiz?: { chapter?: string | null; title?: string | null } | null): "maths" | "reasoning" | "english" | "ga" | "test" {
  if (!quiz) return "ga";
  const ch = String(quiz.chapter || "").toLowerCase();
  const t = String(quiz.title || "").toLowerCase();
  if (ch.startsWith("test:") || t.includes("mock") || t.includes("full test")) return "test";

  // SYLLABUS: [0] = Maths, [1] = GS, [2] = Reasoning, [3] = English
  if (SYLLABUS[0]?.sections?.some((s) => ch.includes(s.name.toLowerCase()) || s.chapters.some((c) => ch.includes(c.toLowerCase())))) return "maths";
  if (SYLLABUS[1]?.sections?.some((s) => ch.includes(s.name.toLowerCase()) || s.chapters.some((c) => ch.includes(c.toLowerCase())))) return "ga";
  if (SYLLABUS[2]?.sections?.some((s) => ch.includes(s.name.toLowerCase()) || s.chapters.some((c) => ch.includes(c.toLowerCase())))) return "reasoning";
  if (SYLLABUS[3]?.sections?.some((s) => ch.includes(s.name.toLowerCase()) || s.chapters.some((c) => ch.includes(c.toLowerCase())))) return "english";

  if (/math|arithmetic|advance|number|ratio|percentage|algebra|geometry|trig|mensuration|si|ci|profit|loss|time|speed|boat|pipe|square|cube|table/i.test(ch + " " + t)) return "maths";
  if (/reasoning|analogy|syllogism|blood|direction|series|coding|matrix|cube|dice|paper|mirror|pattern/i.test(ch + " " + t)) return "reasoning";
  if (/english|grammar|vocab|synonym|antonym|idiom|cloze|reading|comprehension|voice|narration|spelling|preposition|noun/i.test(ch + " " + t)) return "english";
  if (/ga|gk|history|polity|geography|science|physics|chemistry|biology|economics|current affairs|static/i.test(ch + " " + t)) return "ga";
  return "ga";
}

export function QuizNudge({ who, onOpen }: { who: string; onOpen: () => void }) {
  const q = useQuizzes();
  const [closed, setClosed] = useState(false);
  const quizzes = ((q.data?.quizzes ?? []) as Quiz[]).filter((z) => !z.expired);
  const attempts = (q.data?.attempts ?? []) as Attempt[];
  const pending = quizzes.filter((z) => !attempts.some((a) => a.quiz_id === z.id && a.username === who));
  if (closed || !pending.length) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 p-4 sm:items-center" role="dialog" aria-modal="true">
      <div className="w-full max-w-md space-y-3 rounded-xl border bg-card p-5 shadow-xl">
        <p className="text-lg font-bold">New quiz available</p>
        <div className="max-h-72 space-y-2 overflow-y-auto">
          {pending.slice(0, 5).map((z) => {
            const done = [...new Set(attempts.filter((a) => a.quiz_id === z.id).map((a) => a.username))];
            const qCount = Array.isArray(z.questions) ? z.questions.length : 0;
            return (
              <div key={z.id} className="rounded-lg bg-secondary/60 p-3">
                <p className="font-semibold">{z.title || "Quiz"}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{qCount} questions{z.chapter ? ` · ${chapterLabel(z.chapter)}` : ""}</p>
                <p className="mt-1.5 text-sm">{done.length ? `Already attempted by ${done.map(cap).join(", ")}. Attempt it now.` : "No one has attempted it yet. Be the first."}</p>
              </div>
            );
          })}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={() => setClosed(true)}>Later</Button>
          <Button onClick={() => { setClosed(true); onOpen(); }}><Play size={16} />Attempt now</Button>
        </div>
      </div>
    </div>
  );
}

type MistakeItem = {
  id: string;
  quizId: string;
  quizTitle: string;
  chapterKey: string;
  chapterLabel: string;
  qIndex: number;
  question: QQ;
  userAnswer: number;
  correctAnswer: number;
};

export function QuizZone({
  who,
  mode = "quiz",
  targetChapter,
  targetQuizId,
}: {
  who: string;
  mode?: "quiz" | "test";
  targetChapter?: string;
  targetQuizId?: string;
}) {
  const qc = useQueryClient();
  const q = useQuizzes();
  const [playing, setPlaying] = useState<{
    quiz: Quiz;
    questions?: QQ[];
    timerMinutes?: number | null;
  } | null>(null);
  const [promptQuiz, setPromptQuiz] = useState<{ quiz: Quiz; questions?: QQ[] } | null>(null);
  const [filter, setFilter] = useState<"active" | "past" | "mistakes">("active");
  const [subjectFilter, setSubjectFilter] = useState<"all" | "maths" | "reasoning" | "english" | "ga" | "test">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTargetChapter, setSelectedTargetChapter] = useState<string | null>(targetChapter ?? null);
  const [selectedTargetQuizId, setSelectedTargetQuizId] = useState<string | null>(targetQuizId ?? null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [shareToast, setShareToast] = useState<string | null>(null);
  const autoLaunchedRef = useRef(false);

  const all = ((q.data?.quizzes ?? []) as Quiz[]).filter((z) => (mode === "test") === !!z.chapter?.startsWith("test:"));
  const quizzes = all.filter((z) => !z.expired);
  const attempts = (q.data?.attempts ?? []) as Attempt[];

  const refresh = () => qc.invalidateQueries({ queryKey: ["quizzes"] });

  // Update target chapter if prop changes and auto-launch if quiz exists
  useEffect(() => {
    if (targetChapter) {
      setSelectedTargetChapter(targetChapter);
      setFilter("active");

      const targetKey = targetChapter.toLowerCase();
      const chapOnly = targetChapter.includes("|")
        ? targetChapter.split("|")[1].trim().toLowerCase()
        : targetKey;

      const found = quizzes.find((z) => {
        const zChap = String(z.chapter || "").toLowerCase();
        const zTitle = String(z.title || "").toLowerCase();
        return (
          zChap === targetKey ||
          zChap === chapOnly ||
          (zChap && zChap.includes(chapOnly)) ||
          zTitle.includes(chapOnly)
        );
      });

      if (found) {
        setPromptQuiz({ quiz: found });
      }
    }
  }, [targetChapter, quizzes]);

  // Update target quizId from prop and auto-launch direct quiz
  useEffect(() => {
    if (targetQuizId) {
      setSelectedTargetQuizId(targetQuizId);
      setFilter("active");
    }
  }, [targetQuizId]);

  useEffect(() => {
    if (selectedTargetQuizId && (quizzes.length > 0 || all.length > 0) && !autoLaunchedRef.current) {
      const found = quizzes.find((z) => z.id === selectedTargetQuizId) || all.find((z) => z.id === selectedTargetQuizId);
      if (found) {
        autoLaunchedRef.current = true;
        setPromptQuiz({ quiz: found });
      }
    }
  }, [selectedTargetQuizId, quizzes, all]);

  const targetSharedQuiz = useMemo(() => {
    if (!selectedTargetQuizId) return null;
    return quizzes.find((z) => z.id === selectedTargetQuizId) || all.find((z) => z.id === selectedTargetQuizId) || null;
  }, [selectedTargetQuizId, quizzes, all]);

  const onShareQuiz = async (quiz: Quiz) => {
    const res = await shareQuizLink(quiz);
    if (res.status === "copied" || res.status === "shared") {
      setCopiedId(quiz.id);
      setShareToast(`Link for "${quiz.title}" copied! Share it on WhatsApp/Telegram.`);
      setTimeout(() => {
        setCopiedId(null);
        setShareToast(null);
      }, 4000);
    }
  };

  // Find target quiz if navigating from syllabus
  const targetQuiz = useMemo(() => {
    if (!selectedTargetChapter) return null;
    const targetKey = selectedTargetChapter.toLowerCase();
    const chapOnly = selectedTargetChapter.includes("|")
      ? selectedTargetChapter.split("|")[1].trim().toLowerCase()
      : targetKey;

    return (
      quizzes.find((z) => {
        const zChap = String(z.chapter || "").toLowerCase();
        const zTitle = String(z.title || "").toLowerCase();
        return (
          zChap === targetKey ||
          zChap === chapOnly ||
          (zChap && zChap.includes(chapOnly)) ||
          zTitle.includes(chapOnly)
        );
      }) || null
    );
  }, [quizzes, selectedTargetChapter]);

  // Filtered quizzes by subject and sub-topic query
  const shown = useMemo(() => {
    // If targeting a specific chapter from syllabus, isolate matching quizzes
    if (selectedTargetChapter) {
      const targetKey = selectedTargetChapter.toLowerCase();
      const chapOnly = selectedTargetChapter.includes("|")
        ? selectedTargetChapter.split("|")[1].trim().toLowerCase()
        : targetKey;

      const matching = quizzes.filter((z) => {
        const zChap = String(z.chapter || "").toLowerCase();
        const zTitle = String(z.title || "").toLowerCase();
        return (
          zChap === targetKey ||
          zChap === chapOnly ||
          (zChap && zChap.includes(chapOnly)) ||
          zTitle.includes(chapOnly)
        );
      });

      if (matching.length > 0) return matching;
    }

    return quizzes.filter((z) => {
      // Subject filter
      if (subjectFilter !== "all") {
        const s = detectQuizSubject(z);
        if (s !== subjectFilter) return false;
      }

      // Search query across title and chapter label
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchTitle = String(z.title || "").toLowerCase().includes(query);
        const matchChapter = String(z.chapter || "").toLowerCase().includes(query);
        if (!matchTitle && !matchChapter) return false;
      }

      return true;
    });
  }, [quizzes, subjectFilter, searchQuery, selectedTargetChapter]);

  const allMistakes = useMemo(() => {
    const list: MistakeItem[] = [];
    for (const z of all) {
      const mine = attempts.filter((a) => a.quiz_id === z.id && a.username === who).at(-1);
      if (!mine || !Array.isArray(mine.answers)) continue;
      const ans = mine.answers as number[];
      const qList = Array.isArray(z.questions) ? z.questions : [];
      qList.forEach((x, i) => {
        const a = ans[i] ?? -1;
        if (a !== x.answer) {
          list.push({
            id: `${z.id}-${i}`,
            quizId: z.id,
            quizTitle: z.title || "Quiz",
            chapterKey: z.chapter || z.title || "General",
            chapterLabel: z.chapter ? chapterLabel(z.chapter) : (z.title || "General"),
            qIndex: i,
            question: x,
            userAnswer: a,
            correctAnswer: x.answer,
          });
        }
      });
    }
    return list;
  }, [all, attempts, who]);

  const retryMissed = (z: Quiz) => {
    const mine = attempts.filter((a) => a.quiz_id === z.id && a.username === who).at(-1);
    if (!mine || !Array.isArray(mine.answers)) return;
    const ans = mine.answers as number[];
    const qList = Array.isArray(z.questions) ? z.questions : [];
    const wrong = qList.filter((x, i) => (ans[i] ?? -1) !== x.answer);
    if (wrong.length) setPromptQuiz({ quiz: z, questions: wrong });
  };

  if (playing)
    return (
      <QuizPlayer
        quiz={playing.quiz}
        questions={playing.questions}
        timerMinutes={playing.timerMinutes}
        onDone={() => {
          setPlaying(null);
          refresh();
        }}
      />
    );

  return (
    <div className="space-y-4">
      {who === "arun" && <QuizUpload onCreated={refresh} mode={mode} defaultChapter={selectedTargetChapter} />}

      {/* Target Shared Quiz Banner */}
      {targetSharedQuiz && (
        <div className="rounded-2xl border-2 border-primary/50 bg-gradient-to-r from-primary/15 via-card to-card p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-sm animate-in fade-in">
          <div>
            <div className="flex items-center gap-1.5 text-[11px] font-black text-primary uppercase tracking-wider">
              <span>🎯</span>
              <span>Shared Quiz Opened</span>
            </div>
            <p className="font-display font-black text-base text-foreground mt-0.5">
              {targetSharedQuiz.title}
            </p>
            <p className="text-xs text-muted-foreground">
              {Array.isArray(targetSharedQuiz.questions) ? targetSharedQuiz.questions.length : 0} questions · {targetSharedQuiz.chapter ? chapterLabel(targetSharedQuiz.chapter) : "General"}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button size="sm" onClick={() => setPromptQuiz({ quiz: targetSharedQuiz })} className="font-bold text-xs shadow-md">
              <Play size={14} className="mr-1" /> Start Quiz Now
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedTargetQuizId(null)}
              className="text-xs font-semibold"
            >
              Dismiss
            </Button>
          </div>
        </div>
      )}

      {/* Target Chapter Launcher Banner from Syllabus */}
      {selectedTargetChapter && (
        <div className="rounded-2xl border-2 border-primary/40 bg-gradient-to-r from-primary/10 via-card to-card p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-sm animate-in fade-in">
          <div>
            <div className="flex items-center gap-1.5 text-[11px] font-black text-primary uppercase tracking-wider">
              <span>🎯</span>
              <span>Target Chapter Quiz Selected</span>
            </div>
            <p className="font-display font-black text-base text-foreground mt-0.5">
              {chapterLabel(selectedTargetChapter)}
            </p>
            <p className="text-xs text-muted-foreground">
              {targetQuiz ? `Uploaded & ready · ${Array.isArray(targetQuiz.questions) ? targetQuiz.questions.length : 0} questions` : "No quiz uploaded for this chapter yet."}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {targetQuiz && (
              <Button size="sm" onClick={() => setPromptQuiz({ quiz: targetQuiz })} className="font-bold text-xs shadow-md">
                <Play size={14} className="mr-1" /> Start Chapter Quiz
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedTargetChapter(null)}
              className="text-xs font-semibold"
            >
              Show All Quizzes
            </Button>
          </div>
        </div>
      )}

      {/* Main Tabs (Active, Past, Mistakes) */}
      <div className="practice-tabs flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {([
          ["active", "Active Quizzes"],
          ["past", "Past Results"],
          ["mistakes", `Mistake Bank (${allMistakes.length})`],
        ] as const).map(([k, l]) => (
          <Button
            variant="unstyled"
            key={k}
            aria-pressed={filter === k}
            onClick={() => setFilter(k)}
            className={cn(
              "shrink-0 rounded-full px-4 py-2 text-xs font-bold transition-all active:scale-[0.97] border",
              filter === k
                ? "bg-primary text-primary-foreground border-primary shadow-xs"
                : "bg-secondary/70 text-muted-foreground border-border/70 hover:bg-secondary"
            )}
          >
            {l}
          </Button>
        ))}
      </div>

      {filter === "active" && (
        <div className="space-y-3">
          {/* Subject-Wise Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {([
              ["all", "All Subjects"],
              ["maths", "Maths 🔢"],
              ["reasoning", "Reasoning 🧩"],
              ["english", "English 📖"],
              ["ga", "General Awareness 🌍"],
              ["test", "Full Tests 📝"],
            ] as const).map(([sKey, sLabel]) => (
              <Button
                variant="unstyled"
                key={sKey}
                onClick={() => {
                  setSubjectFilter(sKey);
                  setSelectedTargetChapter(null);
                }}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-bold shrink-0 transition border",
                  subjectFilter === sKey
                    ? "bg-primary text-primary-foreground border-primary shadow-xs"
                    : "bg-secondary/60 text-muted-foreground border-border/70 hover:bg-secondary"
                )}
              >
                {sLabel}
              </Button>
            ))}
          </div>

          {/* Sub-Topic / Chapter Search */}
          <div className="flex items-center gap-2">
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search quizzes by chapter or topic name (e.g. Percentage, Analogy, Ancient History)..."
              className="w-full rounded-xl border-2 border-border/70 bg-secondary/40 px-3.5 py-2 text-xs outline-none focus:border-primary transition"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearchQuery("")}
                className="h-8 text-xs text-muted-foreground"
              >
                Clear
              </Button>
            )}
            <Button
              variant="outline"
              size="icon"
              onClick={() => q.refetch()}
              disabled={q.isFetching}
              title="Refresh quizzes"
              className="h-9 w-9 shrink-0 rounded-xl"
            >
              <RotateCcw size={14} className={cn(q.isFetching && "animate-spin text-primary")} />
            </Button>
          </div>
        </div>
      )}

      {filter === "past" && (
        <p className="text-xs text-muted-foreground">Complete history of all attempted quizzes and leaderboard standings.</p>
      )}
      {filter === "mistakes" && (
        <p className="text-xs text-muted-foreground">All questions you answered wrong are saved here chapter-wise. Select one or multiple chapters to start a custom revision quiz.</p>
      )}

      {q.isLoading ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Loading quizzes…</p>
      ) : q.isError ? (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm flex items-center justify-between gap-3">
          <div>
            <p className="font-semibold text-destructive">Unable to load quizzes right now.</p>
            <p className="text-xs text-muted-foreground">Click retry to reload from the server.</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => q.refetch()} className="font-bold shrink-0">
            Try again
          </Button>
        </div>
      ) : filter === "past" ? (
        <PastResults quizzes={all} attempts={attempts} who={who} onRetry={retryMissed} onChanged={refresh} />
      ) : filter === "mistakes" ? (
        <MistakeBank
          mistakes={allMistakes}
          onStartPractice={({ quiz, questions }) => setPromptQuiz({ quiz, questions })}
        />
      ) : shown.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center bg-card space-y-1">
          <p className="text-sm font-bold text-foreground">No quizzes found matching your filter.</p>
          <p className="text-xs text-muted-foreground">Try clearing your search query or selecting "All Subjects".</p>
        </div>
      ) : (
        <div className="space-y-3">
          {shown.map((z) => (
            <QuizCard
              key={z.id}
              quiz={z}
              attempts={attempts.filter((a) => a.quiz_id === z.id)}
              who={who}
              onPlay={() => setPromptQuiz({ quiz: z })}
              onRetry={() => retryMissed(z)}
              onShare={onShareQuiz}
              isCopied={copiedId === z.id}
              onDeleted={refresh}
            />
          ))}
        </div>
      )}

      {promptQuiz && (
        <TimerPromptModal
          title={promptQuiz.quiz.title}
          questionCount={
            promptQuiz.questions?.length ??
            (Array.isArray(promptQuiz.quiz.questions) ? promptQuiz.quiz.questions.length : 0)
          }
          onStart={(timerMinutes) => {
            setPlaying({
              quiz: promptQuiz.quiz,
              questions: promptQuiz.questions,
              timerMinutes,
            });
            setPromptQuiz(null);
          }}
          onClose={() => setPromptQuiz(null)}
        />
      )}

      {/* Floating Share Toast */}
      {shareToast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 max-w-sm w-[90%] rounded-xl border border-primary/40 bg-card/95 backdrop-blur px-4 py-3 shadow-2xl text-xs font-semibold text-foreground flex items-center justify-between gap-2 animate-in slide-in-from-bottom-2">
          <div className="flex items-center gap-2 min-w-0">
            <Check size={16} className="text-emerald-500 shrink-0" />
            <span className="truncate">{shareToast}</span>
          </div>
          <button onClick={() => setShareToast(null)} className="text-muted-foreground hover:text-foreground text-xs font-bold">
            ✕
          </button>
        </div>
      )}
    </div>
  );
}

function MistakeBank({
  mistakes,
  onStartPractice,
}: {
  mistakes: MistakeItem[];
  onStartPractice: (p: { quiz: Quiz; questions: QQ[] }) => void;
}) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set(mistakes.map((m) => m.id)));
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(() => new Set());

  const grouped = useMemo(() => {
    const map = new Map<string, { label: string; quizTitle: string; items: MistakeItem[] }>();
    for (const m of mistakes) {
      if (!map.has(m.chapterKey)) {
        map.set(m.chapterKey, { label: m.chapterLabel, quizTitle: m.quizTitle, items: [] });
      }
      map.get(m.chapterKey)!.items.push(m);
    }
    return Array.from(map.entries()).map(([key, data]) => ({ key, ...data }));
  }, [mistakes]);

  const selectedCount = mistakes.filter((m) => selectedIds.has(m.id)).length;
  const allSelected = mistakes.length > 0 && selectedCount === mistakes.length;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(mistakes.map((m) => m.id)));
    }
  };

  const toggleChapter = (items: MistakeItem[]) => {
    const ids = items.map((m) => m.id);
    const allInChapterSelected = ids.every((id) => selectedIds.has(id));
    const next = new Set(selectedIds);
    if (allInChapterSelected) {
      ids.forEach((id) => next.delete(id));
    } else {
      ids.forEach((id) => next.add(id));
    }
    setSelectedIds(next);
  };

  const toggleQuestion = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const toggleExpand = (key: string) => {
    const next = new Set(expandedChapters);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setExpandedChapters(next);
  };

  const startQuiz = () => {
    const selectedList = mistakes.filter((m) => selectedIds.has(m.id));
    if (!selectedList.length) return;
    const chaptersSelected = [...new Set(selectedList.map((m) => m.chapterLabel))];
    const title =
      chaptersSelected.length === 1
        ? `Mistake Revision · ${chaptersSelected[0]}`
        : `Multi-Chapter Mistake Test (${chaptersSelected.length} Chapters · ${selectedList.length} Qs)`;

    onStartPractice({
      quiz: {
        id: `mistake-rev-${Date.now()}`,
        title,
        chapter: null,
        day: null,
        questions: selectedList.map((m) => m.question),
        created_at: new Date().toISOString(),
        expired: false,
      },
      questions: selectedList.map((m) => m.question),
    });
  };

  if (!mistakes.length) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center bg-card/50">
        <p className="font-semibold text-primary">No mistakes recorded! 🎉</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Great job! Either you have not attempted any quizzes yet, or you answered all questions correctly in your previous attempts.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-card p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="font-semibold text-sm">
              Mistake Bank · {mistakes.length} wrong questions across {grouped.length} {grouped.length === 1 ? "chapter" : "chapters"}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Select one or multiple chapters to test your weak points in a revision quiz.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={toggleSelectAll}>
              {allSelected ? "Deselect All" : "Select All"}
            </Button>
            <Button size="sm" disabled={selectedCount === 0} onClick={startQuiz}>
              <Play size={14} className="mr-1.5" />
              Start Quiz ({selectedCount})
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {grouped.map(({ key, label, items }) => {
          const ids = items.map((m) => m.id);
          const allInChapterSelected = ids.every((id) => selectedIds.has(id));
          const someInChapterSelected = ids.some((id) => selectedIds.has(id));
          const isExpanded = expandedChapters.has(key);
          const selectedInChapter = items.filter((m) => selectedIds.has(m.id)).length;

          return (
            <div key={key} className="rounded-lg border bg-card overflow-hidden transition-all">
              <div className="flex items-center justify-between p-3.5 bg-secondary/30 gap-2">
                <div
                  className="flex items-center gap-3 min-w-0 cursor-pointer select-none flex-1"
                  onClick={() => toggleChapter(items)}
                >
                  <input
                    type="checkbox"
                    checked={allInChapterSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = !allInChapterSelected && someInChapterSelected;
                    }}
                    onChange={() => { }}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{label}</p>
                    <p className="text-xs text-muted-foreground">
                      {items.length} {items.length === 1 ? "question" : "questions"} wrong · {selectedInChapter} selected
                    </p>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleExpand(key)}
                  className="text-xs text-muted-foreground shrink-0"
                >
                  {isExpanded ? "Hide details" : "View questions"}
                </Button>
              </div>

              {isExpanded && (
                <div className="p-3.5 space-y-3 border-t bg-card/60">
                  {items.map((m) => {
                    const isChecked = selectedIds.has(m.id);
                    const q = m.question;
                    return (
                      <div
                        key={m.id}
                        onClick={() => toggleQuestion(m.id)}
                        className={cn(
                          "rounded-lg border p-3 cursor-pointer transition-colors",
                          isChecked ? "border-primary/50 bg-primary/5" : "border-muted bg-secondary/15 hover:bg-secondary/30"
                        )}
                      >
                        <div className="flex items-start gap-2.5">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => { }}
                            className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer shrink-0"
                          />
                          <div className="min-w-0 flex-1 space-y-1.5">
                            <p className="text-sm font-semibold">{en(q.q)}</p>
                            <p className="flex items-center gap-1.5 text-xs text-destructive font-medium">
                              <X size={13} className="shrink-0" />
                              Your answer: {m.userAnswer >= 0 ? en(q.options[m.userAnswer]) : "Not answered"}
                            </p>
                            <p className="flex items-center gap-1.5 text-xs text-primary font-medium">
                              <Check size={13} className="shrink-0" />
                              Correct answer: {en(q.options[m.correctAnswer])}
                            </p>
                            {q.explain && (
                              <p className="text-xs text-muted-foreground bg-secondary/50 p-2 rounded mt-1">
                                <b>Explanation:</b> {en(q.explain)}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {selectedCount > 0 && (
        <div className="sticky bottom-4 z-20 rounded-xl border border-primary/30 bg-card/95 p-3.5 shadow-xl backdrop-blur flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Ready to test:</p>
            <p className="text-sm font-bold text-primary">{selectedCount} Questions Selected</p>
          </div>
          <Button onClick={startQuiz} className="font-semibold shadow-md">
            <Play size={15} className="mr-1.5" />
            Start Mistake Quiz
          </Button>
        </div>
      )}
    </div>
  );
}

function PastResults({ quizzes, attempts, who, onRetry, onChanged }: { quizzes: Quiz[]; attempts: Attempt[]; who: string; onRetry: (z: Quiz) => void; onChanged: () => void }) {
  const [open, setOpen] = useState<string | null>(null);
  const delRes = useServerFn(deleteResults);
  const removeResults = async (z: Quiz) => {
    if (!confirm(`Delete all results of "${z.title}"? This cannot be undone.`)) return;
    try { await delRes({ data: { ...creds(), quizId: z.id } }); onChanged(); } catch (e) { alert(e instanceof Error ? e.message : "Could not delete results."); }
  };
  const list = quizzes.filter((z) => attempts.some((a) => a.quiz_id === z.id));
  if (!list.length) return <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">No past results yet.</p>;
  return (
    <div className="space-y-3">
      {list.map((z) => {
        const best: Record<string, Attempt> = {};
        for (const a of attempts) if (a.quiz_id === z.id && (!best[a.username] || a.score > best[a.username].score)) best[a.username] = a;
        const rows = Object.values(best).sort((a, b) => b.score - a.score);
        const mine = attempts.filter((a) => a.quiz_id === z.id && a.username === who).at(-1);
        const ans = Array.isArray(mine?.answers) ? (mine!.answers as number[]) : [];
        const qList = Array.isArray(z.questions) ? z.questions : [];
        const wrong = mine ? qList.map((x, i) => ({ x, i, a: ans[i] ?? -1 })).filter((w) => w.a !== w.x.answer) : [];
        return (
          <div key={z.id} className="rounded-lg border bg-card p-4">
            <div className="flex items-start justify-between gap-2">
              <p className="font-semibold">{z.title || "Quiz"}</p>
              {who === "arun" && <Button variant="ghost" size="sm" aria-label="Delete results" onClick={() => void removeResults(z)}><Trash2 size={16} className="text-destructive" /></Button>}
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">{qList.length} questions · {new Date(z.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</p>
            <div className="mt-3 space-y-1">
              {rows.map((b, i) => (
                <div key={b.username} className={cn("flex items-center justify-between rounded-md px-2.5 py-1.5 text-sm", b.username === who ? "bg-primary/10" : "bg-secondary/60")}>
                  <span className="flex items-center gap-2">{i === 0 ? <Trophy size={14} className="text-accent" /> : <span className="w-3.5 text-center text-xs text-muted-foreground">{i + 1}</span>}{cap(b.username)}</span>
                  <span className="font-semibold">{b.score}/{b.total}</span>
                </div>
              ))}
            </div>
            {mine && (wrong.length ? (
              <>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Button variant="outline" onClick={() => setOpen(open === z.id ? null : z.id)}>{open === z.id ? "Hide my mistakes" : `View my mistakes (${wrong.length})`}</Button>
                  <Button onClick={() => onRetry(z)}><Play size={16} />Retry missed</Button>
                </div>
                {open === z.id && <div className="mt-3 space-y-2">{wrong.map(({ x, i, a }) => (
                  <div key={i} className="rounded-lg border border-destructive/40 bg-destructive/5 p-3.5">
                    <p className="whitespace-pre-line text-sm font-semibold">{i + 1}. {en(x.q)}</p>
                    <p className="mt-1.5 flex items-center gap-1.5 text-sm"><X size={15} className="text-destructive" />Your answer: {a >= 0 ? en(x.options[a]) : "Not answered"}</p>
                    <p className="mt-1 text-sm"><b>Correct:</b> {en(x.options[x.answer])}</p>
                    {x.explain && <p className="mt-1.5 text-xs text-muted-foreground">{en(x.explain)}</p>}
                  </div>
                ))}</div>}
              </>
            ) : <p className="mt-3 text-sm text-primary">You answered every question correctly.</p>)}
          </div>
        );
      })}
    </div>
  );
}

function QuizCard({
  quiz,
  attempts,
  who,
  onPlay,
  onRetry,
  onShare,
  isCopied,
  onDeleted,
}: {
  quiz: Quiz;
  attempts: Attempt[];
  who: string;
  onPlay: () => void;
  onRetry: () => void;
  onShare: (quiz: Quiz) => void;
  isCopied?: boolean;
  onDeleted: () => void;
}) {
  const del = useServerFn(deleteQuiz);
  const best = useMemo(() => {
    const m: Record<string, Attempt & { tries: number }> = {};
    for (const a of attempts) { const c = m[a.username]; m[a.username] = { ...(c && c.score >= a.score ? c : a), tries: (c?.tries ?? 0) + 1 }; }
    return Object.values(m).sort((a, b) => b.score - a.score);
  }, [attempts]);
  const mine = best.find((b) => b.username === who);
  const lastMine = attempts.filter((a) => a.username === who).at(-1);
  const qList = Array.isArray(quiz.questions) ? quiz.questions : [];
  const missed = lastMine && Array.isArray(lastMine.answers)
    ? qList.filter((x, i) => ((lastMine.answers as number[])[i] ?? -1) !== x.answer).length
    : 0;
  return (
    <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 space-y-3 transition-all shadow-xs hover:border-primary/50">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="rounded-md bg-primary/10 border border-primary/20 text-primary text-[10px] font-black px-2 py-0.5 uppercase tracking-wide">
              {quiz.chapter ? chapterLabel(quiz.chapter) : "General Quiz"}
            </span>
            <span className="text-xs text-muted-foreground font-semibold">
              {qList.length} Questions
            </span>
          </div>
          <p className="font-display font-black text-base text-foreground leading-snug">{quiz.title || "Quiz"}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onShare(quiz)}
            title="Share quiz link with friends"
            className="h-8 px-2.5 text-xs font-semibold text-primary hover:bg-primary/10 gap-1.5 rounded-full"
          >
            {isCopied ? <Check size={14} className="text-emerald-500" /> : <Share2 size={14} />}
            <span>{isCopied ? "Copied" : "Share"}</span>
          </Button>
          {who === "arun" && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full text-muted-foreground hover:text-destructive"
              aria-label="Delete quiz"
              onClick={async () => {
                if (confirm("Delete this quiz and all of its scores?")) {
                  await del({ data: { ...creds(), quizId: quiz.id } });
                  onDeleted();
                }
              }}
            >
              <Trash2 size={15} />
            </Button>
          )}
        </div>
      </div>
      {best.length > 0 && (
        <div className="space-y-1 bg-secondary/35 rounded-xl p-2.5 border border-border/50">
          <p className="text-[10px] font-black uppercase text-muted-foreground tracking-wider mb-1">
            Top Attempts
          </p>
          {best.map((b, i) => (
            <div key={b.username} className={cn("flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs", b.username === who ? "bg-primary/15 font-semibold text-foreground" : "bg-card/70")}>
              <span className="flex items-center gap-2">
                {i === 0 ? <Trophy size={13} className="text-amber-500" /> : <span className="w-3.5 text-center text-xs text-muted-foreground font-bold">{i + 1}</span>}
                {cap(b.username)}
              </span>
              <span className="font-bold">{b.score}/{b.total} <span className="text-[10px] font-normal text-muted-foreground">· {b.tries} {b.tries === 1 ? "try" : "tries"}</span></span>
            </div>
          ))}
        </div>
      )}
      <div className={cn("gap-2 pt-1", missed ? "grid grid-cols-2" : "flex")}>
        <Button className="w-full h-11 rounded-xl font-bold shadow-xs active:scale-[0.98]" onClick={onPlay}>
          <Play size={15} className="mr-1 fill-current" />
          {mine ? "Attempt Again" : "Start Quiz"}
        </Button>
        {missed > 0 && (
          <Button variant="outline" className="w-full h-11 rounded-xl font-bold border-2 active:scale-[0.98]" onClick={onRetry}>
            Retry Missed ({missed})
          </Button>
        )}
      </div>
    </div>
  );
}

export function QuizUpload({ onCreated, mode, defaultChapter }: { onCreated: () => void; mode: "quiz" | "test"; defaultChapter?: string | null }) {
  const create = useServerFn(createQuiz);
  const [subj, setSubj] = useState(() => {
    if (defaultChapter) {
      const dLower = defaultChapter.toLowerCase();
      for (let i = 0; i < SYLLABUS.length; i++) {
        if (SYLLABUS[i].sections.some((s) => s.chapters.some((c) => dLower.includes(c.toLowerCase()) || dLower.includes(s.name.toLowerCase())))) {
          return i;
        }
      }
    }
    return 0;
  });
  const [chap, setChap] = useState(() => defaultChapter ?? "");

  useEffect(() => {
    if (defaultChapter) {
      setChap(defaultChapter);
      const dLower = defaultChapter.toLowerCase();
      for (let i = 0; i < SYLLABUS.length; i++) {
        if (SYLLABUS[i].sections.some((s) => s.chapters.some((c) => dLower.includes(c.toLowerCase()) || dLower.includes(s.name.toLowerCase())))) {
          setSubj(i);
          break;
        }
      }
    }
  }, [defaultChapter]);

  const [files, setFiles] = useState<File[]>([]);
  const [status, setStatus] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const chapters = SYLLABUS[subj].sections.flatMap((s) => s.chapters.map((c) => ({ key: chapterKey(s.name, c), label: `${s.name} · ${c}` })));

  const run = async () => {
    if (!files.length) return;
    const target = mode === "test" ? `test:${SYLLABUS[subj].subject}` : chap;
    if (!target) { setStatus(["Please select a chapter."]); return; }
    setBusy(true); const log: string[] = [];
    for (const f of files) {
      log.push(`${f.name}: parsing…`); setStatus([...log]);
      try {
        const html = await f.text();
        const title = f.name.replace(/\.html?$/i, "").replace(/[_-]+/g, " ").trim() || "Quiz";

        let qs: QQ[] = [];
        try {
          qs = parseQuizHtml(html);
        } catch (parseErr) {
          console.warn("Client parsing warning:", parseErr);
        }

        log[log.length - 1] = `${f.name}: uploading ${qs.length > 0 ? `(${qs.length} questions)` : "file"}…`;
        setStatus([...log]);

        const r = await create({
          data: {
            ...creds(),
            html: qs.length > 0 ? undefined : html,
            questions: qs.length > 0 ? qs : undefined,
            title,
            chapter: target,
            day: null,
          },
        });

        if (!r || typeof r.count !== "number") {
          throw new Error("Server did not return a valid count. Please try again.");
        }

        log[log.length - 1] = `${f.name}: ${r.count} questions added.`;
        onCreated();
      } catch (e) {
        log[log.length - 1] = `${f.name}: ${e instanceof Error ? e.message : "Failed."}`;
      }
      setStatus([...log]);
    }
    setBusy(false); setFiles([]); onCreated();
  };

  return (
    <details className="group rounded-2xl border border-border/80 bg-card/60 overflow-hidden transition shadow-soft">
      <summary className="flex cursor-pointer items-center justify-between px-4 py-3 text-xs font-black uppercase tracking-wider text-muted-foreground hover:text-foreground">
        <span className="flex items-center gap-2">
          <FileUp size={15} className="text-primary" />
          <span>{mode === "test" ? "➕ Admin: Upload Subject Tests from HTML" : "➕ Admin: Upload Quizzes from HTML"}</span>
        </span>
        <span className="text-xs transition-transform group-open:rotate-180">⌄</span>
      </summary>
      <div className="p-4 pt-2 border-t border-border/60 space-y-3 bg-secondary/20">
        <div className="grid gap-2 sm:grid-cols-2">
          <select className="h-10 rounded-xl border bg-card px-3 text-xs font-semibold" value={subj} onChange={(e) => { setSubj(Number(e.target.value)); setChap(""); }}>
            {SYLLABUS.map((s, i) => <option key={s.subject} value={i}>{s.subject}</option>)}
          </select>
          {mode === "quiz" && <select className="h-10 rounded-xl border bg-card px-3 text-xs font-semibold" value={chap} onChange={(e) => setChap(e.target.value)}>
            <option value="">Select chapter</option>
            {chapters.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
          </select>}
        </div>
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border/80 bg-card py-3.5 text-xs font-bold text-muted-foreground hover:text-foreground hover:border-primary/50 transition">
          <FileUp size={16} />{files.length ? `${files.length} file${files.length > 1 ? "s" : ""} selected` : "Choose HTML files"}
          <input type="file" accept=".html,.htm,text/html" multiple className="hidden" onChange={(e) => setFiles(Array.from(e.target.files ?? []))} />
        </label>
        <Button className="w-full rounded-xl py-2.5 text-xs font-bold" disabled={busy || !files.length} onClick={run}>{busy ? "Creating quizzes… this may take a minute" : "Create quizzes"}</Button>
        <p className="text-[11px] text-muted-foreground leading-relaxed">Each file becomes a separate quiz. Questions and correct answers are extracted automatically.</p>
        {status.length > 0 && <div className="space-y-1 text-xs">{status.map((s, i) => <p key={i}>{s}</p>)}</div>}
      </div>
    </details>
  );
}

export function TimerPromptModal({
  title,
  questionCount,
  onStart,
  onClose,
}: {
  title?: string;
  questionCount?: number;
  onStart: (timerMinutes: number | null) => void;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-sm rounded-3xl border border-border/80 bg-card p-5 sm:p-6 shadow-2xl space-y-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-primary">
              <Clock size={13} />
              <span>Timer Settings</span>
            </div>
            <h3 className="text-base font-black text-foreground mt-0.5">Choose Test Time</h3>
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
              {title || "Set a time limit or practice freely"}
            </p>
            {questionCount !== undefined && questionCount > 0 && (
              <span className="inline-block mt-1.5 rounded-full bg-secondary/80 px-2.5 py-0.5 text-[10px] font-black text-muted-foreground border">
                {questionCount} Questions
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-2.5 pt-1">
          {/* Option 1: No Timer */}
          <button
            type="button"
            onClick={() => onStart(null)}
            className="w-full flex items-center justify-between rounded-2xl border-2 border-border/80 bg-secondary/30 p-3.5 hover:bg-secondary/70 hover:border-primary/50 transition active:scale-[0.98] text-left group"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-lg">
                ⚡
              </span>
              <div>
                <p className="text-sm font-bold text-foreground group-hover:text-primary">
                  No Timer (Practice)
                </p>
                <p className="text-[11px] text-muted-foreground">Solve calmly without time limit</p>
              </div>
            </div>
            <span className="text-xs font-bold text-muted-foreground">Untimed</span>
          </button>

          {/* Option 2: 15 Minutes */}
          <button
            type="button"
            onClick={() => onStart(15)}
            className="w-full flex items-center justify-between rounded-2xl border-2 border-border/80 bg-secondary/30 p-3.5 hover:bg-secondary/70 hover:border-amber-500/50 transition active:scale-[0.98] text-left group"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500 text-lg">
                ⏱️
              </span>
              <div>
                <p className="text-sm font-bold text-foreground group-hover:text-amber-500">
                  15 Minutes
                </p>
                <p className="text-[11px] text-muted-foreground">Quick sectional speed drill</p>
              </div>
            </div>
            <span className="rounded-md bg-amber-500/15 px-2 py-0.5 text-xs font-black text-amber-500">
              15 min
            </span>
          </button>

          {/* Option 3: 25 Minutes */}
          <button
            type="button"
            onClick={() => onStart(25)}
            className="w-full flex items-center justify-between rounded-2xl border-2 border-border/80 bg-secondary/30 p-3.5 hover:bg-secondary/70 hover:border-rose-500/50 transition active:scale-[0.98] text-left group"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-500/10 text-rose-500 text-lg">
                ⏳
              </span>
              <div>
                <p className="text-sm font-bold text-foreground group-hover:text-rose-500">
                  25 Minutes
                </p>
                <p className="text-[11px] text-muted-foreground">Standard SSC Tier 1 section time</p>
              </div>
            </div>
            <span className="rounded-md bg-rose-500/15 px-2 py-0.5 text-xs font-black text-rose-500">
              25 min
            </span>
          </button>
        </div>

        <Button variant="ghost" size="sm" className="w-full h-10 rounded-xl text-xs font-bold" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

export function QuizPlayer({
  quiz,
  questions,
  timerMinutes,
  onDone,
}: {
  quiz: Quiz;
  questions?: QQ[] | undefined;
  timerMinutes?: number | null;
  onDone: () => void;
}) {
  const qc = useQueryClient();
  const submit = useServerFn(submitQuiz);
  const qs = questions ?? quiz.questions;
  const practice = Boolean(questions); // retry-missed mode: practice only, score is not saved
  const [ans, setAns] = useState<number[]>(() => qs.map(() => -1));
  const [i, setI] = useState(0);
  const [result, setResult] = useState<{ score: number; total: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [timeExpired, setTimeExpired] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(() =>
    timerMinutes ? timerMinutes * 60 : null
  );

  const ansRef = useRef(ans);
  ansRef.current = ans;

  const qq = qs[i];
  const answered = ans.filter((a) => a >= 0).length;

  const doSubmit = async (isAuto = false) => {
    const currentAns = ansRef.current;
    if (
      !isAuto &&
      answered < currentAns.length &&
      !confirm(`${currentAns.length - answered} questions are unanswered. Submit anyway?`)
    ) {
      return;
    }
    setBusy(true);
    if (isAuto) setTimeExpired(true);
    try {
      if (practice) {
        setResult({
          score: currentAns.filter((a, k) => a === qs[k].answer).length,
          total: qs.length,
        });
      } else {
        const r = await submit({ data: { ...creds(), quizId: quiz.id, answers: currentAns } });
        setResult(r);
        qc.invalidateQueries({ queryKey: ["quizzes"] });
        qc.invalidateQueries({ queryKey: ["all"] });
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : "Unable to submit.");
    }
    setBusy(false);
  };

  useEffect(() => {
    if (secondsLeft === null || result || busy) return;
    if (secondsLeft <= 0) {
      void doSubmit(true);
      return;
    }
    const timer = setInterval(() => {
      setSecondsLeft((s) => {
        if (s === null) return null;
        if (s <= 1) {
          clearInterval(timer);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [secondsLeft, result, busy]);

  const formatTimer = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec < 10 ? "0" : ""}${sec}`;
  };

  if (result)
    return (
      <div className="space-y-4 animate-in fade-in">
        <div className="rounded-3xl border border-border/80 bg-gradient-to-b from-card via-card to-primary/5 p-6 sm:p-8 text-center space-y-3.5 shadow-sm">
          {timeExpired && (
            <span className="inline-block rounded-full bg-destructive/15 text-destructive border border-destructive/30 px-3 py-1 text-xs font-bold mb-1">
              ⏰ Time Expired — Auto-Submitted
            </span>
          )}
          {timerMinutes && (
            <span className="inline-block rounded-full bg-secondary/80 text-muted-foreground border border-border/70 px-3 py-0.5 text-xs font-semibold">
              Timed Test ({timerMinutes} min limit)
            </span>
          )}
          <p className="text-sm font-semibold text-muted-foreground">
            {quiz.title}
            {practice ? " · Missed questions practice" : ""}
          </p>
          <div className="py-2">
            <p className="text-5xl font-black text-foreground tracking-tight">
              {result.score}<span className="text-2xl text-muted-foreground font-bold">/{result.total}</span>
            </p>
            <p className="text-xs font-bold text-primary mt-1">
              {Math.round((result.score / Math.max(result.total, 1)) * 100)}% Accuracy
            </p>
          </div>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            {practice
              ? "Practice score completed. Your mistake bank has been updated!"
              : "Awesome effort! Your score has been synced to the live Leaderboard."}
          </p>
        </div>

        <div className="flex items-center justify-between px-1">
          <p className="text-sm font-black text-foreground">Review Answers & Explanations</p>
          <span className="text-xs font-semibold text-muted-foreground">{qs.length} Questions</span>
        </div>

        {qs.map((x, k) => (
          <div
            key={k}
            className={cn(
              "rounded-2xl border-2 p-4 sm:p-5 space-y-2 transition-all",
              ans[k] === x.answer
                ? "border-emerald-500/35 bg-emerald-500/5"
                : "border-destructive/35 bg-destructive/5"
            )}
          >
            <p className="whitespace-pre-line text-sm font-bold text-foreground">
              {k + 1}. {en(x.q)}
            </p>
            <div className="pt-1 space-y-1 text-xs">
              <p className={cn("flex items-center gap-1.5 font-bold", ans[k] === x.answer ? "text-emerald-600 dark:text-emerald-400" : "text-destructive")}>
                {ans[k] === x.answer ? (
                  <Check size={15} className="shrink-0" />
                ) : (
                  <X size={15} className="shrink-0" />
                )}
                <span>Your answer: {ans[k] >= 0 ? en(x.options[ans[k]]) : "Not answered"}</span>
              </p>
              {ans[k] !== x.answer && (
                <p className="flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400">
                  <Check size={15} className="shrink-0" />
                  <span>Correct: {en(x.options[x.answer])}</span>
                </p>
              )}
            </div>
            {x.explain && (
              <div className="mt-2 text-xs text-muted-foreground bg-secondary/50 rounded-xl p-3 border border-border/50">
                <span className="font-bold text-foreground block mb-0.5">Explanation:</span>
                {en(x.explain)}
              </div>
            )}
          </div>
        ))}

        <div className="grid grid-cols-2 gap-2.5 pt-2">
          <Button
            variant="outline"
            className="w-full h-11 rounded-xl font-bold gap-1.5 border-2 active:scale-[0.98]"
            onClick={async () => {
              const res = await shareQuizLink(quiz);
              if (res.status === "copied" || res.status === "shared") {
                alert(`Quiz link copied! Send it on WhatsApp/Telegram to invite your friends:\n\n${res.url}`);
              }
            }}
          >
            <Share2 size={15} className="text-primary" />
            Share Quiz
          </Button>
          <Button className="w-full h-11 rounded-xl font-bold shadow-sm active:scale-[0.98]" onClick={onDone}>
            Back to Quizzes
          </Button>
        </div>
      </div>
    );

  return (
    <div className="space-y-4 animate-in fade-in">
      <div className="flex items-center justify-between text-sm">
        <Button
          variant="ghost"
          size="sm"
          className="rounded-full px-3 py-1.5 text-xs font-bold text-muted-foreground hover:bg-secondary hover:text-foreground"
          onClick={() => {
            if (confirm("Leave this test? Your answers will not be saved.")) onDone();
          }}
        >
          Exit Test
        </Button>

        {secondsLeft !== null && (
          <div
            className={cn(
              "flex items-center gap-1.5 px-3 py-1 rounded-full font-mono text-xs font-black border transition-all shadow-xs",
              secondsLeft <= 60
                ? "bg-destructive/15 text-destructive border-destructive/40 animate-pulse"
                : secondsLeft <= 300
                  ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/40"
                  : "bg-secondary/90 text-foreground border-border"
            )}
          >
            <Clock
              size={13}
              className={
                secondsLeft <= 60
                  ? "text-destructive"
                  : secondsLeft <= 300
                    ? "text-amber-500"
                    : "text-muted-foreground"
              }
            />
            <span>{formatTimer(secondsLeft)}</span>
          </div>
        )}

        <span className="rounded-full bg-secondary/80 px-2.5 py-1 text-[11px] font-bold text-foreground border border-border/70">
          Q {i + 1} / {qs.length}
          {practice ? " · Missed" : ""}
        </span>
      </div>

      <div className="session-progress h-2 overflow-hidden rounded-full bg-secondary/80 border border-border/40">
        <div
          className="h-full bg-gradient-to-r from-primary to-emerald-400 transition-all duration-300 rounded-full"
          style={{ width: `${((i + 1) / qs.length) * 100}%` }}
        />
      </div>

      <div className="rounded-3xl border border-border/80 bg-card p-5 sm:p-7 shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 border border-primary/25 text-primary text-[10px] font-black px-2.5 py-0.5 uppercase tracking-wide">
            Question {i + 1}
          </span>
          {quiz.chapter && (
            <span className="text-[11px] font-semibold text-muted-foreground truncate">
              {chapterLabel(quiz.chapter)}
            </span>
          )}
        </div>
        <p className="whitespace-pre-line font-bold text-base sm:text-lg text-foreground leading-relaxed">
          {en(qq.q)}
        </p>
        <div className="mt-4 space-y-2.5">
          {qq.options.map((o, k) => (
            <Button
              variant="unstyled"
              key={k}
              aria-pressed={ans[i] === k}
              onClick={() => setAns((a) => a.map((v, j) => (j === i ? k : v)))}
              className={cn(
                "flex w-full items-center rounded-2xl border-2 px-4 py-3.5 text-left text-sm transition-all active:scale-[0.98]",
                ans[i] === k
                  ? "border-primary bg-primary/10 font-bold text-foreground shadow-xs ring-1 ring-primary/40"
                  : "border-border/70 bg-card/60 hover:bg-secondary/40 text-foreground/90 font-medium"
              )}
            >
              <span
                className={cn(
                  "mr-3.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border text-xs font-black transition-all",
                  ans[i] === k
                    ? "border-primary bg-primary text-primary-foreground shadow-xs scale-105"
                    : "border-border/70 bg-secondary/80 text-muted-foreground"
                )}
              >
                {String.fromCharCode(65 + k)}
              </span>
              <span className="min-w-0 break-words leading-snug">{en(o)}</span>
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5 pt-1">
        <Button
          variant="outline"
          disabled={i === 0}
          onClick={() => setI(i - 1)}
          className="h-12 rounded-xl text-sm font-bold border-2 active:scale-[0.98]"
        >
          Previous
        </Button>
        {i < qs.length - 1 ? (
          <Button
            onClick={() => setI(i + 1)}
            className="h-12 rounded-xl text-sm font-black shadow-sm active:scale-[0.98]"
          >
            Next Question
          </Button>
        ) : (
          <Button
            disabled={busy}
            onClick={() => doSubmit(false)}
            className="h-12 rounded-xl text-sm font-black shadow-sm active:scale-[0.98] bg-primary text-primary-foreground"
          >
            {busy ? "Submitting…" : "Submit Quiz"}
          </Button>
        )}
      </div>
    </div>
  );
}

