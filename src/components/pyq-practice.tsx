import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  FileUp,
  Trash2,
  Trophy,
  Play,
  Check,
  X,
  Clock,
  Search,
  BookOpen,
  RotateCcw,
  Sparkles,
  HelpCircle,
  AlertCircle,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  createQuiz,
  deleteQuiz,
  deleteResults,
  listQuizzes,
  cleanText,
  type QQ,
} from "@/lib/quiz.functions";
import { QuizPlayer, TimerPromptModal } from "@/components/quiz-zone";

type Quiz = {
  id: string;
  title: string;
  chapter: string | null;
  day: string | null;
  questions: QQ[];
  created_at: string;
  expired: boolean;
};

type Attempt = {
  quiz_id: string;
  username: string;
  score: number;
  total: number;
  answers: unknown;
  at: string;
};

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const creds = () => {
  try {
    const a = JSON.parse(localStorage.getItem("arena-auth") ?? "{}");
    return { username: a.username ?? "", password: a.password ?? "" };
  } catch {
    return { username: "", password: "" };
  }
};

const en = (raw: string) => cleanText(raw);

const EXAM_OPTIONS = [
  { key: "all", label: "All Exams" },
  { key: "cgl", label: "CGL" },
  { key: "chsl", label: "CHSL" },
  { key: "cpo", label: "CPO" },
  { key: "mts", label: "MTS" },
  { key: "general", label: "General SSC" },
] as const;

const SUBJECT_OPTIONS = [
  { key: "all", label: "All Subjects" },
  { key: "full", label: "Full Paper 📝" },
  { key: "maths", label: "Maths 🔢" },
  { key: "reasoning", label: "Reasoning 🧩" },
  { key: "english", label: "English 📖" },
  { key: "ga", label: "GS / GK 🌍" },
] as const;

function usePYQQuizzes() {
  const list = useServerFn(listQuizzes);
  return useQuery({
    queryKey: ["quizzes"],
    queryFn: () => list({ data: creds() }),
    staleTime: 0,
    refetchInterval: 4000,
    refetchOnWindowFocus: true,
  });
}

