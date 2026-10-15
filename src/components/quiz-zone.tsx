import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { FileUp, Trash2, Trophy, Play, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SYLLABUS, chapterKey } from "@/lib/syllabus";
import { createQuiz, deleteQuiz, deleteResults, listQuizzes, submitQuiz, cleanText, type QQ } from "@/lib/quiz.functions";

type Quiz = { id: string; title: string; chapter: string | null; day: string | null; questions: QQ[]; created_at: string; expired: boolean };
type Attempt = { quiz_id: string; username: string; score: number; total: number; answers: unknown; at: string };
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const creds = () => { try { const a = JSON.parse(localStorage.getItem("arena-auth") ?? "{}"); return { username: a.username ?? "", password: a.password ?? "" }; } catch { return { username: "", password: "" }; } };
// Quizzes show content as-is (Bilingual/English/Hindi and matching tables fully preserved):
export const en = (raw: string) => cleanText(raw);
const chapterLabel = (k: string) => k.startsWith("test:") ? `${k.slice(5)} test` : k.split("|").join(" · ");

function useQuizzes() {
  const list = useServerFn(listQuizzes);
  return useQuery({
    queryKey: ["quizzes"],
    queryFn: () => list({ data: creds() }),
    staleTime: 0,
    refetchInterval: 4000,
    refetchOnWindowFocus: true,
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
      const ch = qz.find((z) => z.id === a.quiz_id)?.chapter;
      if (ch && (!out[ch] || a.score / a.total > out[ch].score / out[ch].total)) out[ch] = { score: a.score, total: a.total };
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
      if (!z.expired && z.chapter) {
        out[z.chapter] = { id: z.id, title: z.title, count: z.questions.length, quiz: z };
      }
    }
    return out;
  }, [q.data]);
}

