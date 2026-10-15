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
  Lightbulb,
  Sliders,
  Search,
  Calculator,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { UserData } from "@/lib/syllabus";

type Upd = (fn: (d: UserData) => UserData) => void;

type TopicKey = "tables" | "squares" | "cubes" | "percentages" | "add_sub" | "mul_div" | "divisibility";
type ModeKey = "quiz" | "flashcard" | "chart" | "tricks";

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
  { num: 2, rule: "Last digit is even (0, 2, 4, 6, 8)", example: "3548 → ends in 8 → Divisible" },
  { num: 3, rule: "Sum of all digits is divisible by 3", example: "453 → 4+5+3 = 12 (divisible by 3) → Divisible" },
  { num: 4, rule: "Last two digits form a number divisible by 4", example: "1936 → 36 is 4 × 9 → Divisible" },
  { num: 5, rule: "Last digit is 0 or 5", example: "7895 → ends in 5 → Divisible" },
  { num: 6, rule: "Divisible by both 2 and 3 (even number with digit sum div by 3)", example: "834 → even & 8+3+4=15 → Divisible" },
  { num: 7, rule: "Double the last digit and subtract from remaining number; check if div by 7", example: "343 → 34 - (2×3) = 28 (div by 7) → Divisible" },
  { num: 8, rule: "Last three digits form a number divisible by 8", example: "43120 → 120 ÷ 8 = 15 → Divisible" },
  { num: 9, rule: "Sum of all digits is divisible by 9", example: "7389 → 7+3+8+9 = 27 (div by 9) → Divisible" },
  { num: 11, rule: "Difference between sum of digits at odd places and even places is 0 or multiple of 11", example: "1331 → (1+3)-(3+1) = 0 → Divisible" },
  { num: 13, rule: "Multiply last digit by 4 and add to remaining number; check if div by 13", example: "273 → 27 + (4×3) = 39 (13 × 3) → Divisible" },
  { num: 17, rule: "Multiply last digit by 5 and subtract from remaining number; check if div by 17", example: "4913 → 491 - (5×3) = 476 → 47 - (5×6) = 17 → Divisible" },
  { num: 19, rule: "Double the last digit and add to remaining number; check if div by 19", example: "6859 → 685 + (2×9) = 703 → 70 + (2×3) = 76 (19 × 4) → Divisible" },
  { num: 72, rule: "SSC High-Yield: Must be divisible by both 8 (last 3 digits) and 9 (digit sum)", example: "56736 → 736 div by 8 & sum=27 div by 9 → Divisible" },
  { num: 88, rule: "SSC High-Yield: Must be divisible by both 8 (last 3 digits) and 11 (alternating sum)", example: "35992 → 992 div by 8 & (3+9+2)-(5+9)=0 → Divisible" },
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
    const multipliers = [12, 13, 14, 15, 16, 17, 18, 19, 21, 23, 24, 26, 27, 28, 29, 7, 8, 9];
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
        hint: n % 10 === 5 ? `Ends with 25: ${Math.floor(n / 10) * (Math.floor(n / 10) + 1)}25` : undefined,
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
    const seed = [
      [47, 86], [68, 75], [89, 54], [76, 58], [94, 67], [83, 49], [65, 87], [92, 79],
      [143, 68], [172, 89], [134, 78], [165, 87], [100, 37], [1000, 348], [121, 45],
    ];
    seed.forEach(([a, b], idx) => {
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
      { n: 56736, div: 72, isDiv: true, hint: "Last 3 digits 736 div by 8 & sum=27 div by 9" },
      { n: 35992, div: 88, isDiv: true, hint: "Last 3 digits 992 div by 8 & alternating sum=0" },
    ];
    tests.forEach((t, i) => {
      cards.push({
        id: `divrule-${i}`,
        question: `Is ${t.n} divisible by ${t.div}?`,
        answer: t.isDiv ? "Yes" : "No",
        options: ["Yes", "No"],
        hint: t.hint,
        topic: "divisibility",
      });
    });
  }

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
  const [showTargets, setShowTargets] = useState(false);
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

  const topicsList: { key: TopicKey; label: string; icon: string; badge: string }[] = [
    { key: "tables", label: "Multiplication Tables", icon: "🔢", badge: "1 to 30" },
    { key: "squares", label: "Squares", icon: "🔲", badge: "1 to 40" },
    { key: "cubes", label: "Cubes", icon: "🧊", badge: "1 to 30" },
    { key: "percentages", label: "Fraction to %", icon: "🎯", badge: "1/1 to 1/20" },
    { key: "add_sub", label: "Fast Addition & Subtraction", icon: "⚡", badge: "2-Digit Drills" },
    { key: "mul_div", label: "Fast Multiplication & Division", icon: "✖️", badge: "Speed Drills" },
    { key: "divisibility", label: "Divisibility Rules", icon: "🔍", badge: "2 to 88" },
  ];

  return (
    <div className="space-y-4">
      {/* 1. Page Hero Card: Speed Math Arena */}
      <div className="relative overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-br from-card via-card/95 to-primary/10 p-5 shadow-lg backdrop-blur-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-bold text-primary tracking-wide">
                <Zap size={13} /> Speed Arithmetic Lab
              </span>
              <span className="text-xs font-semibold text-muted-foreground">SSC CGL · CHSL · CPO</span>
            </div>
            <h2 className="font-display text-2xl font-black tracking-tight text-foreground">
              Calculation Practice Zone
            </h2>
            <p className="text-xs text-muted-foreground max-w-xl">
              Master rapid mental arithmetic, multiplication tables up to 30, squares, cubes, percentage fractions, and high-yield divisibility rules.
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowTargets(!showTargets)}
            className="flex items-center gap-1.5 rounded-xl border-primary/30 text-xs font-bold shadow-sm shrink-0"
          >
            <Sliders size={14} className="text-primary" />
            {showTargets ? "Hide Target Sliders" : "Set Memorized Targets"}
          </Button>
        </div>

        {/* Target Milestone Sliders (Collapsible Drawer) */}
        {showTargets && (
          <div className="mt-4 pt-4 border-t border-border/80 grid gap-3 sm:grid-cols-3 animate-in fade-in zoom-in-95 duration-200">
            {([
              ["table", "Tables up to", 30],
              ["square", "Squares up to", 40],
              ["cube", "Cubes up to", 30],
            ] as const).map(([k, label, max]) => (
              <div key={k} className="rounded-xl border bg-secondary/50 p-3 shadow-inner">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span>{label}</span>
                  <span className="text-lg font-black text-primary font-display">{data.tables[k]}</span>
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
                <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                  <span>0</span>
                  <span>Target: {max}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Live Milestone Badges */}
        <div className="mt-4 pt-3 border-t border-border/50 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg bg-secondary/60 p-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Tables Memorised</p>
            <p className="font-display text-lg font-black text-primary">{data.tables.table} / 30</p>
          </div>
          <div className="rounded-lg bg-secondary/60 p-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Squares Memorised</p>
            <p className="font-display text-lg font-black text-emerald-600 dark:text-emerald-400">{data.tables.square} / 40</p>
          </div>
          <div className="rounded-lg bg-secondary/60 p-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Cubes Memorised</p>
            <p className="font-display text-lg font-black text-amber-500">{data.tables.cube} / 30</p>
          </div>
        </div>
      </div>

      {/* 2. Topic Selector (Touch-friendly Pill Grid) */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {topicsList.map((t) => {
          const active = topic === t.key;
          return (
            <Button
              variant="unstyled"
              key={t.key}
              onClick={() => setTopic(t.key)}
              className={cn(
                "group relative shrink-0 rounded-xl px-3.5 py-2.5 text-xs font-bold transition-all text-left flex items-center gap-2 border",
                active
                  ? "border-primary bg-primary text-primary-foreground shadow-md scale-[1.02]"
                  : "border-border/60 bg-card text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <span className="text-base">{t.icon}</span>
              <div>
                <p className="leading-tight font-semibold">{t.label}</p>
                <p className={cn("text-[10px] font-normal", active ? "text-primary-foreground/80" : "text-muted-foreground")}>
                  {t.badge}
                </p>
              </div>
            </Button>
          );
        })}
      </div>

      {/* 3. Interactive Mode Switcher (Clean Segmented Bar) */}
      <div className="flex items-center justify-between border-b pb-2">
        <div className="flex gap-1 overflow-x-auto">
          {([
            ["quiz", Zap, "Speed MCQ Quiz"],
            ["flashcard", Sparkles, "Flippable Flashcards"],
            ["chart", Eye, "Cheat Sheet Table"],
            ["tricks", Lightbulb, "Mental Math Tricks"],
          ] as const).map(([mKey, Icon, label]) => (
            <Button
              variant="unstyled"
              key={mKey}
              onClick={() => setMode(mKey)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0",
                mode === mKey
                  ? "bg-primary text-primary-foreground font-bold shadow-sm"
                  : "bg-secondary text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
              )}
            >
              <Icon size={14} />
              <span>{label}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* 4. Active Interactive Experience */}
      {mode === "quiz" && <SpeedQuiz topic={topic} onMastered={markMastered} mastered={mastered} />}
      {mode === "flashcard" && <FlashcardDeck topic={topic} onMastered={markMastered} mastered={mastered} />}
      {mode === "chart" && <ReferenceChart topic={topic} />}
      {mode === "tricks" && <CalculationTricksView />}
    </div>
  );
}

// -------------------------------------------------------------
// 1. Interactive Speed MCQ Quiz with Tactile Cards & Timer
// -------------------------------------------------------------
function SpeedQuiz({
  topic,
  onMastered,
  mastered,
}: {
  topic: TopicKey;
  onMastered: (id: string) => void;
  mastered: Set<string>;
}) {
  const cards = useMemo(() => generateCards(topic).slice(0, 15), [topic]);
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
    }, 850);
  };

  const restart = () => {
    setIndex(0);
    setSelectedOpt(null);
    setScore(0);
    setStreak(0);
    setFinished(false);
  };

  if (!current || finished) {
    const accuracy = Math.round((score / cards.length) * 100);
    return (
      <div className="rounded-2xl border border-primary/20 bg-card p-8 text-center space-y-5 shadow-xl animate-in zoom-in-95 duration-200">
        <div className="h-16 w-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center text-primary">
          <Trophy size={36} />
        </div>
        <div className="space-y-1">
          <p className="text-2xl font-black font-display">Sprint Round Complete!</p>
          <p className="text-4xl font-extrabold text-primary font-display">
            {score} / {cards.length}
          </p>
          <p className="text-xs text-muted-foreground">Accuracy: {accuracy}%</p>
        </div>

        <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto text-xs">
          <div className="rounded-xl bg-secondary/50 p-2.5">
            <p className="text-muted-foreground">Highest Streak</p>
            <p className="text-base font-bold text-amber-500">🔥 {maxStreak}</p>
          </div>
          <div className="rounded-xl bg-secondary/50 p-2.5">
            <p className="text-muted-foreground">Speed Status</p>
            <p className="text-base font-bold text-emerald-500">
              {accuracy >= 80 ? "Superfast ⚡" : "Needs Revision 📚"}
            </p>
          </div>
        </div>

        <Button onClick={restart} className="w-full max-w-sm mx-auto font-bold py-3 shadow-md">
          <RotateCcw size={16} className="mr-2" /> Start Another Sprint
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border bg-card p-6 space-y-5 shadow-md">
      {/* Top Status Bar: Counter & Live Streak */}
      <div className="flex items-center justify-between text-xs">
        <span className="font-bold text-muted-foreground">
          Question {index + 1} of {cards.length}
        </span>
        <div className="flex items-center gap-3">
          <span className="font-extrabold text-primary font-display">Score: {score}</span>
          {streak > 1 && (
            <span className="flex items-center gap-1 font-extrabold text-amber-500 animate-pulse bg-amber-500/10 px-2 py-0.5 rounded-full">
              <Flame size={14} /> {streak} Streak!
            </span>
          )}
        </div>
      </div>

      {/* Progress Bar with Glow */}
      <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-primary to-emerald-500 transition-all duration-300"
          style={{ width: `${((index + 1) / cards.length) * 100}%` }}
        />
      </div>

      {/* Question Card Box */}
      <div className="rounded-xl border border-border/80 bg-gradient-to-b from-secondary/40 to-secondary/10 p-8 text-center space-y-2">
        <p className="text-3xl sm:text-4xl font-black font-display tracking-tight text-foreground">
          {current.question}
        </p>
        {current.hint && selectedOpt !== null && (
          <p className="text-xs text-muted-foreground bg-card/80 py-1.5 px-3 rounded-lg inline-block border">
            💡 {current.hint}
          </p>
        )}
      </div>

      {/* 4 Large Tactile Options */}
      <div className="grid grid-cols-2 gap-3">
        {current.options.map((opt, optIdx) => {
          const isChosen = selectedOpt === opt;
          const isCorrectAnswer = opt === current.answer;
          let btnCls = "border-border bg-card hover:bg-secondary/60 hover:border-primary/40 text-foreground";

          if (selectedOpt !== null) {
            if (isCorrectAnswer) {
              btnCls = "border-emerald-500 bg-emerald-500/20 text-emerald-600 font-extrabold shadow-sm dark:text-emerald-400";
            } else if (isChosen) {
              btnCls = "border-destructive bg-destructive/20 text-destructive font-extrabold";
            }
          }

          return (
            <Button
              variant="unstyled"
              key={opt}
              disabled={selectedOpt !== null}
              onClick={() => handleSelect(opt)}
              className={cn(
                "h-16 rounded-xl text-lg font-extrabold transition-all duration-150 flex items-center justify-between px-4 border active:scale-95 shadow-sm",
                btnCls
              )}
            >
              <span className="h-7 w-7 rounded-full bg-secondary text-xs font-bold flex items-center justify-center shrink-0">
                {String.fromCharCode(65 + optIdx)}
              </span>
              <span className="flex-1 text-center font-display">{opt}</span>
              <span className="w-7 shrink-0 flex justify-end">
                {selectedOpt !== null && isCorrectAnswer && <Check size={18} className="text-emerald-500" />}
                {selectedOpt !== null && isChosen && !isCorrectAnswer && <X size={18} className="text-destructive" />}
              </span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// 2. Interactive 3D Flippable Flashcards
// -------------------------------------------------------------
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
      <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold px-1">
        <span>
          Card {index + 1} of {cards.length}
        </span>
        <span className="flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400">
          <Check size={13} /> {mastered.size} Mastered
        </span>
      </div>

      {/* 3D Flip Card Container */}
      <div
        onClick={() => setFlipped(!flipped)}
        className={cn(
          "relative min-h-64 cursor-pointer select-none rounded-2xl border p-8 flex flex-col items-center justify-center text-center shadow-lg transition-all duration-300",
          flipped
            ? "border-primary/50 bg-gradient-to-b from-primary/10 via-card to-card"
            : "border-border bg-gradient-to-b from-card to-secondary/30 hover:border-primary/40"
        )}
      >
        <div className="absolute top-4 left-4 flex items-center gap-2">
          <span className="rounded bg-secondary px-2 py-0.5 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            {flipped ? "ANSWER REVEALED" : "TAP TO REVEAL"}
          </span>
        </div>

        {isMastered && (
          <span className="absolute top-4 right-4 text-xs bg-emerald-500/15 text-emerald-600 px-2.5 py-1 rounded-full font-bold">
            ✓ Mastered
          </span>
        )}

        {!flipped ? (
          <div className="space-y-3">
            <p className="text-4xl sm:text-5xl font-black font-display tracking-tight text-foreground">
              {current.question}
            </p>
            <p className="text-xs text-muted-foreground">Click or tap anywhere to see answer & memory trick</p>
          </div>
        ) : (
          <div className="space-y-3 animate-in fade-in zoom-in-95 duration-200">
            <p className="text-5xl sm:text-6xl font-black text-primary font-display tracking-tight">
              {current.answer}
            </p>
            {current.hint && (
              <p className="text-xs text-muted-foreground max-w-md mx-auto bg-card/90 py-2 px-3 rounded-xl border shadow-sm">
                💡 <span className="font-semibold">{current.hint}</span>
              </p>
            )}
          </div>
        )}
      </div>

      {/* Controls Bar */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <Button variant="outline" size="sm" onClick={prevCard} className="rounded-xl px-4 font-bold">
          <ChevronLeft size={16} className="mr-1" /> Prev
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onMastered(current.id)}
          className={cn(
            "rounded-xl px-4 text-xs font-bold transition-all",
            isMastered
              ? "text-emerald-600 border-emerald-500/40 bg-emerald-500/15"
              : "border-border hover:bg-secondary"
          )}
        >
          <Check size={14} className="mr-1.5" />
          {isMastered ? "Learned (Mastered)" : "Mark as Learned"}
        </Button>

        <Button size="sm" onClick={nextCard} className="rounded-xl px-4 font-bold shadow-sm">
          Next <ChevronRight size={16} className="ml-1" />
        </Button>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// 3. Complete Reference Cheat Sheet Table with Search
// -------------------------------------------------------------
function ReferenceChart({ topic }: { topic: TopicKey }) {
  const [search, setSearch] = useState("");

  if (topic === "percentages") {
    const list = PERCENTAGE_DATA.filter((p) => p.fraction.includes(search) || p.percent.includes(search));
    return (
      <div className="rounded-2xl border bg-card p-5 space-y-4 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="font-bold text-base">Fraction to Percentage Cheat Sheet (1/1 to 1/20)</p>
            <p className="text-xs text-muted-foreground">Standard SSC conversion values for speed solving.</p>
          </div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search e.g. 1/8 or 12.5%..."
            className="w-48 rounded-lg border bg-secondary px-3 py-1.5 text-xs outline-none focus:border-primary"
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
          {list.map((p) => (
            <div key={p.fraction} className="rounded-xl border bg-secondary/30 p-3 space-y-1 hover:border-primary/40 transition">
              <p className="text-lg font-black text-primary font-display">{p.fraction}</p>
              <p className="font-extrabold text-sm text-foreground">{p.percent}</p>
              <p className="text-[11px] text-muted-foreground">{p.trick}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (topic === "divisibility") {
    return (
      <div className="rounded-2xl border bg-card p-5 space-y-4 shadow-sm">
        <div>
          <p className="font-bold text-base">Divisibility Rules Reference & Verification</p>
          <p className="text-xs text-muted-foreground">Complete criteria for SSC divisibility test questions.</p>
        </div>

        <div className="space-y-2.5 text-xs">
          {DIVISIBILITY_RULES.map((r) => (
            <div key={r.num} className="rounded-xl border bg-secondary/30 p-3 space-y-1.5 hover:border-primary/40 transition">
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-primary text-primary-foreground font-extrabold px-2 py-0.5 text-xs">
                  Div by {r.num}
                </span>
                <span className="font-bold text-foreground text-sm">{r.rule}</span>
              </div>
              <p className="text-muted-foreground pl-1 font-mono text-[11px]">Example: {r.example}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (topic === "squares") {
    return (
      <div className="rounded-2xl border bg-card p-5 space-y-4 shadow-sm">
        <div>
          <p className="font-bold text-base">Squares Table from 1 to 40</p>
          <p className="text-xs text-muted-foreground">Quick-recall square roots and squares.</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2 text-xs">
          {Array.from({ length: 40 }, (_, i) => i + 1).map((n) => (
            <div key={n} className="rounded-lg border bg-secondary/30 p-2.5 flex items-center justify-between hover:border-primary/40 transition">
              <span className="text-muted-foreground font-semibold">{n}²</span>
              <span className="font-black text-primary font-display text-sm">{n * n}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (topic === "cubes") {
    return (
      <div className="rounded-2xl border bg-card p-5 space-y-4 shadow-sm">
        <div>
          <p className="font-bold text-base">Cubes Table from 1 to 30</p>
          <p className="text-xs text-muted-foreground">Essential cubes for SSC CGL Tier 1 & Tier 2.</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 text-xs">
          {Array.from({ length: 30 }, (_, i) => i + 1).map((n) => (
            <div key={n} className="rounded-lg border bg-secondary/30 p-2.5 flex items-center justify-between hover:border-primary/40 transition">
              <span className="text-muted-foreground font-semibold">{n}³</span>
              <span className="font-black text-primary font-display text-sm">{n * n * n}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Default: Tables
  return (
    <div className="rounded-2xl border bg-card p-5 space-y-4 shadow-sm">
      <div>
        <p className="font-bold text-base">Multiplication Tables (12 to 30 Highlights)</p>
        <p className="text-xs text-muted-foreground">Most frequent multiplication tables tested in competitive math.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
        {[13, 14, 15, 16, 17, 18, 19, 21, 23, 24, 26, 27, 28, 29].map((t) => (
          <div key={t} className="rounded-xl border bg-secondary/30 p-3.5 space-y-2 hover:border-primary/40 transition">
            <p className="font-black text-primary text-sm font-display">Table of {t}</p>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-muted-foreground">
              {Array.from({ length: 10 }, (_, m) => m + 1).map((m) => (
                <div key={m} className="flex justify-between font-mono">
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

// -------------------------------------------------------------
// 4. Interactive Mental Math Calculation Playground
// -------------------------------------------------------------
function CalculationTricksView() {
  const [squaringInput, setSquaringInput] = useState("65");
  const [multInputA, setMultInputA] = useState("96");
  const [multInputB, setMultInputB] = useState("94");

  // Squaring ending in 5 logic
  const sqVal = parseInt(squaringInput, 10);
  const sqValid = !isNaN(sqVal) && sqVal > 0 && sqVal % 10 === 5;
  const sqTens = Math.floor(sqVal / 10);
  const sqRes = sqTens * (sqTens + 1);

  // Base 100 logic
  const nA = parseInt(multInputA, 10);
  const nB = parseInt(multInputB, 10);
  const multValid = !isNaN(nA) && !isNaN(nB) && nA >= 80 && nA <= 120 && nB >= 80 && nB <= 120;
  const defA = nA - 100;
  const defB = nB - 100;
  const part1 = nA + defB;
  const part2 = defA * defB;

  return (
    <div className="rounded-2xl border bg-card p-5 space-y-5 shadow-sm">
      <div className="flex items-center gap-2.5">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
          <Lightbulb size={22} />
        </div>
        <div>
          <p className="font-extrabold text-base font-display">SSC Mental Math Shortcuts & Interactive Lab</p>
          <p className="text-xs text-muted-foreground">Real-time mental calculation tricks to solve exam questions under 5 seconds.</p>
        </div>
      </div>

      {/* Interactive Playground 1: Squaring Ending in 5 */}
      <div className="rounded-xl border border-primary/25 bg-secondary/20 p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <p className="font-bold text-sm text-primary">🔥 Trick 1: Square Any Number Ending in 5</p>
          <span className="text-[11px] font-semibold text-muted-foreground">Interactive Demo</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold">Try any number:</span>
          <input
            type="number"
            step="10"
            value={squaringInput}
            onChange={(e) => setSquaringInput(e.target.value)}
            className="w-24 rounded-lg border bg-card px-2.5 py-1 text-sm font-bold text-primary text-center"
          />
        </div>

        {sqValid ? (
          <div className="rounded-lg bg-card p-3 border space-y-1 text-xs">
            <p className="font-bold text-sm text-foreground">{sqVal}² = {sqVal * sqVal}</p>
            <p className="text-muted-foreground">
              <b>Step 1:</b> Take tens digit <b>{sqTens}</b> and multiply by next number <b>({sqTens} + 1 = {sqTens + 1})</b> → <b>{sqRes}</b>
            </p>
            <p className="text-muted-foreground">
              <b>Step 2:</b> Append <b>25</b> at the end → <b>{sqRes}25</b>!
            </p>
          </div>
        ) : (
          <p className="text-xs text-amber-500 font-medium">Please enter a positive number ending in 5 (e.g. 25, 35, 65, 85, 115).</p>
        )}
      </div>

      {/* Interactive Playground 2: Base-100 Fast Multiplication */}
      <div className="rounded-xl border border-primary/25 bg-secondary/20 p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <p className="font-bold text-sm text-primary">⚡ Trick 2: Base-100 Rapid Multiplication</p>
          <span className="text-[11px] font-semibold text-muted-foreground">Interactive Demo</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span>Numbers near 100:</span>
          <input
            type="number"
            value={multInputA}
            onChange={(e) => setMultInputA(e.target.value)}
            className="w-20 rounded-lg border bg-card px-2 py-1 text-sm font-bold text-primary text-center"
          />
          <span className="font-bold">×</span>
          <input
            type="number"
            value={multInputB}
            onChange={(e) => setMultInputB(e.target.value)}
            className="w-20 rounded-lg border bg-card px-2 py-1 text-sm font-bold text-primary text-center"
          />
        </div>

        {multValid ? (
          <div className="rounded-lg bg-card p-3 border space-y-1 text-xs">
            <p className="font-bold text-sm text-foreground">{nA} × {nB} = {nA * nB}</p>
            <p className="text-muted-foreground">
              <b>Step 1:</b> Deficits from 100 are <b>{defA}</b> and <b>{defB}</b>.
            </p>
            <p className="text-muted-foreground">
              <b>Step 2:</b> Left side = {nA} + ({defB}) = <b>{part1}</b>
            </p>
            <p className="text-muted-foreground">
              <b>Step 3:</b> Right side = ({defA}) × ({defB}) = <b>{String(part2).padStart(2, "0")}</b> → Answer: <b>{nA * nB}</b>!
            </p>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Enter numbers between 80 and 120 (e.g. 96 × 94, 104 × 107).</p>
        )}
      </div>

      {/* Static Trick Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <div className="rounded-xl border bg-secondary/20 p-3.5 space-y-1.5">
          <p className="font-bold text-primary">3. Multiply by 11 Trick</p>
          <p className="text-muted-foreground">Keep outer digits and insert the sum in the middle.</p>
          <p className="font-mono bg-card p-2 rounded border">45 × 11 → 4 | (4+5) | 5 = 495</p>
          <p className="font-mono bg-card p-2 rounded border">78 × 11 → 7 | (7+8=15) | 8 = 858</p>
        </div>

        <div className="rounded-xl border bg-secondary/20 p-3.5 space-y-1.5">
          <p className="font-bold text-primary">4. Multiply by 5, 25, 125</p>
          <p className="text-muted-foreground">Use division by powers of 2 instead of long multiplication.</p>
          <p className="font-mono bg-card p-2 rounded border">84 × 5 = (84 ÷ 2) × 10 = 420</p>
          <p className="font-mono bg-card p-2 rounded border">64 × 25 = (64 ÷ 4) × 100 = 1600</p>
        </div>

        <div className="rounded-xl border bg-secondary/20 p-3.5 space-y-1.5">
          <p className="font-bold text-primary">5. Percentage Split Method</p>
          <p className="text-muted-foreground">Break percentages into 10%, 5%, 1% benchmarks.</p>
          <p className="font-mono bg-card p-2 rounded border">15% of 640 = 64 (10%) + 32 (5%) = 96</p>
          <p className="font-mono bg-card p-2 rounded border">37.5% of 480 = 3/8 × 480 = 180</p>
        </div>

        <div className="rounded-xl border bg-secondary/20 p-3.5 space-y-1.5">
          <p className="font-bold text-primary">6. SSC High-Yield Compound Divisibility</p>
          <p className="text-muted-foreground">Most repeated question type in SSC CGL Tier 1.</p>
          <p className="font-mono bg-card p-2 rounded border">Div by 72 → Check Div by 8 AND Div by 9</p>
          <p className="font-mono bg-card p-2 rounded border">Div by 88 → Check Div by 8 AND Div by 11</p>
        </div>
      </div>
    </div>
  );
}