export function PYQPracticeZone({ who }: { who: string }) {
  const qc = useQueryClient();
  const q = usePYQQuizzes();
  const [playing, setPlaying] = useState<{
    quiz: Quiz;
    questions?: QQ[];
    timerMinutes: number | null;
  } | null>(null);
  const [promptQuiz, setPromptQuiz] = useState<{ quiz: Quiz; questions?: QQ[] } | null>(null);
  const [filter, setFilter] = useState<"active" | "past" | "mistakes">("active");
  const [examFilter, setExamFilter] = useState<string>("all");
  const [subjectFilter, setSubjectFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const refresh = () => qc.invalidateQueries({ queryKey: ["quizzes"] });

  // Filter quizzes that are tagged as PYQ: chapter starts with "pyq:" or title contains "pyq" or "shift"
  const allPYQs = useMemo(() => {
    const list = ((q.data?.quizzes ?? []) as Quiz[]).filter((z) => {
      const ch = String(z.chapter || "").toLowerCase();
      const t = String(z.title || "").toLowerCase();
      return ch.startsWith("pyq:") || t.includes("pyq") || t.includes("shift") || t.includes("previous year");
    });
    return list;
  }, [q.data]);

  const activePYQs = useMemo(() => allPYQs.filter((z) => !z.expired), [allPYQs]);
  const attempts = (q.data?.attempts ?? []) as Attempt[];

  // Filtered list
  const shown = useMemo(() => {
    return activePYQs.filter((z) => {
      const ch = String(z.chapter || "").toLowerCase();
      const t = String(z.title || "").toLowerCase();

      // Exam filter
      if (examFilter !== "all") {
        if (!ch.includes(`pyq:${examFilter}`) && !t.includes(examFilter)) return false;
      }

      // Subject filter
      if (subjectFilter !== "all") {
        if (subjectFilter === "full") {
          if (!ch.includes("full") && !t.includes("full") && !t.includes("tier 1") && !t.includes("tier 2")) return false;
        } else if (subjectFilter === "maths") {
          if (!ch.includes("math") && !t.includes("math") && !t.includes("quant")) return false;
        } else if (subjectFilter === "reasoning") {
          if (!ch.includes("reasoning") && !t.includes("reasoning")) return false;
        } else if (subjectFilter === "english") {
          if (!ch.includes("english") && !t.includes("english")) return false;
        } else if (subjectFilter === "ga") {
          if (!ch.includes("ga") && !ch.includes("gs") && !t.includes("ga") && !t.includes("gs") && !t.includes("general awareness") && !t.includes("gk")) return false;
        }
      }

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        if (!t.includes(query) && !ch.includes(query)) return false;
      }

      return true;
    });
  }, [activePYQs, examFilter, subjectFilter, searchQuery]);

  // Mistakes bank for PYQ
  const allMistakes = useMemo(() => {
    const list: {
      id: string;
      quizId: string;
      quizTitle: string;
      qIndex: number;
      question: QQ;
      userAnswer: number;
      correctAnswer: number;
    }[] = [];

    for (const z of allPYQs) {
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
            quizTitle: z.title || "PYQ Paper",
            qIndex: i,
            question: x,
            userAnswer: a,
            correctAnswer: x.answer,
          });
        }
      });
    }
    return list;
  }, [allPYQs, attempts, who]);

  const retryMissed = (z: Quiz) => {
    const mine = attempts.filter((a) => a.quiz_id === z.id && a.username === who).at(-1);
    if (!mine || !Array.isArray(mine.answers)) return;
    const ans = mine.answers as number[];
    const qList = Array.isArray(z.questions) ? z.questions : [];
    const wrong = qList.filter((x, i) => (ans[i] ?? -1) !== x.answer);
    if (wrong.length) setPromptQuiz({ quiz: z, questions: wrong });
  };

  if (playing) {
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
  }

  return (
    <div className="space-y-4">
      {/* Top Header Banner */}
      <div className="rounded-2xl border-2 border-primary/20 bg-gradient-to-r from-primary/10 via-card to-card p-5 space-y-2 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="rounded bg-primary/15 text-primary text-xs font-black uppercase tracking-wider px-2.5 py-0.5">
            Previous Year Question Arena
          </span>
          <span className="text-xs text-muted-foreground font-semibold">User: {cap(who)}</span>
        </div>
        <p className="font-display text-lg sm:text-xl font-black text-foreground">
          SSC PYQ Papers & Timed Exam Drills
        </p>
        <p className="text-xs text-muted-foreground max-w-2xl leading-relaxed">
          Attempt authentic SSC CGL, CHSL, CPO & MTS shift papers. Choose between <b>No Timer (Untimed Practice)</b>, <b>15 Minutes (Sprint Speed)</b>, or <b>25 Minutes (Sectional Exam Mode)</b>.
        </p>
      </div>

      {/* Admin Upload Section for PYQ */}
      {who === "arun" && <PYQUpload onCreated={refresh} />}

      {/* Main Mode Tabs (Active, Past, Mistakes) */}
      <div className="practice-tabs flex gap-1.5 overflow-x-auto pb-1">
        {([
          ["active", `Active PYQ Papers (${activePYQs.length})`],
          ["past", "Past PYQ Results"],
          ["mistakes", `PYQ Mistake Bank (${allMistakes.length})`],
        ] as const).map(([k, l]) => (
          <Button
            variant="unstyled"
            key={k}
            aria-pressed={filter === k}
            onClick={() => setFilter(k)}
            className={cn(
              "shrink-0 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors",
              filter === k
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-secondary text-muted-foreground hover:bg-secondary/80"
            )}
          >
            {l}
          </Button>
        ))}
      </div>

      {filter === "active" && (
        <div className="space-y-3">
          {/* Exam Filters */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {EXAM_OPTIONS.map((e) => (
              <Button
                variant="unstyled"
                key={e.key}
                onClick={() => setExamFilter(e.key)}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-bold shrink-0 transition border",
                  examFilter === e.key
                    ? "bg-primary text-primary-foreground border-primary shadow-xs"
                    : "bg-secondary/60 text-muted-foreground border-border/70 hover:bg-secondary"
                )}
              >
                {e.label}
              </Button>
            ))}
          </div>

          {/* Subject Filters */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {SUBJECT_OPTIONS.map((s) => (
              <Button
                variant="unstyled"
                key={s.key}
                onClick={() => setSubjectFilter(s.key)}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-bold shrink-0 transition border",
                  subjectFilter === s.key
                    ? "bg-primary/20 text-primary border-primary/50 shadow-xs"
                    : "bg-secondary/40 text-muted-foreground border-border/50 hover:bg-secondary"
                )}
              >
                {s.label}
              </Button>
            ))}
          </div>

          {/* Search Bar */}
          <div className="flex items-center gap-2">
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search PYQ papers by shift, year, or topic (e.g. CGL 2024, CHSL Shift 1, Mensuration)..."
              className="w-full rounded-xl border-2 border-border/70 bg-secondary/40 px-3.5 py-2 text-xs outline-none focus:border-primary transition"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearchQuery("")}
                className="h-8 text-xs text-muted-foreground shrink-0"
              >
                Clear
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      {q.isLoading ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Loading PYQ papers…</p>
      ) : q.isError ? (
        <p className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm">
          Unable to load PYQs.{" "}
          <Button variant="unstyled" onClick={() => q.refetch()} className="font-bold underline">
            Try again
          </Button>
        </p>
      ) : filter === "past" ? (
        <PYQPastResults
          quizzes={allPYQs}
          attempts={attempts}
          who={who}
          onRetry={retryMissed}
          onChanged={refresh}
          onLaunch={(quiz) => setPromptQuiz({ quiz })}
        />
      ) : filter === "mistakes" ? (
        <PYQMistakeBank
          mistakes={allMistakes}
          onStartPractice={({ quiz, questions }) => setPromptQuiz({ quiz, questions })}
        />
      ) : shown.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center bg-card space-y-2">
          <FileText size={36} className="mx-auto text-muted-foreground/60" />
          <p className="text-sm font-bold text-foreground">No PYQ papers found.</p>
          <p className="text-xs text-muted-foreground">
            {who === "arun"
              ? "Upload an HTML answer key or question file above to create the first PYQ paper."
              : "No PYQs uploaded for this filter yet. Ask Arun to upload shift papers."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {shown.map((z) => (
            <PYQCard
              key={z.id}
              quiz={z}
              attempts={attempts.filter((a) => a.quiz_id === z.id)}
              who={who}
              onPlay={() => setPromptQuiz({ quiz: z })}
              onRetry={() => retryMissed(z)}
              onDeleted={refresh}
            />
          ))}
        </div>
      )}

      {/* Timer Selection Modal before starting test */}
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
    </div>
  );
}