export function detectQuizSubject(quiz: { chapter?: string | null; title: string }): "maths" | "reasoning" | "english" | "ga" | "test" {
  const ch = (quiz.chapter || "").toLowerCase();
  const t = quiz.title.toLowerCase();
  if (ch.startsWith("test:") || t.includes("mock") || t.includes("full test")) return "test";
  
  if (SYLLABUS[0].sections.some((s) => ch.includes(s.name.toLowerCase()) || s.chapters.some((c) => ch.includes(c.toLowerCase())))) return "maths";
  if (SYLLABUS[1].sections.some((s) => ch.includes(s.name.toLowerCase()) || s.chapters.some((c) => ch.includes(c.toLowerCase())))) return "reasoning";
  if (SYLLABUS[2].sections.some((s) => ch.includes(s.name.toLowerCase()) || s.chapters.some((c) => ch.includes(c.toLowerCase())))) return "english";
  if (SYLLABUS[3].sections.some((s) => ch.includes(s.name.toLowerCase()) || s.chapters.some((c) => ch.includes(c.toLowerCase())))) return "ga";
  
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
            return (
              <div key={z.id} className="rounded-lg bg-secondary/60 p-3">
                <p className="font-semibold">{z.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{z.questions.length} questions{z.chapter ? ` · ${chapterLabel(z.chapter)}` : ""}</p>
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

export function QuizZone({ who, mode = "quiz", targetChapter }: { who: string; mode?: "quiz" | "test"; targetChapter?: string }) {
  const qc = useQueryClient();
  const q = useQuizzes();
  const [playing, setPlaying] = useState<{ quiz: Quiz; questions?: QQ[] } | null>(null);
  const [filter, setFilter] = useState<"active" | "past" | "mistakes">("active");
  const [subjectFilter, setSubjectFilter] = useState<"all" | "maths" | "reasoning" | "english" | "ga" | "test">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTargetChapter, setSelectedTargetChapter] = useState<string | null>(targetChapter ?? null);

  const all = ((q.data?.quizzes ?? []) as Quiz[]).filter((z) => (mode === "test") === !!z.chapter?.startsWith("test:"));
  const quizzes = all.filter((z) => !z.expired);
  const attempts = (q.data?.attempts ?? []) as Attempt[];

  const refresh = () => qc.invalidateQueries({ queryKey: ["quizzes"] });

  // Update target chapter if prop changes
  useEffect(() => {
    if (targetChapter) {
      setSelectedTargetChapter(targetChapter);
      setFilter("active");
    }
  }, [targetChapter]);

  // Find target quiz if navigating from syllabus
  const targetQuiz = useMemo(() => {
    if (!selectedTargetChapter) return null;
    return quizzes.find((z) => z.chapter === selectedTargetChapter) || null;
  }, [quizzes, selectedTargetChapter]);

  // Filtered quizzes by subject and sub-topic query
  const shown = useMemo(() => {
    return quizzes.filter((z) => {
      // If targeting a specific chapter from syllabus
      if (selectedTargetChapter && z.chapter === selectedTargetChapter) return true;

      // Subject filter
      if (subjectFilter !== "all") {
        const s = detectQuizSubject(z);
        if (s !== subjectFilter) return false;
      }

      // Search query across title and chapter label
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchTitle = z.title.toLowerCase().includes(query);
        const matchChapter = (z.chapter || "").toLowerCase().includes(query);
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
      z.questions.forEach((x, i) => {
        const a = ans[i] ?? -1;
        if (a !== x.answer) {
          list.push({
            id: `${z.id}-${i}`,
            quizId: z.id,
            quizTitle: z.title,
            chapterKey: z.chapter || z.title,
            chapterLabel: z.chapter ? chapterLabel(z.chapter) : z.title,
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
    const wrong = z.questions.filter((x, i) => (ans[i] ?? -1) !== x.answer);
    if (wrong.length) setPlaying({ quiz: z, questions: wrong });
  };

  if (playing) return <QuizPlayer quiz={playing.quiz} questions={playing.questions} onDone={() => { setPlaying(null); refresh(); }} />;

  return (
    <div className="space-y-4">
      {who === "arun" && <QuizUpload onCreated={refresh} mode={mode} />}

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
              {targetQuiz ? `Uploaded & ready · ${targetQuiz.questions.length} questions` : "No quiz uploaded for this chapter yet."}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {targetQuiz && (
              <Button size="sm" onClick={() => setPlaying({ quiz: targetQuiz })} className="font-bold text-xs shadow-md">
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
      <div className="practice-tabs flex gap-1.5 overflow-x-auto pb-1">
        {([
          ["active", "Active quizzes"],
          ["past", "Past results"],
          ["mistakes", `Mistake Bank (${allMistakes.length})`],
        ] as const).map(([k, l]) => (
          <Button
            variant="unstyled"
            key={k}
            aria-pressed={filter === k}
            onClick={() => setFilter(k)}
            className={cn(
              "shrink-0 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors",
              filter === k ? "bg-primary text-primary-foreground shadow-sm" : "bg-secondary text-muted-foreground hover:bg-secondary/80"
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
        <p className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm">
          Unable to load quizzes. <Button variant="unstyled" onClick={() => q.refetch()} className="font-bold underline">Try again</Button>
        </p>
      ) : filter === "past" ? (
        <PastResults quizzes={all} attempts={attempts} who={who} onRetry={retryMissed} onChanged={refresh} />
      ) : filter === "mistakes" ? (
        <MistakeBank
          mistakes={allMistakes}
          onStartPractice={({ quiz, questions }) => setPlaying({ quiz, questions })}
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
              onPlay={() => setPlaying({ quiz: z })}
              onRetry={() => retryMissed(z)}
              onDeleted={refresh}
            />
          ))}
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
                    onChange={() => {}}
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
                            onChange={() => {}}
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
        const wrong = mine ? z.questions.map((x, i) => ({ x, i, a: ans[i] ?? -1 })).filter((w) => w.a !== w.x.answer) : [];
        return (
          <div key={z.id} className="rounded-lg border bg-card p-4">
            <div className="flex items-start justify-between gap-2">
              <p className="font-semibold">{z.title}</p>
              {who === "arun" && <Button variant="ghost" size="sm" aria-label="Delete results" onClick={() => void removeResults(z)}><Trash2 size={16} className="text-destructive" /></Button>}
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">{z.questions.length} questions · {new Date(z.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</p>
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

function QuizCard({ quiz, attempts, who, onPlay, onRetry, onDeleted }: { quiz: Quiz; attempts: Attempt[]; who: string; onPlay: () => void; onRetry: () => void; onDeleted: () => void }) {
  const del = useServerFn(deleteQuiz);
  const best = useMemo(() => {
    const m: Record<string, Attempt & { tries: number }> = {};
    for (const a of attempts) { const c = m[a.username]; m[a.username] = { ...(c && c.score >= a.score ? c : a), tries: (c?.tries ?? 0) + 1 }; }
    return Object.values(m).sort((a, b) => b.score - a.score);
  }, [attempts]);
  const mine = best.find((b) => b.username === who);
  const lastMine = attempts.filter((a) => a.username === who).at(-1);
  const missed = lastMine && Array.isArray(lastMine.answers)
    ? quiz.questions.filter((x, i) => ((lastMine.answers as number[])[i] ?? -1) !== x.answer).length
    : 0;
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold">{quiz.title}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {quiz.questions.length} questions · {quiz.chapter ? chapterLabel(quiz.chapter)  : "General"}
          </p>
        </div>
        {who === "arun" && <Button variant="ghost" size="icon" aria-label="Delete quiz" onClick={async () => { if (confirm("Delete this quiz and all of its scores?")) { await del({ data: { ...creds(), quizId: quiz.id } }); onDeleted(); } }}><Trash2 size={18} /></Button>}
      </div>
      {best.length > 0 && (
        <div className="mt-3 space-y-1">
          {best.map((b, i) => (
            <div key={b.username} className={cn("flex items-center justify-between rounded-md px-2.5 py-1.5 text-sm", b.username === who ? "bg-primary/10" : "bg-secondary/60")}>
              <span className="flex items-center gap-2">{i === 0 ? <Trophy size={14} className="text-accent" /> : <span className="w-3.5 text-center text-xs text-muted-foreground">{i + 1}</span>}{cap(b.username)}</span>
              <span className="font-semibold">{b.score}/{b.total} <span className="text-xs font-normal text-muted-foreground">· {b.tries} {b.tries === 1 ? "attempt" : "attempts"}</span></span>
            </div>
          ))}
        </div>
      )}
      <div className={cn("mt-3 gap-2", missed ? "grid grid-cols-2" : "")}>
        <Button className="w-full" onClick={onPlay}><Play size={16} />{mine ? "Attempt again" : "Start quiz"}</Button>
        {missed > 0 && <Button variant="outline" className="w-full" onClick={onRetry}>Retry missed ({missed})</Button>}
      </div>
    </div>
  );
}

function QuizUpload({ onCreated, mode }: { onCreated: () => void; mode: "quiz" | "test" }) {
  const create = useServerFn(createQuiz);
  const [subj, setSubj] = useState(0);
  const [chap, setChap] = useState("");
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
      log.push(`${f.name}: reading…`); setStatus([...log]);
      try {
        const html = await f.text();
        const title = f.name.replace(/\.html?$/i, "").replace(/[_-]+/g, " ").trim() || "Quiz";
        const r = await create({ data: { ...creds(), html, title, chapter: target, day: null } });
        log[log.length - 1] = `${f.name}: ${r.count} questions added.`;
        onCreated();
      } catch (e) { log[log.length - 1] = `${f.name}: ${e instanceof Error ? e.message : "Failed."}`; }
      setStatus([...log]);
    }
    setBusy(false); setFiles([]); onCreated();
  };

  return (
    <div className="space-y-3 rounded-lg border border-primary/30 bg-primary/5 p-4">
      <p className="font-semibold">{mode === "test" ? "Create a subject test from HTML files" : "Create a quiz from HTML files"}</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <select className="h-11 rounded-lg border bg-card px-3 text-sm" value={subj} onChange={(e) => { setSubj(Number(e.target.value)); setChap(""); }}>
            {SYLLABUS.map((s, i) => <option key={s.subject} value={i}>{s.subject}</option>)}
          </select>
          {mode === "quiz" && <select className="h-11 rounded-lg border bg-card px-3 text-sm" value={chap} onChange={(e) => setChap(e.target.value)}>
            <option value="">Select chapter</option>
            {chapters.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
          </select>}
        </div>
      <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed bg-card py-4 text-sm font-semibold text-muted-foreground">
        <FileUp size={18} />{files.length ? `${files.length} file${files.length > 1 ? "s" : ""} selected` : "Choose HTML files"}
        <input type="file" accept=".html,.htm,text/html" multiple className="hidden" onChange={(e) => setFiles(Array.from(e.target.files ?? []))} />
      </label>
      <Button className="w-full" disabled={busy || !files.length} onClick={run}>{busy ? "Creating quizzes… this may take a minute" : "Create quizzes"}</Button>
      <p className="text-xs text-muted-foreground">Each file becomes a separate quiz. Questions and correct answers are read from the file automatically.</p>
      {status.length > 0 && <div className="space-y-1 text-xs">{status.map((s, i) => <p key={i}>{s}</p>)}</div>}
    </div>
  );
}

function QuizPlayer({ quiz, questions, onDone }: { quiz: Quiz; questions?: QQ[] | undefined; onDone: () => void }) {
  const qc = useQueryClient();
  const submit = useServerFn(submitQuiz);
  const qs = questions ?? quiz.questions;
  const practice = Boolean(questions); // retry-missed mode: practice only, score is not saved
  const [ans, setAns] = useState<number[]>(() => qs.map(() => -1));
  const [i, setI] = useState(0);
  const [result, setResult] = useState<{ score: number; total: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const qq = qs[i];
  const answered = ans.filter((a) => a >= 0).length;

  if (result) return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-card p-6 text-center">
        <p className="text-sm text-muted-foreground">{quiz.title}{practice ? " · Missed questions" : ""}</p>
        <p className="mt-2 text-4xl font-bold">{result.score}/{result.total}</p>
        <p className="mt-1 text-sm text-muted-foreground">{practice ? "Practice score — not saved to the leaderboard." : "Your score has been saved."}</p>
      </div>
      <p className="text-sm font-semibold">Review answers</p>
      {qs.map((x, k) => (
        <div key={k} className={cn("rounded-lg border p-3.5", ans[k] === x.answer ? "border-primary/40 bg-primary/5" : "border-destructive/40 bg-destructive/5")}>
          <p className="whitespace-pre-line text-sm font-semibold">{k + 1}. {en(x.q)}</p>
          <p className="mt-1.5 flex items-center gap-1.5 text-sm">{ans[k] === x.answer ? <Check size={15} className="text-primary" /> : <X size={15} className="text-destructive" />}Your answer: {ans[k] >= 0 ? en(x.options[ans[k]]) : "Not answered"}</p>
          {ans[k] !== x.answer && <p className="mt-1 text-sm"><b>Correct:</b> {en(x.options[x.answer])}</p>}
          {x.explain && <p className="mt-1.5 text-xs text-muted-foreground">{en(x.explain)}</p>}
        </div>
      ))}
      <Button className="w-full" onClick={onDone}>Back to quizzes</Button>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm">
        <Button variant="ghost" size="sm" onClick={() => { if (confirm("Leave this quiz? Your answers will not be saved.")) onDone(); }}>Exit</Button>
        <span className="text-muted-foreground">Question {i + 1} of {qs.length}{practice ? " · Missed" : ""}</span>
      </div>
      <div className="session-progress h-1.5 overflow-hidden rounded-full bg-secondary"><div className="h-full bg-primary transition-all" style={{ width: `${((i + 1) / qs.length) * 100}%` }} /></div>
      <div className="rounded-lg border bg-card p-4">
        <p className="whitespace-pre-line font-semibold">{en(qq.q)}</p>
        <div className="mt-3 space-y-2">
          {qq.options.map((o, k) => (
            <Button variant="unstyled" key={k} aria-pressed={ans[i] === k} onClick={() => setAns((a) => a.map((v, j) => (j === i ? k : v)))} className={cn("flex w-full items-center rounded-lg border px-3.5 py-3 text-left text-sm transition", ans[i] === k ? "border-primary bg-primary/10 font-semibold" : "bg-card")}>
              <span className={cn("mr-3 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold", ans[i] === k ? "border-primary bg-primary text-primary-foreground" : "bg-secondary")}>{String.fromCharCode(65 + k)}</span><span className="min-w-0 break-words">{en(o)}</span>
            </Button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" disabled={i === 0} onClick={() => setI(i - 1)}>Previous</Button>
        {i < qs.length - 1
          ? <Button onClick={() => setI(i + 1)}>Next</Button>
          : <Button disabled={busy} onClick={async () => {
              if (answered < ans.length && !confirm(`${ans.length - answered} questions are unanswered. Submit anyway?`)) return;
              setBusy(true);
              try {
                if (practice) {
                  setResult({ score: ans.filter((a, k) => a === qs[k].answer).length, total: qs.length });
                } else {
                  const r = await submit({ data: { ...creds(), quizId: quiz.id, answers: ans } });
                  setResult(r);
                  qc.invalidateQueries({ queryKey: ["quizzes"] });
                  qc.invalidateQueries({ queryKey: ["all"] });
                }
              } catch (e) { alert(e instanceof Error ? e.message : "Unable to submit."); }
              setBusy(false);
            }}>{busy ? "Submitting…" : "Submit"}</Button>}
      </div>
    </div>
  );
}

