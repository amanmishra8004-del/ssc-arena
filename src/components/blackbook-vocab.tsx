import { useState, useMemo, useEffect } from "react";
import {
  BookOpen,
  Check,
  RotateCcw,
  Sparkles,
  Trophy,
  Flame,
  Volume2,
  Search,
  CheckCircle2,
  Lightbulb,
  MessageSquare,
  Languages,
  Plus,
  Compass,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { UserData } from "@/lib/syllabus";
import { BLACKBOOK_EXTENDED_WORDS, type BlackBookWord } from "@/lib/blackbook-words.data";
import { BLACKBOOK_IDIOMS, type BlackBookIdiom } from "@/lib/blackbook-idioms.data";

export type { BlackBookWord, BlackBookIdiom };

export function BlackBookVocabZone({
  data,
  update,
  all,
  who,
  initialMode = "words",
}: {
  data: UserData;
  update: (fn: (d: UserData) => UserData) => void;
  all: Record<string, UserData>;
  who: string;
  initialMode?: "words" | "idioms";
}) {
  const [mode, setMode] = useState<"words" | "idioms">(initialMode);
  const [tab, setTab] = useState<"deck" | "quiz" | "mastered" | "browse" | "add">("deck");
  const [searchQuery, setSearchQuery] = useState("");
  const [browseQuery, setBrowseQuery] = useState("");

  // Sync mode if initialMode changes
  useEffect(() => {
    if (initialMode) setMode(initialMode);
  }, [initialMode]);

  // Reset tab to deck when mode changes
  const switchMode = (newMode: "words" | "idioms") => {
    setMode(newMode);
    setTab("deck");
    setSearchQuery("");
  };

  // 1. Vocabulary Words State & Storage
  const [masteredWordIds, setMasteredWordIds] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem(`arena-bb-words-mastered-${who}`) || localStorage.getItem(`arena-bb-mastered-${who}`);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  const toggleMasteredWord = (id: string) => {
    const next = new Set(masteredWordIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setMasteredWordIds(next);
    try {
      localStorage.setItem(`arena-bb-words-mastered-${who}`, JSON.stringify([...next]));
    } catch {}
  };

  // 2. Idioms State & Storage
  const [masteredIdiomIds, setMasteredIdiomIds] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem(`arena-bb-idioms-mastered-${who}`);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  const toggleMasteredIdiom = (id: string) => {
    const next = new Set(masteredIdiomIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setMasteredIdiomIds(next);
    try {
      localStorage.setItem(`arena-bb-idioms-mastered-${who}`, JSON.stringify([...next]));
    } catch {}
  };

  // Speak helper using Web Speech API
  const speakText = (text: string) => {
    try {
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = "en-US";
        utterance.rate = 0.9;
        window.speechSynthesis.speak(utterance);
      }
    } catch {}
  };

  // Vocabulary Pool: 1,000 authentic words + user mock words
  const fullWordsPool = useMemo(() => {
    const customWords: BlackBookWord[] = data.vocab.map((v) => ({
      id: v.id,
      word: v.word,
      pos: "[user]",
      meaning: v.meaning,
      synonyms: [],
      antonyms: [],
      trick: v.trick || "",
      sentences: v.example ? [v.example] : [],
      repeatCount: "Personal Mock Word",
    }));
    return [...BLACKBOOK_EXTENDED_WORDS, ...customWords];
  }, [data.vocab]);

  const unmasteredWords = useMemo(
    () => fullWordsPool.filter((w) => !masteredWordIds.has(w.id)),
    [fullWordsPool, masteredWordIds]
  );
  const active10Words = useMemo(() => unmasteredWords.slice(0, 10), [unmasteredWords]);
  const masteredWordsList = useMemo(
    () => fullWordsPool.filter((w) => masteredWordIds.has(w.id)),
    [fullWordsPool, masteredWordIds]
  );

  // Idioms Pool: 310 authentic BlackBook idioms with Hindi & English meanings
  const unmasteredIdioms = useMemo(
    () => BLACKBOOK_IDIOMS.filter((idm) => !masteredIdiomIds.has(idm.id)),
    [masteredIdiomIds]
  );
  const active10Idioms = useMemo(() => unmasteredIdioms.slice(0, 10), [unmasteredIdioms]);
  const masteredIdiomsList = useMemo(
    () => BLACKBOOK_IDIOMS.filter((idm) => masteredIdiomIds.has(idm.id)),
    [masteredIdiomIds]
  );

  // Current active data depending on mode
  const activeCount = mode === "words" ? active10Words.length : active10Idioms.length;
  const masteredCount = mode === "words" ? masteredWordsList.length : masteredIdiomsList.length;
  const totalAvailable = mode === "words" ? fullWordsPool.length : BLACKBOOK_IDIOMS.length;

  return (
    <div className="space-y-4">
      {/* Top Banner & Mode Toggle */}
      <div className="rounded-xl border bg-card p-4 space-y-3.5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded bg-primary/10 text-primary px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider">
                BlackBook English Engine
              </span>
              <span className="text-xs text-muted-foreground font-semibold">User: {who}</span>
            </div>
            <p className="font-display text-base font-bold mt-1">
              {mode === "words"
                ? "SSC Vocabulary · 1,000 PYQ Master Words"
                : "SSC Idioms & Phrases · 200+ with Hindi Meanings"}
            </p>
            <p className="text-xs text-muted-foreground max-w-xl">
              {mode === "words"
                ? "Active deck contains exactly 10 words. Words never rotate until you mark them as Mastered, after which the next authentic BlackBook word slides in automatically."
                : "Active deck holds exactly 10 repeated idioms with English & Hindi meanings. They stay until mastered, sliding new BlackBook idioms in as you progress."}
            </p>
          </div>

          <div className="flex items-center gap-3 bg-secondary/60 p-2.5 rounded-lg shrink-0 self-start sm:self-center">
            <div className="text-center">
              <p className="text-[11px] font-semibold text-muted-foreground">Active</p>
              <p className="text-lg font-extrabold text-primary">{activeCount}</p>
            </div>
            <div className="h-7 w-[1px] bg-border" />
            <div className="text-center">
              <p className="text-[11px] font-semibold text-muted-foreground">Mastered</p>
              <p className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400">
                {masteredCount} / {totalAvailable}
              </p>
            </div>
          </div>
        </div>

        {/* Primary Switcher: Words (1000) vs Idioms (300+ with Hindi) */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-secondary/80 rounded-xl">
          <Button
            variant="unstyled"
            aria-pressed={mode === "words"}
            onClick={() => switchMode("words")}
            className={cn(
              "flex items-center justify-center gap-2 rounded-lg py-2.5 px-3 text-xs font-bold transition-all",
              mode === "words"
                ? "bg-card text-foreground shadow-sm border"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <BookOpen size={15} />
            <span>Vocabulary (1,000 Words)</span>
          </Button>

          <Button
            variant="unstyled"
            aria-pressed={mode === "idioms"}
            onClick={() => switchMode("idioms")}
            className={cn(
              "flex items-center justify-center gap-2 rounded-lg py-2.5 px-3 text-xs font-bold transition-all",
              mode === "idioms"
                ? "bg-card text-foreground shadow-sm border"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Languages size={15} />
            <span>Idioms & Phrases (Hindi + English)</span>
          </Button>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="practice-tabs flex gap-1.5 overflow-x-auto pb-1">
        {([
          ["deck", `Active 10 Deck (${activeCount})`],
          ["quiz", mode === "words" ? "10-Word Sprint Quiz" : "10-Idiom Sprint Quiz"],
          ["mastered", `Mastered Archive (${masteredCount})`],
          ["browse", mode === "words" ? `Browse All (1,000)` : `Browse All (310)`],
          ...(mode === "words" ? ([["add", "+ Add Custom Word"]] as const) : []),
        ] as const).map(([k, l]) => (
          <Button
            variant="unstyled"
            key={k}
            aria-pressed={tab === k}
            onClick={() => setTab(k as any)}
            className={cn(
              "shrink-0 rounded-lg px-3.5 py-2 text-xs font-semibold transition-all",
              tab === k
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-secondary text-muted-foreground hover:bg-secondary/80"
            )}
          >
            {l}
          </Button>
        ))}
      </div>

      {/* ============================================================== */}
      {/* MODE 1: VOCABULARY WORDS (BLACKBOOK 1,000)                    */}
      {/* ============================================================== */}
      {mode === "words" && (
        <>
          {/* 1.1 Active 10 Deck */}
          {tab === "deck" && (
            <div className="space-y-3">
              {active10Words.length === 0 ? (
                <div className="rounded-xl border border-dashed p-8 text-center bg-card space-y-2">
                  <Trophy size={42} className="mx-auto text-primary" />
                  <p className="font-bold text-base">All 1,000 BlackBook Words Mastered!</p>
                  <p className="text-xs text-muted-foreground">
                    Congratulations! You have mastered every vocabulary word. Review them anytime in the Mastered Archive.
                  </p>
                </div>
              ) : (
                active10Words.map((w, index) => {
                  const isDone = masteredWordIds.has(w.id);
                  return (
                    <div
                      key={w.id}
                      className="rounded-2xl border-2 border-border/85 bg-card p-5 sm:p-6 space-y-4 transition-all shadow-sm hover:shadow-md hover:border-primary/50"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <span className="h-7 w-7 rounded-full bg-secondary text-muted-foreground text-xs font-black flex items-center justify-center shrink-0 border">
                            {index + 1}
                          </span>
                          <p className="font-display text-xl sm:text-2xl font-black tracking-tight text-foreground">
                            {w.word}
                          </p>
                          <span className="text-xs text-muted-foreground font-bold px-2 py-0.5 rounded-md bg-secondary/80 border">
                            {w.pos}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => speakText(w.word)}
                            title="Listen pronunciation"
                            className="h-8 w-8 p-0 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10"
                          >
                            <Volume2 size={16} />
                          </Button>
                        </div>
                        <span className="rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-[11px] font-black px-2.5 py-0.5 shrink-0">
                          {w.repeatCount}
                        </span>
                      </div>

                      {/* Clear Meaning Box */}
                      <div className="rounded-xl bg-secondary/40 border border-border/70 p-3.5">
                        <p className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground mb-1">
                          Core Meaning
                        </p>
                        <p className="text-sm sm:text-base font-bold text-foreground leading-relaxed">
                          {w.meaning}
                        </p>
                      </div>

                      {/* Synonyms & Antonyms */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        {w.synonyms.length > 0 && (
                          <div className="rounded-xl bg-secondary/30 p-2.5 border border-border/60">
                            <span className="font-bold text-primary mr-1">Synonyms:</span>
                            <span className="text-foreground/80 font-medium">{w.synonyms.join(", ")}</span>
                          </div>
                        )}
                        {w.antonyms.length > 0 && (
                          <div className="rounded-xl bg-secondary/30 p-2.5 border border-border/60">
                            <span className="font-bold text-destructive mr-1">Antonyms:</span>
                            <span className="text-foreground/80 font-medium">{w.antonyms.join(", ")}</span>
                          </div>
                        )}
                      </div>

                      {/* Memory Trick / Mnemonic */}
                      {w.trick && (
                        <div className="flex items-start gap-2.5 rounded-xl bg-primary/5 border border-primary/25 p-3 text-xs">
                          <Lightbulb size={16} className="text-primary shrink-0 mt-0.5" />
                          <div>
                            <span className="font-black text-primary uppercase text-[10px] tracking-wider block">Memory Trick: </span>
                            <span className="text-foreground/90 font-medium">{w.trick}</span>
                          </div>
                        </div>
                      )}

                      {/* Professional Multi-line Example Sentences */}
                      {w.sentences.length > 0 && (
                        <div className="rounded-xl border-2 border-primary/15 bg-gradient-to-r from-primary/5 via-secondary/20 to-card p-3.5 sm:p-4 space-y-2">
                          <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-primary">
                            <BookOpen size={13} className="shrink-0" />
                            <span>Exam Usage & Sentences</span>
                          </div>
                          <div className="space-y-2">
                            {w.sentences.map((st, i) => (
                              <div
                                key={i}
                                className="flex items-start gap-2 text-xs sm:text-sm text-foreground/90 leading-relaxed font-medium bg-card/80 p-2.5 rounded-lg border border-border/60 shadow-xs"
                              >
                                <span className="font-serif text-base text-primary leading-none select-none">“</span>
                                <p className="flex-1 italic">{st}</p>
                                <span className="font-serif text-base text-primary leading-none select-none">”</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Mastered toggle button */}
                      <div className="pt-2 flex justify-end">
                        <Button
                          size="sm"
                          variant={isDone ? "outline" : "default"}
                          onClick={() => toggleMasteredWord(w.id)}
                          className={cn(
                            "text-xs font-bold rounded-xl px-4 py-2",
                            isDone ? "text-emerald-600 border-emerald-500/40 bg-emerald-500/10" : ""
                          )}
                        >
                          <Check size={14} className="mr-1.5" />
                          {isDone ? "Mastered (Completed)" : "I Know This (Mark Mastered)"}
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* 1.2 10-Word Sprint Quiz */}
          {tab === "quiz" && (
            <ActiveDeckWordsQuiz words={active10Words} onMastered={toggleMasteredWord} />
          )}

          {/* 1.3 Mastered Archive */}
          {tab === "mastered" && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Search size={16} className="text-muted-foreground" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search mastered words..."
                  className="w-full rounded-lg border bg-secondary px-3 py-2 text-xs outline-none focus:border-primary"
                />
              </div>

              {masteredWordsList.length === 0 ? (
                <p className="rounded-lg border border-dashed p-8 text-center text-xs text-muted-foreground">
                  No words marked as mastered yet. Click "I Know This" on cards in the Active Deck to save them here.
                </p>
              ) : (
                masteredWordsList
                  .filter(
                    (w) =>
                      w.word.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      w.meaning.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .map((w) => (
                    <div key={w.id} className="rounded-lg border bg-card p-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-sm">{w.word}</p>
                          <span className="text-xs text-muted-foreground">{w.pos}</span>
                          <span className="rounded bg-emerald-500/15 text-emerald-600 text-[10px] font-bold px-1.5 py-0.2">
                            Mastered
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{w.meaning}</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleMasteredWord(w.id)}
                        className="text-xs shrink-0"
                      >
                        <RotateCcw size={13} className="mr-1" /> Re-learn
                      </Button>
                    </div>
                  ))
              )}
            </div>
          )}

          {/* 1.4 Browse All 1000 Words */}
          {tab === "browse" && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Search size={16} className="text-muted-foreground" />
                <input
                  value={browseQuery}
                  onChange={(e) => setBrowseQuery(e.target.value)}
                  placeholder="Search across all 1,000 authentic SSC PYQ words..."
                  className="w-full rounded-lg border bg-secondary px-3 py-2 text-xs outline-none focus:border-primary"
                />
              </div>

              <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                {fullWordsPool
                  .filter(
                    (w) =>
                      w.word.toLowerCase().includes(browseQuery.toLowerCase()) ||
                      w.meaning.toLowerCase().includes(browseQuery.toLowerCase()) ||
                      w.synonyms.some((s) => s.toLowerCase().includes(browseQuery.toLowerCase()))
                  )
                  .slice(0, 100)
                  .map((w) => {
                    const isDone = masteredWordIds.has(w.id);
                    return (
                      <div key={w.id} className="rounded-lg border bg-card p-3 flex items-start justify-between gap-3">
                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-sm text-foreground">{w.word}</p>
                            <span className="text-xs text-muted-foreground">{w.pos}</span>
                            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
                              {w.repeatCount}
                            </span>
                            {isDone && (
                              <span className="rounded bg-emerald-500/15 text-emerald-600 text-[10px] font-bold px-1.5 py-0.2">
                                Mastered
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">{w.meaning}</p>
                          {w.trick && (
                            <p className="text-[11px] text-primary/80 italic">Trick: {w.trick}</p>
                          )}
                        </div>
                        <Button
                          variant={isDone ? "outline" : "secondary"}
                          size="sm"
                          onClick={() => toggleMasteredWord(w.id)}
                          className="text-xs shrink-0"
                        >
                          {isDone ? "Unmark" : "Mark Mastered"}
                        </Button>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* 1.5 Add Custom Word */}
          {tab === "add" && <AddCustomWordForm update={update} onDone={() => setTab("deck")} />}
        </>
      )}

      {/* ============================================================== */}
      {/* MODE 2: IDIOMS & PHRASES (HINDI + ENGLISH)                    */}
      {/* ============================================================== */}
      {mode === "idioms" && (
        <>
          {/* 2.1 Active 10 Idioms Deck */}
          {tab === "deck" && (
            <div className="space-y-3">
              {active10Idioms.length === 0 ? (
                <div className="rounded-xl border border-dashed p-8 text-center bg-card space-y-2">
                  <Trophy size={42} className="mx-auto text-primary" />
                  <p className="font-bold text-base">All 310 SSC Idioms Mastered!</p>
                  <p className="text-xs text-muted-foreground">
                    Superb achievement! You have mastered all previous year SSC idioms with Hindi and English meanings.
                  </p>
                </div>
              ) : (
                active10Idioms.map((idm, index) => {
                  const isDone = masteredIdiomIds.has(idm.id);
                  return (
                    <div
                      key={idm.id}
                      className="rounded-2xl border-2 border-border/85 bg-card p-5 sm:p-6 space-y-4 transition-all shadow-sm hover:shadow-md hover:border-primary/50"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <span className="h-7 w-7 rounded-full bg-secondary text-muted-foreground text-xs font-black flex items-center justify-center shrink-0 border">
                            {index + 1}
                          </span>
                          <p className="font-display text-xl sm:text-2xl font-black tracking-tight text-foreground">
                            {idm.idiom}
                          </p>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => speakText(idm.idiom)}
                            title="Listen pronunciation"
                            className="h-8 w-8 p-0 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10"
                          >
                            <Volume2 size={16} />
                          </Button>
                        </div>
                        <span className="rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-[11px] font-black px-2.5 py-0.5 shrink-0">
                          {idm.repeatCount}
                        </span>
                      </div>

                      {/* Prominent Hindi Meaning Badge (Crucial user requirement) */}
                      <div className="rounded-xl bg-gradient-to-r from-orange-500/15 to-amber-500/10 border-2 border-orange-500/30 p-3.5 flex items-start gap-3">
                        <span className="text-xl shrink-0 leading-none">🇮🇳</span>
                        <div className="space-y-0.5">
                          <p className="text-[10px] font-black text-orange-600 dark:text-orange-400 uppercase tracking-wider">
                            Hindi Meaning (हिंदी अर्थ)
                          </p>
                          <p className="text-base sm:text-lg font-black text-foreground tracking-wide font-sans">
                            {idm.meaningHi}
                          </p>
                        </div>
                      </div>

                      {/* English Meaning Box */}
                      <div className="rounded-xl bg-secondary/40 border border-border/70 p-3.5 space-y-1">
                        <p className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                          English Meaning
                        </p>
                        <p className="text-sm sm:text-base font-bold text-foreground leading-relaxed">
                          {idm.meaningEn}
                        </p>
                      </div>

                      {/* Origin / Memory Trick */}
                      {idm.trick && (
                        <div className="flex items-start gap-2.5 rounded-xl bg-primary/5 border border-primary/25 p-3 text-xs">
                          <Lightbulb size={16} className="text-primary shrink-0 mt-0.5" />
                          <div>
                            <span className="font-black text-primary uppercase text-[10px] tracking-wider block">Origin / Mnemonic: </span>
                            <span className="text-foreground/90 font-medium">{idm.trick}</span>
                          </div>
                        </div>
                      )}

                      {/* Professional Multi-line Exam Sentence */}
                      {idm.sentence && (
                        <div className="rounded-xl border-2 border-primary/15 bg-gradient-to-r from-primary/5 via-secondary/20 to-card p-3.5 sm:p-4 space-y-2">
                          <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-primary">
                            <BookOpen size={13} className="shrink-0" />
                            <span>Exam Usage & Sentence</span>
                          </div>
                          <div className="flex items-start gap-2 text-xs sm:text-sm text-foreground/90 leading-relaxed font-medium bg-card/80 p-2.5 rounded-lg border border-border/60 shadow-xs">
                            <span className="font-serif text-base text-primary leading-none select-none">“</span>
                            <p className="flex-1 italic">{idm.sentence}</p>
                            <span className="font-serif text-base text-primary leading-none select-none">”</span>
                          </div>
                        </div>
                      )}

                      {/* Mastered toggle button */}
                      <div className="pt-2 flex justify-end">
                        <Button
                          size="sm"
                          variant={isDone ? "outline" : "default"}
                          onClick={() => toggleMasteredIdiom(idm.id)}
                          className={cn(
                            "text-xs font-bold rounded-xl px-4 py-2",
                            isDone ? "text-emerald-600 border-emerald-500/40 bg-emerald-500/10" : ""
                          )}
                        >
                          <Check size={14} className="mr-1.5" />
                          {isDone ? "Mastered (Completed)" : "I Know This (Mark Mastered)"}
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* 2.2 10-Idiom Sprint Quiz */}
          {tab === "quiz" && (
            <ActiveDeckIdiomsQuiz idioms={active10Idioms} onMastered={toggleMasteredIdiom} />
          )}

          {/* 2.3 Mastered Archive for Idioms */}
          {tab === "mastered" && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Search size={16} className="text-muted-foreground" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search mastered idioms..."
                  className="w-full rounded-lg border bg-secondary px-3 py-2 text-xs outline-none focus:border-primary"
                />
              </div>

              {masteredIdiomsList.length === 0 ? (
                <p className="rounded-lg border border-dashed p-8 text-center text-xs text-muted-foreground">
                  No idioms marked as mastered yet. Click "I Know This" on idioms in the Active Deck to move them here.
                </p>
              ) : (
                masteredIdiomsList
                  .filter(
                    (idm) =>
                      idm.idiom.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      idm.meaningEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      idm.meaningHi.includes(searchQuery)
                  )
                  .map((idm) => (
                    <div
                      key={idm.id}
                      className="rounded-lg border bg-card p-3 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-sm">{idm.idiom}</p>
                          <span className="rounded bg-emerald-500/15 text-emerald-600 text-[10px] font-bold px-1.5 py-0.2">
                            Mastered
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-orange-600 dark:text-orange-400">
                          {idm.meaningHi}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{idm.meaningEn}</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleMasteredIdiom(idm.id)}
                        className="text-xs shrink-0"
                      >
                        <RotateCcw size={13} className="mr-1" /> Re-learn
                      </Button>
                    </div>
                  ))
              )}
            </div>
          )}

          {/* 2.4 Browse All 310 Idioms */}
          {tab === "browse" && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Search size={16} className="text-muted-foreground" />
                <input
                  value={browseQuery}
                  onChange={(e) => setBrowseQuery(e.target.value)}
                  placeholder="Search across all 310 authentic SSC PYQ idioms (English or Hindi)..."
                  className="w-full rounded-lg border bg-secondary px-3 py-2 text-xs outline-none focus:border-primary"
                />
              </div>

              <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                {BLACKBOOK_IDIOMS.filter(
                  (idm) =>
                    idm.idiom.toLowerCase().includes(browseQuery.toLowerCase()) ||
                    idm.meaningEn.toLowerCase().includes(browseQuery.toLowerCase()) ||
                    idm.meaningHi.includes(browseQuery)
                )
                  .slice(0, 100)
                  .map((idm) => {
                    const isDone = masteredIdiomIds.has(idm.id);
                    return (
                      <div
                        key={idm.id}
                        className="rounded-lg border bg-card p-3 flex items-start justify-between gap-3"
                      >
                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-sm text-foreground">{idm.idiom}</p>
                            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
                              {idm.repeatCount}
                            </span>
                            {isDone && (
                              <span className="rounded bg-emerald-500/15 text-emerald-600 text-[10px] font-bold px-1.5 py-0.2">
                                Mastered
                              </span>
                            )}
                          </div>
                          <p className="text-xs font-bold text-orange-600 dark:text-orange-400">
                            {idm.meaningHi}
                          </p>
                          <p className="text-xs text-muted-foreground">{idm.meaningEn}</p>
                          {idm.trick && (
                            <p className="text-[11px] text-primary/80 italic">Trick: {idm.trick}</p>
                          )}
                        </div>
                        <Button
                          variant={isDone ? "outline" : "secondary"}
                          size="sm"
                          onClick={() => toggleMasteredIdiom(idm.id)}
                          className="text-xs shrink-0"
                        >
                          {isDone ? "Unmark" : "Mark Mastered"}
                        </Button>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// --------------------------------------------------------------------------
// 10-Word Sprint Quiz Component
// --------------------------------------------------------------------------
function ActiveDeckWordsQuiz({
  words,
  onMastered,
}: {
  words: BlackBookWord[];
  onMastered: (id: string) => void;
}) {
  const [index, setIndex] = useState(0);
  const [selectedOpt, setSelectedOpt] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  const current = words[index];

  const options = useMemo(() => {
    if (!current) return [];
    const correct = current.meaning;
    const fakes = words
      .filter((w) => w.id !== current.id)
      .map((w) => w.meaning)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);
    const all = [correct, ...fakes].sort(() => Math.random() - 0.5);
    return all;
  }, [current, words]);

  if (!current || finished || words.length < 2) {
    return (
      <div className="rounded-xl border bg-card p-6 text-center space-y-4">
        <Trophy size={42} className="mx-auto text-primary" />
        <p className="font-bold text-lg">Active Deck Word Quiz Complete</p>
        <p className="text-3xl font-extrabold text-primary">
          {score} / {words.length}
        </p>
        <p className="text-xs text-muted-foreground">
          {score === words.length
            ? "Flawless score! You have completely mastered these active words."
            : "Keep revising your active deck to master them fully."}
        </p>
        <Button
          onClick={() => {
            setIndex(0);
            setScore(0);
            setSelectedOpt(null);
            setFinished(false);
          }}
          className="w-full font-bold"
        >
          <RotateCcw size={15} className="mr-1.5" /> Re-take Quiz
        </Button>
      </div>
    );
  }

  const handleSelect = (opt: string) => {
    if (selectedOpt !== null) return;
    setSelectedOpt(opt);
    const isCorrect = opt === current.meaning;
    if (isCorrect) setScore((s) => s + 1);

    setTimeout(() => {
      setSelectedOpt(null);
      if (index < words.length - 1) setIndex((i) => i + 1);
      else setFinished(true);
    }, 900);
  };

  return (
    <div className="rounded-xl border bg-card p-5 space-y-4">
      <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
        <span>
          Word Question {index + 1} of {words.length}
        </span>
        <span className="font-bold text-primary">Score: {score}</span>
      </div>

      <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${((index + 1) / words.length) * 100}%` }}
        />
      </div>

      <div className="p-4 rounded-lg bg-secondary/30 text-center space-y-1">
        <p className="text-xs text-muted-foreground font-semibold">Select the correct meaning of:</p>
        <p className="text-2xl font-extrabold text-foreground tracking-wide">{current.word}</p>
        <p className="text-xs text-muted-foreground italic">{current.pos}</p>
      </div>

      <div className="space-y-2">
        {options.map((opt) => {
          const isChosen = selectedOpt === opt;
          const isCorrect = opt === current.meaning;
          let cls = "border bg-card hover:bg-secondary/50";
          if (selectedOpt !== null) {
            if (isCorrect) cls = "border-emerald-500 bg-emerald-500/15 text-emerald-600 font-bold dark:text-emerald-400";
            else if (isChosen) cls = "border-destructive bg-destructive/15 text-destructive font-bold";
          }
          return (
            <Button
              variant="unstyled"
              key={opt}
              disabled={selectedOpt !== null}
              onClick={() => handleSelect(opt)}
              className={cn(
                "w-full rounded-lg p-3 text-left text-sm font-medium transition flex items-center justify-between",
                cls
              )}
            >
              <span className="leading-relaxed">{opt}</span>
              {selectedOpt !== null && isCorrect && (
                <Check size={16} className="text-emerald-500 shrink-0 ml-2" />
              )}
            </Button>
          );
        })}
      </div>
    </div>
  );
}

// --------------------------------------------------------------------------
// 10-Idiom Sprint Quiz Component (Tests Hindi & English Meanings)
// --------------------------------------------------------------------------
function ActiveDeckIdiomsQuiz({
  idioms,
  onMastered,
}: {
  idioms: BlackBookIdiom[];
  onMastered: (id: string) => void;
}) {
  const [index, setIndex] = useState(0);
  const [selectedOpt, setSelectedOpt] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  const current = idioms[index];

  // Alternates between testing Hindi meaning or English definition
  const testMode = index % 2 === 0 ? "hindi" : "english";

  const options = useMemo(() => {
    if (!current) return [];
    const correct = testMode === "hindi" ? current.meaningHi : current.meaningEn;
    const fakes = idioms
      .filter((idm) => idm.id !== current.id)
      .map((idm) => (testMode === "hindi" ? idm.meaningHi : idm.meaningEn))
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);
    const all = [correct, ...fakes].sort(() => Math.random() - 0.5);
    return all;
  }, [current, idioms, testMode]);

  if (!current || finished || idioms.length < 2) {
    return (
      <div className="rounded-xl border bg-card p-6 text-center space-y-4">
        <Trophy size={42} className="mx-auto text-primary" />
        <p className="font-bold text-lg">Active Deck Idioms Quiz Complete</p>
        <p className="text-3xl font-extrabold text-primary">
          {score} / {idioms.length}
        </p>
        <p className="text-xs text-muted-foreground">
          {score === idioms.length
            ? "Outstanding! You know both Hindi and English meanings of these active idioms perfectly."
            : "Review the Hindi meanings and tricks in the Active Deck to score full marks."}
        </p>
        <Button
          onClick={() => {
            setIndex(0);
            setScore(0);
            setSelectedOpt(null);
            setFinished(false);
          }}
          className="w-full font-bold"
        >
          <RotateCcw size={15} className="mr-1.5" /> Re-take Idioms Quiz
        </Button>
      </div>
    );
  }

  const correctTarget = testMode === "hindi" ? current.meaningHi : current.meaningEn;

  const handleSelect = (opt: string) => {
    if (selectedOpt !== null) return;
    setSelectedOpt(opt);
    const isCorrect = opt === correctTarget;
    if (isCorrect) setScore((s) => s + 1);

    setTimeout(() => {
      setSelectedOpt(null);
      if (index < idioms.length - 1) setIndex((i) => i + 1);
      else setFinished(true);
    }, 900);
  };

  return (
    <div className="rounded-xl border bg-card p-5 space-y-4">
      <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
        <span>
          Idiom Question {index + 1} of {idioms.length}
        </span>
        <span className="font-bold text-primary">Score: {score}</span>
      </div>

      <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${((index + 1) / idioms.length) * 100}%` }}
        />
      </div>

      <div className="p-4 rounded-lg bg-secondary/30 text-center space-y-1.5">
        <span className="inline-block rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400 text-[11px] font-bold px-2.5 py-0.5">
          {testMode === "hindi" ? "🇮🇳 What is the Hindi meaning?" : "🇬🇧 What is the English meaning?"}
        </span>
        <p className="text-2xl font-extrabold text-foreground tracking-wide">{current.idiom}</p>
        <p className="text-xs text-muted-foreground italic">SSC Previous Year Question</p>
      </div>

      <div className="space-y-2">
        {options.map((opt) => {
          const isChosen = selectedOpt === opt;
          const isCorrect = opt === correctTarget;
          let cls = "border bg-card hover:bg-secondary/50";
          if (selectedOpt !== null) {
            if (isCorrect) cls = "border-emerald-500 bg-emerald-500/15 text-emerald-600 font-bold dark:text-emerald-400";
            else if (isChosen) cls = "border-destructive bg-destructive/15 text-destructive font-bold";
          }
          return (
            <Button
              variant="unstyled"
              key={opt}
              disabled={selectedOpt !== null}
              onClick={() => handleSelect(opt)}
              className={cn(
                "w-full rounded-lg p-3 text-left text-sm font-medium transition flex items-center justify-between",
                cls
              )}
            >
              <span className="leading-relaxed">{opt}</span>
              {selectedOpt !== null && isCorrect && (
                <Check size={16} className="text-emerald-500 shrink-0 ml-2" />
              )}
            </Button>
          );
        })}
      </div>
    </div>
  );
}

// --------------------------------------------------------------------------
// Custom Word Addition Form
// --------------------------------------------------------------------------
function AddCustomWordForm({
  update,
  onDone,
}: {
  update: (fn: (d: UserData) => UserData) => void;
  onDone: () => void;
}) {
  const [word, setWord] = useState("");
  const [meaning, setMeaning] = useState("");
  const [trick, setTrick] = useState("");
  const [example, setExample] = useState("");

  const handleAdd = () => {
    if (!word.trim() || !meaning.trim()) return;
    update((d) => {
      d.vocab = [
        {
          id: `custom-${Date.now()}`,
          word: word.trim(),
          meaning: meaning.trim(),
          trick: trick.trim(),
          example: example.trim(),
          date: new Date().toISOString(),
        },
        ...d.vocab,
      ];
      return d;
    });
    onDone();
  };

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <p className="font-bold text-sm">Add Personal Mock Test Word</p>
      <input
        value={word}
        onChange={(e) => setWord(e.target.value)}
        placeholder="Word (e.g. Obdurate)"
        className="w-full rounded-lg border bg-secondary px-3 py-2 text-sm outline-none focus:border-primary"
      />
      <input
        value={meaning}
        onChange={(e) => setMeaning(e.target.value)}
        placeholder="Meaning (e.g. Stubbornly refusing to change one's opinion)"
        className="w-full rounded-lg border bg-secondary px-3 py-2 text-sm outline-none focus:border-primary"
      />
      <textarea
        value={trick}
        onChange={(e) => setTrick(e.target.value)}
        placeholder="Memory aid / trick (optional)"
        rows={2}
        className="w-full rounded-lg border bg-secondary px-3 py-2 text-sm outline-none focus:border-primary"
      />
      <textarea
        value={example}
        onChange={(e) => setExample(e.target.value)}
        placeholder="Example sentence (optional)"
        rows={2}
        className="w-full rounded-lg border bg-secondary px-3 py-2 text-sm outline-none focus:border-primary"
      />
      <Button onClick={handleAdd} className="w-full font-bold">
        Add Word to Learning Deck
      </Button>
    </div>
  );
}
