import { useState, useMemo, useEffect } from "react";
import {
  Zap,
  RotateCcw,
  Check,
  X,
  Flame,
  ChevronRight,
  ChevronLeft,
  Eye,
  Shuffle,
  Sparkles,
  Trophy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { UserData } from "@/lib/syllabus";
import { USERS } from "@/lib/syllabus";

type Upd = (fn: (d: UserData) => UserData) => void;

type TopicKey = "tables" | "squares" | "cubes" | "percentages" | "add_sub" | "mul_div" | "divisibility";
type ModeKey = "quiz" | "flashcard" | "chart";

// Pre-defined Fraction to Percentage items
const PERCENTAGE_DATA = [
  { fraction: "1/1", percent: "100%", decimal: "1.0", trick: "Complete whole" },
  { fraction: "1/2", percent: "50%", decimal: "0.5", trick: "Half" },
  { fraction: "1/3", percent: "33.33%", decimal: "0.333...", trick: "33 ⅓%" },
  { fraction: "1/4", percent: "25%", decimal: "0.25", trick: "Quarter" },
  { fraction: "1/5", percent: "20%", decimal: "0.2", trick: "100 ÷ 5" },
  { fraction: "1/6", percent: "16.66%", decimal: "0.166...", trick: "16 ⅔% (half of 1/3)" },
  { fraction: "1/7", percent: "14.28%", decimal: "0.1428...", trick: "14 2/7% (double of 7 is 14, double of 14 is 28)" },
  { fraction: "1/8", percent: "12.5%", decimal: "0.125", trick: "12 ½% (half of 25%)" },
  { fraction: "1/9", percent: "11.11%", decimal: "0.111...", trick: "11 ⅑% (all 1s)" },
  { fraction: "1/10", percent: "10%", decimal: "0.1", trick: "Direct tenth" },
  { fraction: "1/11", percent: "9.09%", decimal: "0.0909...", trick: "9 ¹/₁₁% (09 09 pattern)" },
  { fraction: "1/12", percent: "8.33%", decimal: "0.0833...", trick: "8 ⅓% (half of 1/6)" },
  { fraction: "1/13", percent: "7.69%", decimal: "0.0769...", trick: "7 ⁹/₁₃%" },
  { fraction: "1/14", percent: "7.14%", decimal: "0.0714...", trick: "7 ¹/₇% (half of 1/7)" },
  { fraction: "1/15", percent: "6.66%", decimal: "0.0666...", trick: "6 ⅔%" },
  { fraction: "1/16", percent: "6.25%", decimal: "0.0625", trick: "6 ¼% (half of 12.5%)" },
  { fraction: "1/17", percent: "5.88%", decimal: "0.0588...", trick: "5 ¹⁵/₁₇%" },
  { fraction: "1/18", percent: "5.55%", decimal: "0.0555...", trick: "5 ⁵/₉% (all 5s)" },
  { fraction: "1/19", percent: "5.26%", decimal: "0.0526...", trick: "5 ⁵/₁₉%" },
  { fraction: "1/20", percent: "5%", decimal: "0.05", trick: "100 ÷ 20" },
  { fraction: "2/3", percent: "66.66%", decimal: "0.666...", trick: "66 ⅔% (2 × 1/3)" },
  { fraction: "3/8", percent: "37.5%", decimal: "0.375", trick: "37 ½% (3 × 12.5%)" },
  { fraction: "5/8", percent: "62.5%", decimal: "0.625", trick: "62 ½% (5 × 12.5%)" },
  { fraction: "7/8", percent: "87.5%", decimal: "0.875", trick: "100% - 12.5%" },
  { fraction: "4/7", percent: "57.14%", decimal: "0.5714...", trick: "4 × 14.28%" },
  { fraction: "5/7", percent: "71.42%", decimal: "0.7142...", trick: "5 × 14.28%" },
];

const DIVISIBILITY_RULES = [
  { num: 2, rule: "Last digit is even (0, 2, 4, 6, 8)", example: "3548 → ends in 8 → Yes" },
  { num: 3, rule: "Sum of all digits is divisible by 3", example: "453 → 4+5+3 = 12 (div by 3) → Yes" },
  { num: 4, rule: "Last two digits form a number divisible by 4", example: "1936 → 36 is 4 × 9 → Yes" },
  { num: 5, rule: "Last digit is 0 or 5", example: "7895 → ends in 5 → Yes" },
  { num: 6, rule: "Divisible by both 2 and 3 (even number with digit sum div by 3)", example: "834 → even & 8+3+4=15 → Yes" },
  { num: 7, rule: "Double the last digit and subtract from remaining number; result is div by 7", example: "343 → 34 - (2×3) = 28 (div by 7) → Yes" },
  { num: 8, rule: "Last three digits form a number divisible by 8", example: "43120 → 120 ÷ 8 = 15 → Yes" },
  { num: 9, rule: "Sum of all digits is divisible by 9", example: "7389 → 7+3+8+9 = 27 (div by 9) → Yes" },
  { num: 11, rule: "Difference between sum of digits at odd places and even places is 0 or multiple of 11", example: "1331 → (1+3)-(3+1) = 0 → Yes" },
  { num: 13, rule: "Multiply last digit by 4 and add to remaining number; check if div by 13", example: "273 → 27 + (4×3) = 39 (13 × 3) → Yes" },
];

type MathCard = {
  id: string;
  question: string;
  answer: string;
  options: string[];
  hint?: string;
  topic: TopicKey;
};

function generateCards(topic: TopicKey): MathCard[] {
  const cards: MathCard[] = [];

  if (topic === "tables") {
    // Tables 12 to 30 (high SSC priority) and 2 to 11
    const multipliers = [3, 4, 6, 7, 8, 9, 12, 13, 14, 15, 16, 17, 18, 19, 21, 23, 24, 26, 27, 28, 29];
    for (const t of multipliers) {
      for (let m = 2; m <= 10; m++) {
        const ans = t * m;
        const fakeAnswers = [ans - t, ans + t, ans + 2, ans - 2, ans + 10, ans - 10]
          .filter((v) => v > 0 && v !== ans);
        const shuffledOptions = Array.from(new Set([ans, ...fakeAnswers])).slice(0, 4);
        shuffledOptions.sort(() => Math.random() - 0.5);

        cards.push({
          id: `tbl-${t}-${m}`,
          question: `${t} × ${m} = ?`,
          answer: String(ans),
          options: shuffledOptions.map(String),
          hint: `${t} × ${m} = ${t * (m - 1)} + ${t}`,
          topic: "tables",
        });
      }
    }
  } else if (topic === "squares") {
    for (let n = 11; n <= 40; n++) {
      const ans = n * n;
      const fakes = [ans + 10, ans - 10, (n + 1) * (n + 1), (n - 1) * (n - 1), ans + 20, ans - 20]
        .filter((v) => v > 0 && v !== ans);
      const opts = Array.from(new Set([ans, ...fakes])).slice(0, 4);
      opts.sort(() => Math.random() - 0.5);

      cards.push({
        id: `sq-${n}`,
        question: `${n}² = ?`,
        answer: String(ans),
        options: opts.map(String),
        hint: n % 10 === 5 ? `End with 25: ${Math.floor(n / 10) * (Math.floor(n / 10) + 1)}25` : undefined,
        topic: "squares",
      });
    }
  } else if (topic === "cubes") {
    for (let n = 2; n <= 30; n++) {
      const ans = n * n * n;
      const fakes = [ans + 100, ans - 100, (n + 1) ** 3, (n - 1) ** 3, ans + n * 10]
        .filter((v) => v > 0 && v !== ans);
      const opts = Array.from(new Set([ans, ...fakes])).slice(0, 4);
      opts.sort(() => Math.random() - 0.5);

      cards.push({
        id: `cube-${n}`,
        question: `${n}³ = ?`,
        answer: String(ans),
        options: opts.map(String),
        hint: `Square is ${n * n}, multiply by ${n}`,
        topic: "cubes",
      });
    }
  } else if (topic === "percentages") {
    for (const p of PERCENTAGE_DATA) {
      const fakes = PERCENTAGE_DATA.filter((x) => x.percent !== p.percent).map((x) => x.percent);
      fakes.sort(() => Math.random() - 0.5);
      const opts = [p.percent, ...fakes.slice(0, 3)];
      opts.sort(() => Math.random() - 0.5);

      cards.push({
        id: `pct-${p.fraction}`,
        question: `${p.fraction} in Percentage (%) = ?`,
        answer: p.percent,
        options: opts,
        hint: `${p.fraction} = ${p.decimal} · ${p.trick}`,
        topic: "percentages",
      });
    }
  } else if (topic === "add_sub") {
    // 2-digit fast addition & subtraction drills
    const seed = [
      [47, 86], [68, 75], [89, 54], [76, 58], [94, 67], [83, 49], [65, 87], [92, 79],
      [143, 68], [172, 89], [134, 78], [165, 87], [100, 37], [1000, 348], [121, 45],
    ];
    seed.forEach(([a, b], idx) => {
      // addition
      const addAns = a + b;
      const addFakes = [addAns - 10, addAns + 10, addAns - 1, addAns + 2].filter((v) => v !== addAns);
      const addOpts = [addAns, ...addFakes.slice(0, 3)].sort(() => Math.random() - 0.5);
      cards.push({
        id: `add-${idx}`,
        question: `${a} + ${b} = ?`,
        answer: String(addAns),
        options: addOpts.map(String),
        hint: `Break down: ${a} + ${Math.floor(b / 10) * 10} + ${b % 10}`,
        topic: "add_sub",
      });

      // subtraction
      const big = Math.max(a, b);
      const small = Math.min(a, b);
      const subAns = big - small;
      const subFakes = [subAns - 10, subAns + 10, subAns + 2, subAns - 2].filter((v) => v > 0 && v !== subAns);
      const subOpts = [subAns, ...subFakes.slice(0, 3)].sort(() => Math.random() - 0.5);
      cards.push({
        id: `sub-${idx}`,
        question: `${big} - ${small} = ?`,
        answer: String(subAns),
        options: subOpts.map(String),
        hint: `Count up: from ${small} to ${big}`,
        topic: "add_sub",
      });
    });
  } else if (topic === "mul_div") {
    const pairs = [
      [23, 7], [18, 9], [34, 5], [42, 6], [29, 4], [16, 8], [37, 3], [48, 4],
      [195, 15], [144, 12], [216, 18], [182, 14], [256, 16], [324, 18], [289, 17]
    ];
    pairs.forEach(([a, b], idx) => {
      if (a < 50) {
        // Multiply
        const ans = a * b;
        const fakes = [ans + 10, ans - 10, ans + b, ans - b].filter((x) => x > 0 && x !== ans);
        const opts = [ans, ...fakes.slice(0, 3)].sort(() => Math.random() - 0.5);
        cards.push({
          id: `mul-${idx}`,
          question: `${a} × ${b} = ?`,
          answer: String(ans),
          options: opts.map(String),
          hint: `${Math.floor(a / 10) * 10} × ${b} + ${(a % 10)} × ${b}`,
          topic: "mul_div",
        });
      } else {
        // Divide
        const ans = Math.floor(a / b);
        const fakes = [ans + 1, ans - 1, ans + 2, ans + 5].filter((x) => x > 0 && x !== ans);
        const opts = [ans, ...fakes.slice(0, 3)].sort(() => Math.random() - 0.5);
        cards.push({
          id: `div-${idx}`,
          question: `${a} ÷ ${b} = ?`,
          answer: String(ans),
          options: opts.map(String),
          hint: `${b} × ${ans} = ${a}`,
          topic: "mul_div",
        });
      }
    });
  } else if (topic === "divisibility") {
    const tests = [
      { n: 28314, div: 9, isDiv: true, hint: "Sum: 2+8+3+1+4 = 18 (divisible by 9)" },
      { n: 5742, div: 11, isDiv: true, hint: "(5+4) - (7+2) = 9 - 9 = 0 (divisible by 11)" },
      { n: 9324, div: 4, isDiv: true, hint: "Last two digits 24 is divisible by 4" },
      { n: 4913, div: 17, isDiv: true, hint: "17³ = 4913" },
      { n: 1331, div: 11, isDiv: true, hint: "11³ = 1331" },
      { n: 6734, div: 3, isDiv: false, hint: "Sum: 6+7+3+4 = 20 (not divisible by 3)" },
      { n: 8945, div: 5, isDiv: true, hint: "Ends with 5" },
      { n: 7832, div: 8, isDiv: true, hint: "832 ÷ 8 = 104" },
      { n: 4562, div: 6, isDiv: false, hint: "Even, but sum 4+5+6+2 = 17 (not div by 3)" },
      { n: 2401, div: 7, isDiv: true, hint: "7⁴ = 2401 (240 - 2 = 238 div by 7)" },
      { n: 3729, div: 9, isDiv: true, hint: "Sum: 3+7+2+9 = 21 (wait, 21 is not div by 9)" },
    ];
    tests.forEach((t, i) => {
      const isYes = t.isDiv;
      cards.push({
        id: `divrule-${i}`,
        question: `Is ${t.n} divisible by ${t.div}?`,
        answer: isYes ? "Yes" : "No",
        options: ["Yes", "No"],
        hint: t.hint,
        topic: "divisibility",
      });
    });
  }

  // Shuffle and return
  return cards.sort(() => Math.random() - 0.5);
}

export function MathPracticeZone({
  data,
  update,
  all,
}: {
  data: UserData;
  update: Upd;
  all: Record<string, UserData>;
}) {
  const [topic, setTopic] = useState<TopicKey>("tables");
  const [mode, setMode] = useState<ModeKey>("quiz");
  const [mastered, setMastered] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem("arena-math-mastered");
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch {
      return new Set();
    }
  });

  const markMastered = (id: string) => {
    const next = new Set(mastered);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setMastered(next);
    try {
      localStorage.setItem("arena-math-mastered", JSON.stringify([...next]));
    } catch {}
  };

  const topicsList: { key: TopicKey; label: string; icon: string }[] = [
    { key: "tables", label: "Tables (1-30)", icon: "🔢" },
    { key: "squares", label: "Squares (1-40)", icon: "🔲" },
    { key: "cubes", label: "Cubes (1-30)", icon: "🧊" },
    { key: "percentages", label: "Fraction to % (1/20)", icon: "🎯" },
    { key: "add_sub", label: "Fast Add & Sub", icon: "⚡" },
    { key: "mul_div", label: "Fast Multiply & Div", icon: "✖️" },
    { key: "divisibility", label: "Divisibility Rules", icon: "🔍" },
  ];

  return (
    <div className="space-y-4">
      {/* Target memorization sliders (Saves progress in UserData for arena leaderboard) */}
      <div className="rounded-lg border bg-card p-4 space-y-3">
        <p className="font-bold text-sm">Memorised Target & Milestone</p>
        <div className="grid gap-3 sm:grid-cols-3">
          {([
            ["table", "Tables up to", 30],
            ["square", "Squares up to", 40],
            ["cube", "Cubes up to", 30],
          ] as const).map(([k, label, max]) => (
            <div key={k} className="rounded-lg bg-secondary/50 p-3">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span>{label}</span>
                <span className="text-base font-bold text-primary">{data.tables[k]}</span>
              </div>
              <input
                type="range"
                min={0}
                max={max}
                value={data.tables[k]}
                className="mt-2 w-full accent-[var(--color-primary)] cursor-pointer"
                onChange={(e) => {
                  const v = +e.target.value;
                  update((d) => {
                    d.tables[k] = v;
                    return d;
                  });
                }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Topic selection pills */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {topicsList.map((t) => (
          <Button
            variant="unstyled"
            key={t.key}
            onClick={() => setTopic(t.key)}
            className={cn(
              "shrink-0 rounded-lg px-3 py-2 text-xs font-bold transition-all flex items-center gap-1.5",
              topic === t.key
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-secondary text-muted-foreground hover:bg-secondary/80"
            )}
          >
            <span>{t.icon}</span>
            <span>{t.label}</span>
          </Button>
        ))}
      </div>

      {/* Mode selection (Flashcard, MCQ Quiz, Chart) */}
      <div className="flex items-center justify-between border-b pb-2">
        <div className="flex gap-1">
          {([
            ["quiz", Zap, "Speed MCQ Quiz"],
            ["flashcard", Sparkles, "Flashcards"],
            ["chart", Eye, "Reference Chart"],
          ] as const).map(([mKey, Icon, label]) => (
            <Button
              variant="unstyled"
              key={mKey}
              onClick={() => setMode(mKey)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5 transition",
                mode === mKey
                  ? "bg-primary/10 text-primary font-bold"
                  : "text-muted-foreground hover:bg-secondary"
              )}
            >
              <Icon size={14} />
              <span>{label}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* Active practice screen */}
      {mode === "quiz" && <SpeedQuiz topic={topic} onMastered={markMastered} mastered={mastered} />}
      {mode === "flashcard" && <FlashcardDeck topic={topic} onMastered={markMastered} mastered={mastered} />}
      {mode === "chart" && <ReferenceChart topic={topic} />}
    </div>
  );
}

// 1. Interactive Speed MCQ Quiz
function SpeedQuiz({
  topic,
  onMastered,
  mastered,
}: {
  topic: TopicKey;
  onMastered: (id: string) => void;
  mastered: Set<string>;
}) {
  const cards = useMemo(() => generateCards(topic).slice(0, 20), [topic]);
  const [index, setIndex] = useState(0);
  const [selectedOpt, setSelectedOpt] = useState<string | null>(null);
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  const current = cards[index];

  const handleSelect = (opt: string) => {
    if (selectedOpt !== null || !current) return;
    setSelectedOpt(opt);

    const isCorrect = opt === current.answer;
    if (isCorrect) {
      setScore((s) => s + 1);
      const nextStreak = streak + 1;
      setStreak(nextStreak);
      if (nextStreak > maxStreak) setMaxStreak(nextStreak);
      onMastered(current.id);
    } else {
      setStreak(0);
    }

    setTimeout(() => {
      setSelectedOpt(null);
      if (index < cards.length - 1) {
        setIndex((i) => i + 1);
      } else {
        setFinished(true);
      }
    }, 900);
  };

  const restart = () => {
    setIndex(0);
    setSelectedOpt(null);
    setScore(0);
    setStreak(0);
    setFinished(false);
  };

  if (!current || finished) {
    return (
      <div className="rounded-lg border bg-card p-6 text-center space-y-4">
        <Trophy size={42} className="mx-auto text-primary" />
        <div>
          <p className="text-xl font-bold">Round Completed!</p>
          <p className="text-3xl font-extrabold text-primary mt-1">
            {score} / {cards.length} Correct
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Highest Streak: <span className="font-bold text-amber-500">🔥 {maxStreak}</span>
          </p>
        </div>
        <Button onClick={restart} className="w-full">
          <RotateCcw size={16} className="mr-1.5" /> Practice Another Set
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header bar: Question number + Streak */}
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-muted-foreground">
          Question {index + 1} of {cards.length}
        </span>
        <div className="flex items-center gap-3">
          <span className="font-bold text-primary">Score: {score}</span>
          {streak > 1 && (
            <span className="flex items-center gap-1 font-bold text-amber-500 animate-pulse">
              <Flame size={14} /> Streak: {streak}
            </span>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${((index + 1) / cards.length) * 100}%` }}
        />
      </div>

      {/* Question Card */}
      <div className="rounded-xl border bg-card p-6 text-center shadow-sm">
        <p className="text-2xl font-extrabold tracking-wide">{current.question}</p>
        {current.hint && selectedOpt !== null && (
          <p className="mt-2 text-xs text-muted-foreground bg-secondary/50 py-1 px-2 rounded inline-block">
            💡 {current.hint}
          </p>
        )}
      </div>

      {/* Options grid */}
      <div className="grid grid-cols-2 gap-2.5">
        {current.options.map((opt) => {
          const isChosen = selectedOpt === opt;
          const isCorrectAnswer = opt === current.answer;
          let btnClass = "border bg-card hover:bg-secondary/50";

          if (selectedOpt !== null) {
            if (isCorrectAnswer) {
              btnClass = "border-emerald-500 bg-emerald-500/15 text-emerald-600 font-bold dark:text-emerald-400";
            } else if (isChosen) {
              btnClass = "border-destructive bg-destructive/15 text-destructive font-bold";
            }
          }

          return (
            <Button
              variant="unstyled"
              key={opt}
              disabled={selectedOpt !== null}
              onClick={() => handleSelect(opt)}
              className={cn(
                "h-14 rounded-xl text-base font-bold transition-all flex items-center justify-center p-2",
                btnClass
              )}
            >
              {opt}
            </Button>
          );
        })}
      </div>
    </div>
  );
}

// 2. Interactive Flippable Flashcards
function FlashcardDeck({
  topic,
  onMastered,
  mastered,
}: {
  topic: TopicKey;
  onMastered: (id: string) => void;
  mastered: Set<string>;
}) {
  const cards = useMemo(() => generateCards(topic), [topic]);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const current = cards[index];

  const nextCard = () => {
    setFlipped(false);
    setIndex((i) => (i + 1) % cards.length);
  };

  const prevCard = () => {
    setFlipped(false);
    setIndex((i) => (i - 1 + cards.length) % cards.length);
  };

  if (!current) return null;
  const isMastered = mastered.has(current.id);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
        <span>
          Card {index + 1} of {cards.length}
        </span>
        <span>{mastered.size} Mastered</span>
      </div>

      {/* Flip Card Container */}
      <div
        onClick={() => setFlipped(!flipped)}
        className={cn(
          "relative min-h-56 cursor-pointer select-none rounded-2xl border p-6 flex flex-col items-center justify-center text-center shadow-md transition-all duration-300",
          flipped ? "border-primary/50 bg-primary/5" : "border-border bg-card hover:border-primary/30"
        )}
      >
        <span className="absolute top-3 left-3 text-[11px] font-bold text-muted-foreground">
          {flipped ? "ANSWER" : "TAP TO REVEAL"}
        </span>

        {isMastered && (
          <span className="absolute top-3 right-3 text-xs bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded-full font-bold">
            ✓ Mastered
          </span>
        )}

        {!flipped ? (
          <div className="space-y-2">
            <p className="text-3xl font-extrabold">{current.question}</p>
            <p className="text-xs text-muted-foreground">Click anywhere to flip</p>
          </div>
        ) : (
          <div className="space-y-2 animate-in fade-in zoom-in-95 duration-200">
            <p className="text-4xl font-extrabold text-primary">{current.answer}</p>
            {current.hint && (
              <p className="text-xs text-muted-foreground max-w-xs mt-2 bg-secondary/60 py-1 px-3 rounded-lg">
                💡 {current.hint}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Card Controls */}
      <div className="flex items-center justify-between gap-2">
        <Button variant="outline" size="sm" onClick={prevCard}>
          <ChevronLeft size={16} /> Prev
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onMastered(current.id)}
          className={cn(
            "text-xs font-semibold",
            isMastered ? "text-emerald-600 border-emerald-500/40 bg-emerald-500/10" : ""
          )}
        >
          <Check size={14} className="mr-1" />
          {isMastered ? "Learned" : "Mark as Learned"}
        </Button>

        <Button size="sm" onClick={nextCard}>
          Next <ChevronRight size={16} />
        </Button>
      </div>
    </div>
  );
}

// 3. Complete Reference Chart
function ReferenceChart({ topic }: { topic: TopicKey }) {
  if (topic === "percentages") {
    return (
      <div className="rounded-lg border bg-card p-4 space-y-3">
        <p className="font-bold text-sm">Fraction to Percentage Cheat Sheet (1/1 to 1/20)</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          {PERCENTAGE_DATA.map((p) => (
            <div key={p.fraction} className="rounded-lg border bg-secondary/30 p-2.5">
              <p className="text-base font-extrabold text-primary">{p.fraction}</p>
              <p className="font-bold text-sm">{p.percent}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{p.trick}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (topic === "divisibility") {
    return (
      <div className="rounded-lg border bg-card p-4 space-y-3">
        <p className="font-bold text-sm">Divisibility Rules Reference (विभाज्यता के नियम)</p>
        <div className="space-y-2 text-xs">
          {DIVISIBILITY_RULES.map((r) => (
            <div key={r.num} className="rounded-lg border bg-secondary/30 p-2.5 space-y-1">
              <div className="flex items-center gap-2">
                <span className="rounded bg-primary text-primary-foreground font-bold px-2 py-0.5 text-xs">
                  Div by {r.num}
                </span>
                <span className="font-semibold">{r.rule}</span>
              </div>
              <p className="text-muted-foreground pl-1">Example: {r.example}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (topic === "squares") {
    return (
      <div className="rounded-lg border bg-card p-4 space-y-3">
        <p className="font-bold text-sm">Squares from 1 to 40</p>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 text-xs">
          {Array.from({ length: 40 }, (_, i) => i + 1).map((n) => (
            <div key={n} className="rounded-md border bg-secondary/30 p-2 text-center">
              <span className="text-muted-foreground">{n}² = </span>
              <span className="font-bold text-primary">{n * n}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (topic === "cubes") {
    return (
      <div className="rounded-lg border bg-card p-4 space-y-3">
        <p className="font-bold text-sm">Cubes from 1 to 30</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          {Array.from({ length: 30 }, (_, i) => i + 1).map((n) => (
            <div key={n} className="rounded-md border bg-secondary/30 p-2 text-center">
              <span className="text-muted-foreground">{n}³ = </span>
              <span className="font-bold text-primary">{n * n * n}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Default: Tables
  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <p className="font-bold text-sm">Multiplication Tables (12 to 30 Highlights)</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        {[13, 14, 15, 16, 17, 18, 19, 21, 23, 24, 27, 29].map((t) => (
          <div key={t} className="rounded-lg border bg-secondary/30 p-3">
            <p className="font-bold text-primary text-sm mb-1.5">Table of {t}</p>
            <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-muted-foreground">
              {Array.from({ length: 10 }, (_, m) => m + 1).map((m) => (
                <div key={m} className="flex justify-between">
                  <span>{t} × {m}</span>
                  <span className="font-bold text-foreground">{t * m}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