function PYQCard({
  quiz,
  attempts,
  who,
  onPlay,
  onRetry,
  onDeleted,
}: {
  quiz: Quiz;
  attempts: Attempt[];
  who: string;
  onPlay: () => void;
  onRetry: () => void;
  onDeleted: () => void;
}) {
  const del = useServerFn(deleteQuiz);
  const best = useMemo(() => {
    const m: Record<string, Attempt & { tries: number }> = {};
    for (const a of attempts) {
      const c = m[a.username];
      m[a.username] = { ...(c && c.score >= a.score ? c : a), tries: (c?.tries ?? 0) + 1 };
    }
    return Object.values(m).sort((a, b) => b.score - a.score);
  }, [attempts]);

  const mine = best.find((b) => b.username === who);
  const lastMine = attempts.filter((a) => a.username === who).at(-1);
  const qList = Array.isArray(quiz.questions) ? quiz.questions : [];
  const missed =
    lastMine && Array.isArray(lastMine.answers)
      ? qList.filter((x, i) => ((lastMine.answers as number[])[i] ?? -1) !== x.answer).length
      : 0;

  const rawChapter = quiz.chapter || "";
  const displayTag = rawChapter.startsWith("pyq:")
    ? rawChapter.replace("pyq:", "").toUpperCase()
    : "SSC PYQ";

  return (
    <div className="rounded-2xl border-2 border-border/80 bg-card p-4 sm:p-5 space-y-3 transition-all shadow-xs hover:border-primary/50">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="rounded-md bg-primary/10 border border-primary/25 text-primary text-[10px] font-black px-2 py-0.5">
              {displayTag}
            </span>
            <span className="text-xs text-muted-foreground font-semibold">
              {qList.length} Questions
            </span>
            <span className="text-xs text-muted-foreground">·</span>
            <span className="text-xs text-muted-foreground font-medium">
              {new Date(quiz.created_at).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
              })}
            </span>
          </div>
          <p className="font-display font-black text-base text-foreground">{quiz.title}</p>
        </div>
        {who === "arun" && (
          <Button
            variant="ghost"
            size="icon"
            aria-label="Delete quiz"
            onClick={async () => {
              if (confirm(`Delete PYQ paper "${quiz.title}" and all player scores?`)) {
                await del({ data: { ...creds(), quizId: quiz.id } });
                onDeleted();
              }
            }}
          >
            <Trash2 size={17} className="text-muted-foreground hover:text-destructive" />
          </Button>
        )}
      </div>

      {/* Leaderboard rows */}
      {best.length > 0 && (
        <div className="space-y-1 bg-secondary/30 rounded-xl p-2.5 border border-border/50">
          <p className="text-[10px] font-black uppercase text-muted-foreground tracking-wider mb-1">
            Top Attempts
          </p>
          {best.map((b, i) => (
            <div
              key={b.username}
              className={cn(
                "flex items-center justify-between rounded-lg px-2.5 py-1 text-xs",
                b.username === who ? "bg-primary/15 font-bold" : "bg-card/70 font-medium"
              )}
            >
              <span className="flex items-center gap-1.5">
                {i === 0 ? (
                  <Trophy size={13} className="text-amber-500" />
                ) : (
                  <span className="w-3 text-center text-[11px] text-muted-foreground">{i + 1}</span>
                )}
                {cap(b.username)}
              </span>
              <span className="font-black text-foreground">
                {b.score}/{b.total}{" "}
                <span className="text-[10px] text-muted-foreground font-normal">
                  ({b.tries} {b.tries === 1 ? "try" : "tries"})
                </span>
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Launch Actions */}
      <div className={cn("gap-2 pt-1", missed ? "grid grid-cols-2" : "flex")}>
        <Button onClick={onPlay} className="flex-1 font-bold rounded-xl shadow-xs">
          <Play size={15} className="mr-1.5" />
          {mine ? "Re-attempt PYQ" : "Start PYQ Test"}
        </Button>
        {missed > 0 && (
          <Button variant="outline" onClick={onRetry} className="flex-1 font-bold rounded-xl">
            <RotateCcw size={14} className="mr-1.5 text-primary" />
            Retry Missed ({missed})
          </Button>
        )}
      </div>
    </div>
  );
}

function PYQUpload({ onCreated }: { onCreated: () => void }) {
  const create = useServerFn(createQuiz);
  const [exam, setExam] = useState("cgl");
  const [subject, setSubject] = useState("full");
  const [files, setFiles] = useState<File[]>([]);
  const [status, setStatus] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    if (!files.length) return;
    setBusy(true);
    const log: string[] = [];
    for (const f of files) {
      log.push(`${f.name}: parsing…`);
      setStatus([...log]);
      try {
        const html = await f.text();
        const cleanTitle =
          f.name
            .replace(/\.html?$/i, "")
            .replace(/[_-]+/g, " ")
            .trim() || "SSC PYQ Paper";
        const tag = `pyq:${exam}:${subject}`;
        const r = await create({
          data: {
            ...creds(),
            html,
            title: cleanTitle,
            chapter: tag,
            day: null,
          },
        });
        log[log.length - 1] = `✅ ${f.name}: ${r.count} questions added to ${exam.toUpperCase()} PYQ.`;
        onCreated();
      } catch (e) {
        log[log.length - 1] = `❌ ${f.name}: ${e instanceof Error ? e.message : "Failed to parse."}`;
      }
      setStatus([...log]);
    }
    setBusy(false);
    setFiles([]);
    onCreated();
  };

  return (
    <div className="space-y-3.5 rounded-2xl border-2 border-primary/30 bg-primary/5 p-4 sm:p-5 shadow-xs">
      <div className="flex items-center gap-2">
        <span className="rounded bg-primary text-primary-foreground text-[10px] font-black uppercase px-2 py-0.5">
          Admin Uploader
        </span>
        <p className="font-display font-black text-sm text-foreground">
          Upload SSC PYQ Papers from HTML Files
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div>
          <label className="text-[11px] font-bold text-muted-foreground block mb-1">
            Exam Name
          </label>
          <select
            className="w-full h-10 rounded-xl border bg-card px-3 text-xs font-semibold"
            value={exam}
            onChange={(e) => setExam(e.target.value)}
          >
            <option value="cgl">SSC CGL</option>
            <option value="chsl">SSC CHSL</option>
            <option value="cpo">SSC CPO</option>
            <option value="mts">SSC MTS</option>
            <option value="general">General / Other SSC</option>
          </select>
        </div>

        <div>
          <label className="text-[11px] font-bold text-muted-foreground block mb-1">
            Paper Content / Subject
          </label>
          <select
            className="w-full h-10 rounded-xl border bg-card px-3 text-xs font-semibold"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          >
            <option value="full">Full Paper (All 4 Subjects)</option>
            <option value="maths">Maths Section</option>
            <option value="reasoning">Reasoning Section</option>
            <option value="english">English Section</option>
            <option value="ga">General Awareness (GS)</option>
          </select>
        </div>
      </div>

      <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-primary/40 bg-card py-4 text-xs font-bold text-muted-foreground hover:border-primary transition">
        <FileUp size={16} className="text-primary" />
        {files.length
          ? `${files.length} file${files.length > 1 ? "s" : ""} selected for upload`
          : "Choose HTML PYQ shift files"}
        <input
          type="file"
          accept=".html,.htm,text/html"
          multiple
          className="hidden"
          onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
        />
      </label>

      <Button
        className="w-full font-bold rounded-xl shadow-xs"
        disabled={busy || !files.length}
        onClick={run}
      >
        {busy ? "Parsing & creating PYQ papers…" : `Upload & Create ${files.length ? `(${files.length} Files)` : "PYQ Papers"}`}
      </Button>

      {status.length > 0 && (
        <div className="space-y-1 text-xs bg-card/60 p-2.5 rounded-lg border">
          {status.map((s, i) => (
            <p key={i} className="font-medium">
              {s}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

function PYQPastResults({
  quizzes,
  attempts,
  who,
  onRetry,
  onChanged,
  onLaunch,
}: {
  quizzes: Quiz[];
  attempts: Attempt[];
  who: string;
  onRetry: (z: Quiz) => void;
  onChanged: () => void;
  onLaunch: (z: Quiz) => void;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const delRes = useServerFn(deleteResults);

  const removeResults = async (z: Quiz) => {
    if (!confirm(`Delete all results of "${z.title}"? This cannot be undone.`)) return;
    try {
      await delRes({ data: { ...creds(), quizId: z.id } });
      onChanged();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Could not delete results.");
    }
  };

  const list = quizzes.filter((z) => attempts.some((a) => a.quiz_id === z.id));
  if (!list.length) {
    return (
      <p className="rounded-xl border border-dashed p-8 text-center text-xs text-muted-foreground">
        No past PYQ attempts yet. Start practicing an active paper above!
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {list.map((z) => {
        const best: Record<string, Attempt> = {};
        for (const a of attempts) {
          if (a.quiz_id === z.id && (!best[a.username] || a.score > best[a.username].score)) {
            best[a.username] = a;
          }
        }
        const rows = Object.values(best).sort((a, b) => b.score - a.score);
        const mine = attempts.filter((a) => a.quiz_id === z.id && a.username === who).at(-1);
        const ans = Array.isArray(mine?.answers) ? (mine!.answers as number[]) : [];
        const qList = Array.isArray(z.questions) ? z.questions : [];
        const wrong = mine
          ? qList
              .map((x, i) => ({ x, i, a: ans[i] ?? -1 }))
              .filter((w) => w.a !== w.x.answer)
          : [];

        return (
          <div key={z.id} className="rounded-2xl border bg-card p-4 space-y-3 shadow-xs">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-bold text-sm text-foreground">{z.title}</p>
                <p className="text-xs text-muted-foreground">
                  {qList.length} questions · Attempted
                </p>
              </div>
              {who === "arun" && (
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label="Delete results"
                  onClick={() => void removeResults(z)}
                >
                  <Trash2 size={15} className="text-destructive" />
                </Button>
              )}
            </div>

            <div className="space-y-1 bg-secondary/30 rounded-xl p-2.5 border">
              {rows.map((b, i) => (
                <div
                  key={b.username}
                  className={cn(
                    "flex items-center justify-between rounded-lg px-2.5 py-1 text-xs",
                    b.username === who ? "bg-primary/15 font-bold" : "bg-card font-medium"
                  )}
                >
                  <span className="flex items-center gap-1.5">
                    {i === 0 ? (
                      <Trophy size={13} className="text-amber-500" />
                    ) : (
                      <span className="w-3 text-center text-muted-foreground">{i + 1}</span>
                    )}
                    {cap(b.username)}
                  </span>
                  <span className="font-bold">
                    {b.score}/{b.total}
                  </span>
                </div>
              ))}
            </div>

            {mine && (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs font-semibold rounded-xl"
                    onClick={() => setOpen(open === z.id ? null : z.id)}
                  >
                    {open === z.id ? "Hide details" : `View mistakes (${wrong.length})`}
                  </Button>
                  <Button
                    size="sm"
                    className="text-xs font-bold rounded-xl"
                    onClick={() => onRetry(z)}
                  >
                    <RotateCcw size={13} className="mr-1" />
                    Retry missed
                  </Button>
                </div>

                {open === z.id && wrong.length > 0 && (
                  <div className="space-y-2 pt-1">
                    {wrong.map(({ x, i, a }) => (
                      <div
                        key={i}
                        className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 space-y-1 text-xs"
                      >
                        <p className="font-bold text-foreground">
                          {i + 1}. {en(x.q)}
                        </p>
                        <p className="text-destructive font-medium flex items-center gap-1">
                          <X size={13} /> Your answer: {a >= 0 ? en(x.options[a]) : "Not answered"}
                        </p>
                        <p className="text-primary font-bold flex items-center gap-1">
                          <Check size={13} /> Correct answer: {en(x.options[x.answer])}
                        </p>
                        {x.explain && (
                          <p className="text-muted-foreground bg-secondary/50 p-2 rounded mt-1">
                            <b>Explanation:</b> {en(x.explain)}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function PYQMistakeBank({
  mistakes,
  onStartPractice,
}: {
  mistakes: {
    id: string;
    quizId: string;
    quizTitle: string;
    qIndex: number;
    question: QQ;
    userAnswer: number;
    correctAnswer: number;
  }[];
  onStartPractice: (p: { quiz: Quiz; questions: QQ[] }) => void;
}) {
  if (!mistakes.length) {
    return (
      <div className="rounded-xl border border-dashed p-8 text-center space-y-2 bg-card">
        <Trophy size={36} className="mx-auto text-primary" />
        <p className="text-sm font-bold text-foreground">No mistakes in PYQ papers!</p>
        <p className="text-xs text-muted-foreground">
          Great job! Whenever you answer any question wrong in a PYQ paper, it will appear here for targeted revision.
        </p>
      </div>
    );
  }

  const startAllMistakes = () => {
    const dummyQuiz: Quiz = {
      id: "mistakes-pyq",
      title: "PYQ Mistake Revision Test",
      chapter: "pyq:mistakes",
      day: null,
      questions: mistakes.map((m) => m.question),
      created_at: new Date().toISOString(),
      expired: false,
    };
    onStartPractice({ quiz: dummyQuiz, questions: mistakes.map((m) => m.question) });
  };

  return (
    <div className="space-y-3">
      <div className="rounded-xl border bg-primary/5 border-primary/30 p-4 flex items-center justify-between gap-3">
        <div>
          <p className="font-bold text-sm text-foreground">
            {mistakes.length} Wrong Questions Across PYQ Papers
          </p>
          <p className="text-xs text-muted-foreground">
            Re-test all your mistakes with the 15 min or 25 min timer!
          </p>
        </div>
        <Button onClick={startAllMistakes} className="font-bold text-xs rounded-xl shadow-xs shrink-0">
          <Play size={14} className="mr-1" /> Re-test All Mistakes
        </Button>
      </div>

      <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
        {mistakes.map((m, idx) => (
          <div key={m.id} className="rounded-xl border p-3.5 bg-card space-y-1.5 text-xs">
            <div className="flex items-center justify-between text-muted-foreground text-[11px] font-semibold">
              <span>{m.quizTitle}</span>
              <span>Q#{m.qIndex + 1}</span>
            </div>
            <p className="font-bold text-foreground text-sm">{en(m.question.q)}</p>
            <p className="text-destructive font-medium flex items-center gap-1">
              <X size={13} /> Your Answer:{" "}
              {m.userAnswer >= 0 ? en(m.question.options[m.userAnswer]) : "Not answered"}
            </p>
            <p className="text-primary font-bold flex items-center gap-1">
              <Check size={13} /> Correct Answer: {en(m.question.options[m.correctAnswer])}
            </p>
            {m.question.explain && (
              <p className="text-muted-foreground bg-secondary/50 p-2 rounded mt-1 text-[11px]">
                <b>Explanation:</b> {en(m.question.explain)}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
