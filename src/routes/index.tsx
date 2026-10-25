import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { changePassword, getActivity, login, ping } from "@/lib/data.functions";
import { deleteQuiz, createQuiz, parseQuizHtml, type QQ } from "@/lib/quiz.functions";
import { useQuizzes, QuizPlayer } from "@/components/quiz-zone";
import { Button } from "@/components/ui/button";
import {
  Trophy, Award, Check, Play, RotateCcw, Swords, Sparkles, Plus,
  Search, ChevronRight, KeyRound, LogOut, Menu, X,
  BarChart3, Users, Eye, EyeOff, Trash2, CheckCircle2,
  Compass, Shield, Flame, Share2, Copy, CheckCheck,
  FileUp
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MotionPresence } from "@/components/motion-presence";
import { useWorkspaceNavigation, validateWorkspaceSearch } from "@/lib/workspace-navigation";
import { SYLLABUS } from "@/lib/syllabus";

export const Route = createFileRoute("/")({
  validateSearch: validateWorkspaceSearch,
  head: () => ({
    title: "SSC Quiz Arena — GK/GS, Maths & Reasoning",
    meta: [
      { property: "og:title", content: "🎯 SSC Quiz Arena — GK/GS, Maths & Reasoning" },
      { name: "description", content: "SSC Quizzes for GK/GS, Maths & Reasoning by subjects, leaderboard, attempt tracker & player scoreboard for Arun, Ali, Naveen and Devansh." },
      { property: "og:description", content: "Compete on uploaded SSC Quizzes, track marks and live leaderboard." },
      { property: "og:image", content: "/icon-512.png" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: App,
});

export const PLAYERS = ["arun", "ali", "naveen", "devansh"] as const;
type PlayerName = (typeof PLAYERS)[number];

type Auth = { username: string; password: string; isDefault?: boolean };
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

type Quiz = {
  id: string;
  title: string;
  chapter?: string | null;
  day?: string | null;
  questions: QQ[];
  created_at?: string;
  expired?: boolean;
};

type Attempt = {
  quiz_id: string;
  username: string;
  score: number;
  total: number;
  answers: number[];
  at: string;
};

export type MasterSubject = "gk" | "maths" | "reasoning";

export const MASTER_SUBJECTS = [
  {
    id: "gk" as const,
    name: "GK / GS",
    hindi: "सामान्य ज्ञान व विज्ञान",
    icon: "🏛️",
    accent: "text-amber-400",
    badge: "Static · Polity · Hist · Geo · Sci",
    gradient: "from-amber-500/20 via-primary/10 to-card",
    borderActive: "border-amber-500 shadow-amber-500/20 bg-amber-500/10",
    desc: "Constitution, History, Geography, Economics & Science",
  },
  {
    id: "maths" as const,
    name: "Maths",
    hindi: "गणित (Quantitative Aptitude)",
    icon: "🔢",
    accent: "text-emerald-400",
    badge: "Arithmetic · Advance · Mensuration",
    gradient: "from-emerald-500/20 via-teal-500/10 to-card",
    borderActive: "border-emerald-500 shadow-emerald-500/20 bg-emerald-500/10",
    desc: "Percentage, Profit/Loss, Time/Work, Algebra, Trig & DI",
  },
  {
    id: "reasoning" as const,
    name: "Reasoning",
    hindi: "तर्कशक्ति (General Intelligence)",
    icon: "🧩",
    accent: "text-cyan-400",
    badge: "Blood Relations · Coding · Syllogism",
    gradient: "from-cyan-500/20 via-blue-500/10 to-card",
    borderActive: "border-cyan-500 shadow-cyan-500/20 bg-cyan-500/10",
    desc: "Family Tree, Symbol Relations, Coding, Series & Figures",
  },
] as const;

type SubjectBox = {
  id: string;
  name: string;
  hindi: string;
  icon: string;
  badge: string;
  activeBg: string;
  desc: string;
  matcher: (z: Quiz) => boolean;
};

export const GK_SUBJECT_BOXES: SubjectBox[] = [
  {
    id: "all",
    name: "All GK/GS",
    hindi: "सभी प्रश्नोत्तरी",
    icon: "🎯",
    badge: "Master Bank",
    activeBg: "bg-primary/15 border-primary shadow-lg shadow-primary/20",
    desc: "Complete SSC GK/GS collection",
    matcher: () => true,
  },
  {
    id: "polity",
    name: "Polity",
    hindi: "भारतीय राजव्यवस्था",
    icon: "🏛️",
    badge: "Constitution",
    activeBg: "bg-blue-500/15 border-blue-500 shadow-lg shadow-blue-500/20",
    desc: "Articles, Amendments, Parliament & Rights",
    matcher: (z) => {
      const s = `${z.title || ""} ${z.chapter || ""}`.toLowerCase();
      return s.includes("polity") || s.includes("constitution") || s.includes("article") || s.includes("parliament") || s.includes("amendment") || s.includes("dpsp") || s.includes("president");
    },
  },
  {
    id: "history",
    name: "History",
    hindi: "इतिहास",
    icon: "📜",
    badge: "Ancient · Med · Mod",
    activeBg: "bg-amber-500/15 border-amber-500 shadow-lg shadow-amber-500/20",
    desc: "Mughals, Freedom Struggle, Vedic & Mauryas",
    matcher: (z) => {
      const s = `${z.title || ""} ${z.chapter || ""}`.toLowerCase();
      return s.includes("history") || s.includes("mughal") || s.includes("ancient") || s.includes("medieval") || s.includes("modern") || s.includes("sultan") || s.includes("gandhi") || s.includes("revolt") || s.includes("vedic") || s.includes("maurya");
    },
  },
  {
    id: "geo",
    name: "Geography",
    hindi: "भूगोल",
    icon: "🌍",
    badge: "India & World",
    activeBg: "bg-emerald-500/15 border-emerald-500 shadow-lg shadow-emerald-500/20",
    desc: "Rivers, Himalayas, Climate, Oceans & Maps",
    matcher: (z) => {
      const s = `${z.title || ""} ${z.chapter || ""}`.toLowerCase();
      return s.includes("geo") || s.includes("river") || s.includes("mountain") || s.includes("monsoon") || s.includes("soil") || s.includes("plateau") || s.includes("ocean") || s.includes("solar");
    },
  },
  {
    id: "eco",
    name: "Economics",
    hindi: "अर्थव्यवस्था",
    icon: "📈",
    badge: "Economy & Budget",
    activeBg: "bg-rose-500/15 border-rose-500 shadow-lg shadow-rose-500/20",
    desc: "Budget, GDP, Banking, Inflation & 5-Yr Plans",
    matcher: (z) => {
      const s = `${z.title || ""} ${z.chapter || ""}`.toLowerCase();
      return s.includes("eco") || s.includes("budget") || s.includes("tax") || s.includes("gdp") || s.includes("bank") || s.includes("inflation");
    },
  },
  {
    id: "sci",
    name: "Science",
    hindi: "सामान्य विज्ञान",
    icon: "🔬",
    badge: "Phy · Chem · Bio",
    activeBg: "bg-sky-500/15 border-sky-500 shadow-lg shadow-sky-500/20",
    desc: "Human Body, Periodic Table, Mechanics & Optics",
    matcher: (z) => {
      const s = `${z.title || ""} ${z.chapter || ""}`.toLowerCase();
      return s.includes("sci") || s.includes("physic") || s.includes("chem") || s.includes("bio") || s.includes("cell") || s.includes("matter") || s.includes("disease") || s.includes("force") || s.includes("periodic");
    },
  },
  {
    id: "static",
    name: "Static GK",
    hindi: "विविध व संस्कृति",
    icon: "💡",
    badge: "Art & Culture",
    activeBg: "bg-violet-500/15 border-violet-500 shadow-lg shadow-violet-500/20",
    desc: "Dances, Festivals, Gharanas, Books & Sports",
    matcher: (z) => {
      const s = `${z.title || ""} ${z.chapter || ""}`.toLowerCase();
      return s.includes("static") || s.includes("dance") || s.includes("festival") || s.includes("book") || s.includes("author") || s.includes("sport") || s.includes("census") || s.includes("organis");
    },
  },
];

export const MATHS_SUBJECT_BOXES: SubjectBox[] = [
  {
    id: "all",
    name: "All Maths",
    hindi: "सम्पूर्ण गणित",
    icon: "🔢",
    badge: "Quant Master",
    activeBg: "bg-amber-500/15 border-amber-500 shadow-lg shadow-amber-500/20",
    desc: "Complete SSC Quantitative Aptitude collection",
    matcher: () => true,
  },
  {
    id: "arithmetic",
    name: "Arithmetic",
    hindi: "अंकगणित",
    icon: "📊",
    badge: "Commercial Maths",
    activeBg: "bg-emerald-500/15 border-emerald-500 shadow-lg shadow-emerald-500/20",
    desc: "Percentage, Profit & Loss, Ratio, SI & CI, Average",
    matcher: (z) => {
      const s = `${z.title || ""} ${z.chapter || ""}`.toLowerCase();
      return s.includes("percent") || s.includes("profit") || s.includes("loss") || s.includes("discount") || s.includes("ratio") || s.includes("interest") || s.includes("average") || s.includes("partnership") || s.includes("mixture") || s.includes("alligation");
    },
  },
  {
    id: "time_work_speed",
    name: "Time, Work & Speed",
    hindi: "समय, कार्य और गति",
    icon: "⏱️",
    badge: "Pipes & Boats",
    activeBg: "bg-blue-500/15 border-blue-500 shadow-lg shadow-blue-500/20",
    desc: "Time & Work, Pipes & Cisterns, Speed, Distance & Trains",
    matcher: (z) => {
      const s = `${z.title || ""} ${z.chapter || ""}`.toLowerCase();
      return s.includes("time") || s.includes("work") || s.includes("pipe") || s.includes("cistern") || s.includes("speed") || s.includes("distance") || s.includes("train") || s.includes("boat") || s.includes("stream") || s.includes("race");
    },
  },
  {
    id: "advance",
    name: "Advance Maths",
    hindi: "एडवांस गणित",
    icon: "📐",
    badge: "Algebra & Trig",
    activeBg: "bg-purple-500/15 border-purple-500 shadow-lg shadow-purple-500/20",
    desc: "Algebra, Trigonometry, Heights & Distances, Coordinates",
    matcher: (z) => {
      const s = `${z.title || ""} ${z.chapter || ""}`.toLowerCase();
      return s.includes("algebra") || s.includes("trig") || s.includes("height") || s.includes("polynomial") || s.includes("coordinate");
    },
  },
  {
    id: "geometry",
    name: "Geometry & 2D/3D",
    hindi: "ज्यामिति व क्षेत्रमिति",
    icon: "📏",
    badge: "Triangles & Circles",
    activeBg: "bg-rose-500/15 border-rose-500 shadow-lg shadow-rose-500/20",
    desc: "Mensuration 2D & 3D, Triangles, Circles, Polygons",
    matcher: (z) => {
      const s = `${z.title || ""} ${z.chapter || ""}`.toLowerCase();
      return s.includes("geom") || s.includes("mensuration") || s.includes("triangle") || s.includes("circle") || s.includes("polygon") || s.includes("area") || s.includes("volume") || s.includes("2d") || s.includes("3d");
    },
  },
  {
    id: "number_system",
    name: "Number System",
    hindi: "संख्या पद्धति",
    icon: "🔢",
    badge: "HCF & LCM",
    activeBg: "bg-sky-500/15 border-sky-500 shadow-lg shadow-sky-500/20",
    desc: "HCF, LCM, Divisibility, Unit Digit & Simplification",
    matcher: (z) => {
      const s = `${z.title || ""} ${z.chapter || ""}`.toLowerCase();
      return s.includes("number") || s.includes("hcf") || s.includes("lcm") || s.includes("simplif") || s.includes("divisib") || s.includes("factor") || s.includes("remainder");
    },
  },
  {
    id: "di",
    name: "Data Interpretation",
    hindi: "आँकड़ा निर्वचन (DI)",
    icon: "📈",
    badge: "Charts & Tables",
    activeBg: "bg-teal-500/15 border-teal-500 shadow-lg shadow-teal-500/20",
    desc: "Pie Charts, Bar Graphs, Tables, Line Graphs & Stats",
    matcher: (z) => {
      const s = `${z.title || ""} ${z.chapter || ""}`.toLowerCase();
      return s.includes("data") || s.includes("di") || s.includes("chart") || s.includes("graph") || s.includes("table") || s.includes("statistics") || s.includes("probability");
    },
  },
];

export const REASONING_SUBJECT_BOXES: SubjectBox[] = [
  {
    id: "all",
    name: "All Reasoning",
    hindi: "सम्पूर्ण तर्कशक्ति",
    icon: "🧩",
    badge: "GI Master Bank",
    activeBg: "bg-cyan-500/15 border-cyan-500 shadow-lg shadow-cyan-500/20",
    desc: "Complete SSC General Intelligence collection",
    matcher: () => true,
  },
  {
    id: "blood_relations",
    name: "Blood Relations",
    hindi: "रक्त संबंध व प्रतीक",
    icon: "👥",
    badge: "Family Tree & Symbols",
    activeBg: "bg-rose-500/15 border-rose-500 shadow-lg shadow-rose-500/20",
    desc: "Coded Relations, Family Trees, Pointing & Symbol Based",
    matcher: (z) => {
      const s = `${z.title || ""} ${z.chapter || ""}`.toLowerCase();
      return s.includes("blood") || s.includes("relation") || s.includes("symbol") || s.includes("family");
    },
  },
  {
    id: "coding_decoding",
    name: "Coding & Decoding",
    hindi: "कोडिंग - डिकोडिंग",
    icon: "🔐",
    badge: "Letter & Number",
    activeBg: "bg-indigo-500/15 border-indigo-500 shadow-lg shadow-indigo-500/20",
    desc: "Letter Shifting, Number Coded, Matrix & Substitution",
    matcher: (z) => {
      const s = `${z.title || ""} ${z.chapter || ""}`.toLowerCase();
      return s.includes("coding") || s.includes("decod") || s.includes("cipher") || s.includes("matrix");
    },
  },
  {
    id: "syllogism",
    name: "Syllogism & Venn",
    hindi: "न्याय निगमन व वेन",
    icon: "⭕",
    badge: "Statements & Logic",
    activeBg: "bg-emerald-500/15 border-emerald-500 shadow-lg shadow-emerald-500/20",
    desc: "Statements & Conclusions, Possibility Cases & Venn Diagrams",
    matcher: (z) => {
      const s = `${z.title || ""} ${z.chapter || ""}`.toLowerCase();
      return s.includes("syllogism") || s.includes("venn") || s.includes("conclusion") || s.includes("statement") || s.includes("argument") || s.includes("assumption");
    },
  },
  {
    id: "series_analogy",
    name: "Series & Analogy",
    hindi: "श्रृंखला और सादृश्यता",
    icon: "🔗",
    badge: "Number & Alpha",
    activeBg: "bg-amber-500/15 border-amber-500 shadow-lg shadow-amber-500/20",
    desc: "Number Series, Alphabet Series, Semantic & Figural Analogy",
    matcher: (z) => {
      const s = `${z.title || ""} ${z.chapter || ""}`.toLowerCase();
      return s.includes("series") || s.includes("analogy") || s.includes("analog") || s.includes("missing") || s.includes("odd one") || s.includes("classif");
    },
  },
  {
    id: "direction_seating",
    name: "Direction & Seating",
    hindi: "दिशा व बैठक व्यवस्था",
    icon: "🧭",
    badge: "Distance & Arrangement",
    activeBg: "bg-sky-500/15 border-sky-500 shadow-lg shadow-sky-500/20",
    desc: "Linear, Circular & Square Arrangements, Direction & Shadows",
    matcher: (z) => {
      const s = `${z.title || ""} ${z.chapter || ""}`.toLowerCase();
      return s.includes("direction") || s.includes("distance") || s.includes("seating") || s.includes("arrangement") || s.includes("order") || s.includes("ranking");
    },
  },
  {
    id: "non_verbal",
    name: "Non-Verbal & Figures",
    hindi: "चित्रात्मक तर्क",
    icon: "🪞",
    badge: "Mirror, Dice & Paper",
    activeBg: "bg-violet-500/15 border-violet-500 shadow-lg shadow-violet-500/20",
    desc: "Dice, Cubes, Mirror & Water Images, Paper Cutting & Folding",
    matcher: (z) => {
      const s = `${z.title || ""} ${z.chapter || ""}`.toLowerCase();
      return s.includes("mirror") || s.includes("water") || s.includes("paper") || s.includes("dice") || s.includes("cube") || s.includes("figure") || s.includes("embedded") || s.includes("pattern");
    },
  },
];

export function getQuizMasterSubject(z: Quiz): MasterSubject {
  const ch = (z.chapter || "").toLowerCase();
  const t = (z.title || "").toLowerCase();
  const combined = `${ch} ${t}`;

  if (ch.startsWith("reasoning") || /reasoning|blood|relation|symbol|coding|decod|syllogism|analogy|analogies|direction|seating|dice|cube|clock|calendar|series|mirror|paper|puzzle|venn|statement|conclusion/i.test(combined)) {
    return "reasoning";
  }
  if (ch.startsWith("math") || /math|arithmetic|advance|percentage|ratio|proportion|profit|loss|discount|interest|\bsi\b|\bci\b|time|work|pipe|cistern|speed|distance|train|boat|stream|algebra|trigonometry|geometry|mensuration|number\s*system|hcf|lcm|simplification|data\s*interpretation|\bdi\b/i.test(combined)) {
    return "maths";
  }
  return "gk";
}

function WhatsAppIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
    </svg>
  );
}

function getShareData() {
  const url = typeof window !== "undefined" ? window.location.origin : "https://ssc-arena.pages.dev";
  const text = `🎯 *SSC GK/GS Quiz Arena*\n\n🔥 Compete on uploaded GK/GS Quizzes, check live marks & scoreboard!\n\n👥 *Players:* Arun, Ali, Naveen, Devansh\n🔑 *Default Password:* 1234\n\n👉 *Join Arena:* ${url}`;
  return { url, text };
}

const cleanNorm = (str: string) =>
  str
    .toLowerCase()
    .replace(/^(?:maths|reasoning|gk\/gs|gk|gs)\s*:\s*/i, "")
    .replace(/[–—\-&]/g, " ")
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();

type SyllabusEntry = { chapter: string; clean: string; tokens: string[] };

const SYLLABUS_ORDER_MAP: Record<MasterSubject, SyllabusEntry[]> = {
  gk: [],
  maths: [],
  reasoning: [],
};

function initSyllabusOrderMap() {
  const getSubjectKey = (s: MasterSubject) => {
    if (s === "maths") return "Maths";
    if (s === "reasoning") return "Reasoning";
    return "GS";
  };

  (["gk", "maths", "reasoning"] as MasterSubject[]).forEach((sub) => {
    const targetKey = getSubjectKey(sub);
    const found = SYLLABUS.find((x) => x.subject.toLowerCase() === targetKey.toLowerCase());
    if (!found) return;

    const list: SyllabusEntry[] = [];
    for (const sec of found.sections) {
      for (const ch of sec.chapters) {
        const clean = cleanNorm(ch);
        const tokens = clean.split(" ").filter((t) => t.length > 2 && t !== "and" && t !== "the");
        list.push({ chapter: ch, clean, tokens });
      }
    }
    SYLLABUS_ORDER_MAP[sub] = list;
  });
}
initSyllabusOrderMap();

export function getSyllabusChapterOrder(subject: MasterSubject, rawChapter: string): number {
  if (!rawChapter) return 9999;
  const list = SYLLABUS_ORDER_MAP[subject] || [];
  const cleanRaw = cleanNorm(rawChapter);
  if (!cleanRaw) return 9999;

  // 1. Exact clean match
  for (let i = 0; i < list.length; i++) {
    if (list[i].clean === cleanRaw) return i;
  }

  // 2. Singular/plural match (e.g. "blood relations" vs "blood relation")
  const singularRaw = cleanRaw.replace(/s\b/g, "");
  for (let i = 0; i < list.length; i++) {
    const singularSyllabus = list[i].clean.replace(/s\b/g, "");
    if (singularSyllabus === singularRaw) return i;
  }

  // 3. Substring inclusion match (e.g. "Coding-Decoding Test" includes "coding decoding" or vice-versa)
  for (let i = 0; i < list.length; i++) {
    if (cleanRaw.includes(list[i].clean) || list[i].clean.includes(cleanRaw)) {
      return i;
    }
  }

  // 4. Token overlap match (e.g. if key tokens like "blood" and "relation" match)
  const rawTokens = cleanRaw.split(" ").filter((t) => t.length > 2 && t !== "and" && t !== "the");
  if (rawTokens.length > 0) {
    let bestIndex = -1;
    let bestScore = 0;

    for (let i = 0; i < list.length; i++) {
      const matchCount = list[i].tokens.filter((tok) =>
        rawTokens.some((rt) => rt === tok || rt.startsWith(tok) || tok.startsWith(rt))
      ).length;
      if (matchCount > bestScore) {
        bestScore = matchCount;
        bestIndex = i;
      }
    }

    if (bestIndex !== -1 && bestScore >= Math.min(2, rawTokens.length)) {
      return bestIndex;
    }
  }

  return 9999;
}

function App() {
  return <ArenaApp />;
}

function ArenaApp() {
  const [auth, setAuth] = useState<Auth | null>(null);
  const [ready, setReady] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  const { search, change } = useWorkspaceNavigation();
  const popup = search.panel === "password";
  const setPopup = (open: boolean) => change({ panel: open ? "password" : undefined }, !open);

  useEffect(() => {
    const raw = localStorage.getItem("arena-auth");
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        setAuth(parsed);
      } catch {}
    }
    setReady(true);
  }, []);

  const store = (a: Auth) => {
    localStorage.setItem("arena-auth", JSON.stringify(a));
    setAuth(a);
  };

  if (!ready) return null;

  if (!auth) {
    return (
      <Login
        onLogin={(a) => {
          store(a);
          if (a.isDefault) setPopup(true);
        }}
        onOpenShare={() => setShowShareModal(true)}
      />
    );
  }

  return (
    <>
      <Main
        auth={auth}
        openPass={() => setPopup(true)}
        openShare={() => setShowShareModal(true)}
        logout={() => {
          localStorage.removeItem("arena-auth");
          setAuth(null);
        }}
      />

      {/* WhatsApp Share Modal */}
      <MotionPresence open={showShareModal}>
        <ShareModal onClose={() => setShowShareModal(false)} />
      </MotionPresence>

      {/* Change Password Modal */}
      <MotionPresence open={popup}>
        <PassPopup
          auth={auth}
          onClose={() => setPopup(false)}
          onChanged={(np) => {
            store({ ...auth, password: np, isDefault: false });
            setPopup(false);
          }}
        />
      </MotionPresence>
    </>
  );
}


function ShareModal({ onClose }: { onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const { url, text } = getShareData();
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: "SSC GK/GS Quiz Arena",
          text,
          url,
        });
        onClose();
      } catch {}
    } else {
      window.open(whatsappUrl, "_blank");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/85 p-4 backdrop-blur-md" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm space-y-4 rounded-3xl border border-border/80 bg-card p-6 shadow-2xl backdrop-blur-2xl"
      >
        <div className="flex items-center justify-between pb-1">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <WhatsAppIcon className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-base font-extrabold text-foreground">Share SSC GK Arena</h2>
              <p className="text-[11px] font-semibold text-muted-foreground">Invite Arun, Ali, Naveen & Devansh</p>
            </div>
          </div>
          <Button variant="unstyled" onClick={onClose} type="button" className="p-1 rounded-full text-muted-foreground hover:bg-secondary">
            <X size={18} />
          </Button>
        </div>

        {/* Clean URL Box */}
        <div className="rounded-2xl border border-border/80 bg-secondary/50 p-3 space-y-2">
          <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block">
            Arena Invite Link
          </label>
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={url}
              className="w-full rounded-xl border border-input bg-background/80 px-3 py-2 text-xs font-bold text-foreground outline-none select-all truncate"
            />
            <Button
              variant="unstyled"
              onClick={handleCopy}
              className="shrink-0 rounded-xl bg-secondary border border-border px-3 py-2 text-xs font-bold text-foreground active:scale-95 flex items-center gap-1"
            >
              {copied ? <CheckCheck size={14} className="text-emerald-400" /> : <Copy size={14} />}
              <span>{copied ? "Copied" : "Copy"}</span>
            </Button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-1">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onClose}
            className="w-full rounded-2xl bg-emerald-500 hover:bg-emerald-600 py-3.5 text-xs font-black text-white shadow-lg shadow-emerald-500/25 active:scale-95 flex items-center justify-center gap-2 transition"
          >
            <WhatsAppIcon className="h-4 w-4" />
            <span>Share Directly on WhatsApp</span>
          </a>

          {typeof navigator !== "undefined" && typeof navigator.share === "function" && (
            <Button
              variant="unstyled"
              onClick={handleNativeShare}
              className="w-full rounded-2xl border border-border/80 bg-secondary/70 py-3 text-xs font-bold text-foreground hover:bg-secondary active:scale-95 flex items-center justify-center gap-2"
            >
              <Share2 size={15} />
              <span>Share via Other Apps</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function PassPopup({ auth, onClose, onChanged }: { auth: Auth; onClose: () => void; onChanged: (p: string) => void }) {
  const change = useServerFn(changePassword);
  const [np, setNp] = useState("");
  const [np2, setNp2] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-md" onClick={onClose}>
      <form
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm space-y-4 rounded-3xl border border-border/80 bg-card/95 p-6 shadow-2xl backdrop-blur-xl"
        onSubmit={async (e) => {
          e.preventDefault();
          setErr("");
          if (np.length < 4) return setErr("Use at least 4 characters.");
          if (np !== np2) return setErr("The passwords do not match.");
          setBusy(true);
          try {
            await change({ data: { username: auth.username, password: auth.password, newPassword: np } });
            onChanged(np);
          } catch (x: any) {
            setErr(x?.message || "Something went wrong. Please try again.");
          }
          setBusy(false);
        }}
      >
        <div>
          <h2 className="font-display text-lg font-extrabold">Change Password</h2>
          <p className="mt-1 text-xs text-muted-foreground font-semibold">
            {auth.isDefault ? "You are using default password. Protect your account." : "Enter and confirm your new password."}
          </p>
        </div>
        <div className="space-y-2.5">
          <input
            value={np}
            onChange={(e) => setNp(e.target.value)}
            type="password"
            autoComplete="new-password"
            placeholder="New password"
            className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm font-semibold outline-none focus:border-primary"
          />
          <input
            value={np2}
            onChange={(e) => setNp2(e.target.value)}
            type="password"
            autoComplete="new-password"
            placeholder="Confirm new password"
            className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm font-semibold outline-none focus:border-primary"
          />
        </div>
        {err && <p className="rounded-xl bg-destructive/10 border border-destructive/20 p-2.5 text-xs font-semibold text-destructive">{err}</p>}
        <div className="flex gap-2 pt-1">
          <Button variant="unstyled" type="button" onClick={onClose} className="flex-1 rounded-2xl border border-border bg-secondary/50 py-3 text-xs font-bold active:scale-95">
            Not now
          </Button>
          <Button
            variant="unstyled"
            disabled={busy}
            className="flex-1 rounded-2xl bg-gradient-to-r from-primary to-accent py-3 text-xs font-bold text-primary-foreground shadow-md shadow-primary/20 active:scale-95 disabled:opacity-60"
          >
            {busy ? "Saving…" : "Save"}
          </Button>
        </div>
      </form>
    </div>
  );
}

function Login({
  onLogin,
  onOpenShare,
}: {
  onLogin: (a: Auth) => void;
  onOpenShare: () => void;
}) {
  const doLogin = useServerFn(login);
  const [u, setU] = useState<string>("arun");
  const [p, setP] = useState<string>("1234");
  const [showPass, setShowPass] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-background selection:bg-primary/30">
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (!u || !p) return setErr("Please choose a player and enter password.");
          setErr("");
          setBusy(true);
          try {
            const res = await doLogin({ data: { username: u, password: p } });
            if (!res.ok) throw new Error("Invalid username or password.");
            onLogin({ username: res.username, password: p, isDefault: res.isDefault });
          } catch (x: any) {
            setErr(x?.message || "Login failed. Check your password.");
          }
          setBusy(false);
        }}
        className="w-full max-w-sm space-y-4 rounded-3xl border border-border/80 bg-card/95 p-6 shadow-2xl backdrop-blur-2xl"
      >
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-primary to-accent shadow-lg shadow-primary/30">
            <Trophy className="h-7 w-7 text-white" />
          </div>
          <h1 className="mt-3 text-2xl font-black font-display text-foreground tracking-tight">GK/GS Quiz Arena</h1>
          <p className="mt-1 text-xs font-semibold text-muted-foreground">Select your player profile to enter</p>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-[11px] font-black uppercase tracking-wider text-muted-foreground block mb-2 text-center">
              Choose Player
            </label>
            <div className="grid grid-cols-2 gap-2">
              {PLAYERS.map((usr) => {
                const isSelected = u.toLowerCase() === usr.toLowerCase();
                return (
                  <Button
                    key={usr}
                    type="button"
                    variant="unstyled"
                    onClick={() => {
                      setU(usr);
                      if (!p) setP("1234");
                    }}
                    className={cn(
                      "flex items-center gap-2.5 p-3 rounded-2xl border transition-all duration-200 active:scale-95 text-left",
                      isSelected
                        ? "border-primary bg-primary text-primary-foreground shadow-md shadow-primary/30"
                        : "border-border/80 bg-secondary/60 text-muted-foreground hover:text-foreground hover:bg-secondary"
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-xl font-display font-black text-xs shrink-0",
                        isSelected
                          ? "bg-white text-primary"
                          : "bg-secondary text-foreground border border-border"
                      )}
                    >
                      {usr[0].toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-display font-black text-xs leading-tight truncate">{cap(usr)}</p>
                      <p className={cn("text-[10px] font-bold truncate", isSelected ? "text-primary-foreground/80" : "text-muted-foreground")}>
                        {usr === "arun" ? "Admin" : "Player"}
                      </p>
                    </div>
                  </Button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="text-[11px] font-black uppercase tracking-wider text-muted-foreground block mb-1">Password</label>
            <div className="relative">
              <input
                value={p}
                onChange={(e) => setP(e.target.value)}
                type={showPass ? "text" : "password"}
                placeholder="Password (default: 1234)"
                className="w-full rounded-2xl border border-input bg-background/90 px-4 py-3 text-sm font-semibold outline-none focus:border-primary pr-11"
              />
              <Button
                variant="unstyled"
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1 text-center font-medium">
              Default password for all 4 players is <strong>1234</strong>
            </p>
          </div>
        </div>

        {err && <p className="rounded-xl bg-destructive/10 border border-destructive/20 p-2.5 text-xs font-bold text-destructive text-center">{err}</p>}

        <Button
          variant="unstyled"
          disabled={busy || !u || !p}
          type="submit"
          className="w-full rounded-2xl bg-gradient-to-r from-primary to-accent py-3.5 text-sm font-black text-primary-foreground shadow-lg shadow-primary/30 active:scale-95 disabled:opacity-50"
        >
          {busy ? "Signing in…" : `Sign In as ${cap(u)}`}
        </Button>

        {/* Quick Utility Row */}
        <div className="pt-2 border-t border-border/60 flex items-center justify-center text-xs font-bold">
          <button
            type="button"
            onClick={onOpenShare}
            className="text-emerald-400 hover:underline flex items-center gap-1.5"
          >
            <WhatsAppIcon className="h-3.5 w-3.5" />
            <span>Share on WhatsApp</span>
          </button>
        </div>
      </form>
    </div>
  );
}

function Main({
  auth,
  logout,
  openPass,
  openShare,
}: {
  auth: Auth;
  logout: () => void;
  openPass: () => void;
  openShare: () => void;
}) {
  const qc = useQueryClient();
  const q = useQuizzes();
  const { search, change } = useWorkspaceNavigation();
  const tab = search.tab === "arena" ? "arena" : "quiz";
  const setTab = (next: "quiz" | "arena") => change({ tab: next, profile: undefined, panel: undefined });
  const [menu, setMenu] = useState(false);
  const [playingQuiz, setPlayingQuiz] = useState<Quiz | null>(null);

  const doPing = useServerFn(ping);
  useEffect(() => {
    const go = () => {
      if (document.visibilityState === "visible") {
        doPing({ data: { username: auth.username, password: auth.password } }).then((r) => {
          if (r && r.ok === false) logout();
        }).catch(() => {});
      }
    };
    go();
    const t = setInterval(go, 60000);
    return () => clearInterval(t);
  }, [auth.username, auth.password]);

  const quizzes = (q.data?.quizzes ?? []) as Quiz[];
  const attempts = (q.data?.attempts ?? []) as Attempt[];

  const [currentSubject, setCurrentSubject] = useState<MasterSubject>(() => {
    return (search.sub as MasterSubject) || "gk";
  });

  const handleSelectSubject = (s: MasterSubject) => {
    setCurrentSubject(s);
    change({ sub: s });
  };

  // Auto-launch quiz if URL contains ?quiz= or ?quizId=
  useEffect(() => {
    if (search.quizId && quizzes.length > 0 && !playingQuiz) {
      const found = quizzes.find((x) => x.id === search.quizId);
      if (found) {
        const foundSub = getQuizMasterSubject(found);
        setCurrentSubject(foundSub);
        setPlayingQuiz(found);
      }
    }
  }, [search.quizId, quizzes]);

  const handleExitQuiz = () => {
    setPlayingQuiz(null);
    change({ quizId: undefined }, true);
    qc.invalidateQueries({ queryKey: ["quizzes"] });
  };

  return (
    <div className="arena-shell min-h-screen pb-28 selection:bg-primary/30">
      {/* Fullscreen Quiz Player Overlay */}
      {playingQuiz && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-background/95 p-3 sm:p-6 backdrop-blur-2xl">
          <div className="max-w-2xl mx-auto space-y-4 pt-2">
            <div className="flex items-center justify-between pb-2 border-b border-border/80">
              <Button
                variant="unstyled"
                onClick={handleExitQuiz}
                className="inline-flex items-center gap-1.5 text-xs font-black text-muted-foreground hover:text-foreground active:scale-95 py-1 px-2.5 rounded-xl bg-secondary/80 border border-border/80"
              >
                ← Exit Quiz
              </Button>
              <span className="text-xs font-bold text-foreground truncate max-w-[200px] sm:max-w-md">
                {playingQuiz.title}
              </span>
            </div>

            <QuizPlayer
              quiz={playingQuiz}
              onDone={handleExitQuiz}
            />
          </div>
        </div>
      )}

      {/* Modern Top Header */}
      <header className="app-header sticky top-0 z-20 flex items-center justify-between gap-3 px-4 py-3 bg-card/90 backdrop-blur-xl border-b border-border/80 shadow-xs">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="relative">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-tr from-primary to-accent font-display text-sm font-black text-white shadow-md shadow-primary/25 ring-2 ring-primary/20">
              {auth.username[0].toUpperCase()}
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-card" />
          </div>
          <div className="min-w-0">
            <p className="font-display text-sm font-black text-foreground leading-tight truncate">{cap(auth.username)}</p>
            <p className="text-[10px] font-bold text-primary flex items-center gap-1">
              <Sparkles size={10} /> SSC Quiz Arena Player
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* WhatsApp Share Button */}
          <Button
            variant="unstyled"
            onClick={openShare}
            title="Share with friends on WhatsApp"
            className="flex items-center gap-1.5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1.5 text-xs font-extrabold text-emerald-400 hover:bg-emerald-500/20 active:scale-95 transition"
          >
            <WhatsAppIcon className="h-4 w-4" />
            <span className="hidden sm:inline">WhatsApp</span>
          </Button>

          <Button
            variant="unstyled"
            onClick={() => setMenu(true)}
            aria-label="Account Menu"
            className="flex h-9 w-9 items-center justify-center rounded-2xl border border-border/80 bg-secondary/80 text-foreground active:scale-95"
          >
            <Menu size={17} />
          </Button>
        </div>
      </header>

      {/* Account Menu Drawer */}
      <MotionPresence open={menu}>
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-background/70 backdrop-blur-md sm:items-center p-0 sm:p-4" onClick={() => setMenu(false)}>
          <div className="w-full max-w-sm space-y-3 rounded-t-[32px] sm:rounded-3xl border border-border/80 bg-card p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-1">
              <h3 className="font-display text-base font-extrabold text-foreground">Menu & Quick Links</h3>
              <Button variant="unstyled" onClick={() => setMenu(false)} className="p-1 rounded-full text-muted-foreground hover:bg-secondary">
                <X size={18} />
              </Button>
            </div>

            <Button
              variant="unstyled"
              onClick={() => {
                setMenu(false);
                openShare();
              }}
              className="flex w-full items-center gap-3 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/15 p-3.5 text-left active:scale-98 transition border border-emerald-500/25"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500 text-white shrink-0">
                <WhatsAppIcon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-extrabold text-emerald-400">Share on WhatsApp</p>
                <p className="text-[10px] text-muted-foreground font-medium">Send invite link with clean URL</p>
              </div>
              <ChevronRight size={15} className="text-emerald-400" />
            </Button>

            <Button
              variant="unstyled"
              onClick={() => {
                setMenu(false);
                openPass();
              }}
              className="flex w-full items-center gap-3 rounded-2xl bg-secondary/60 hover:bg-secondary p-3.5 text-left active:scale-98 transition border border-border/60"
            >
              <KeyRound size={18} className="text-primary shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-foreground">Change Password</p>
                <p className="text-[10px] text-muted-foreground font-medium">Update account password</p>
              </div>
              <ChevronRight size={15} className="text-muted-foreground" />
            </Button>

            <Button
              variant="unstyled"
              onClick={() => {
                setMenu(false);
                logout();
              }}
              className="flex w-full items-center gap-3 rounded-2xl bg-destructive/10 hover:bg-destructive/15 p-3.5 text-left active:scale-98 transition border border-destructive/20 text-destructive"
            >
              <LogOut size={18} className="shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold">Sign Out</p>
                <p className="text-[10px] opacity-80 font-medium">Log out from this device</p>
              </div>
            </Button>
          </div>
        </div>
      </MotionPresence>

      {/* Main Container */}
      <main className="workspace-view px-3 sm:px-4 pt-3 max-w-4xl mx-auto space-y-4">
        {tab === "quiz" ? (
          <SubjectArenaSection
            auth={auth}
            quizzes={quizzes}
            attempts={attempts}
            currentSubject={currentSubject}
            onSelectSubject={handleSelectSubject}
            onPlayQuiz={(z) => setPlayingQuiz(z)}
            onOpenShare={openShare}
            onRefresh={() => qc.invalidateQueries({ queryKey: ["quizzes"] })}
          />
        ) : (
          <LeaderboardSection
            auth={auth}
            quizzes={quizzes}
            attempts={attempts}
            onOpenShare={openShare}
            onPlayQuiz={(z) => setPlayingQuiz(z)}
            defaultSubject={currentSubject}
          />
        )}
      </main>

      {/* 2-Item Clean Bottom Navigation Dock */}
      <nav className="arena-navigation fixed bottom-0 left-0 right-0 z-30 bg-card/90 backdrop-blur-xl border-t border-border/80 p-2.5">
        <div className="max-w-md mx-auto grid grid-cols-2 gap-2.5">
          <Button
            variant="unstyled"
            onClick={() => {
              setTab("quiz");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className={cn(
              "flex items-center justify-center gap-2 py-3 px-4 rounded-2xl text-xs font-black transition-all active:scale-95",
              tab === "quiz"
                ? "bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-lg shadow-primary/30"
                : "bg-secondary/70 text-muted-foreground hover:text-foreground"
            )}
          >
            <Compass size={17} strokeWidth={2.5} />
            <span>Practice Arena</span>
          </Button>

          <Button
            variant="unstyled"
            onClick={() => {
              setTab("arena");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className={cn(
              "flex items-center justify-center gap-2 py-3 px-4 rounded-2xl text-xs font-black transition-all active:scale-95",
              tab === "arena"
                ? "bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-lg shadow-primary/30"
                : "bg-secondary/70 text-muted-foreground hover:text-foreground"
            )}
          >
            <Trophy size={17} strokeWidth={2.5} />
            <span>Leaderboard</span>
          </Button>
        </div>
      </nav>
    </div>
  );
}

function ArenaQuizUpload({
  auth,
  currentSubject,
  onCreated,
  onClose,
}: {
  auth: Auth;
  currentSubject: MasterSubject;
  onCreated: (targetSubject: MasterSubject) => void;
  onClose: () => void;
}) {
  const create = useServerFn(createQuiz);
  const [subject, setSubject] = useState<MasterSubject>(currentSubject);
  const [title, setTitle] = useState("");
  const [chapter, setChapter] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [parsedCount, setParsedCount] = useState<number | null>(null);
  const [status, setStatus] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const suggestions = useMemo(() => {
    if (subject === "maths") {
      return [
        "Arithmetic · Percentage",
        "Arithmetic · Profit & Loss",
        "Time, Work & Pipes",
        "Speed, Distance & Trains",
        "Advance Maths · Algebra",
        "Advance Maths · Trigonometry",
        "Geometry & Mensuration",
        "Number System · HCF & LCM",
        "Data Interpretation (DI)",
      ];
    }
    if (subject === "reasoning") {
      return [
        "Blood Relations & Symbols",
        "Coding-Decoding",
        "Syllogism & Venn Diagrams",
        "Number & Alphabet Series",
        "Direction & Distance",
        "Seating Arrangement",
        "Mirror & Water Images",
        "Dice & Cubes",
      ];
    }
    return [
      "Polity · Indian Constitution",
      "History · Modern India",
      "Geography · Rivers & Mountains",
      "Economics · Budget & Banking",
      "General Science · Biology",
      "General Science · Physics & Chemistry",
      "Static GK · Dances & Festivals",
    ];
  }, [subject]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setErr("");
    if (!title) {
      const cleanTitle = f.name.replace(/\.html?$/i, "").replace(/[_-]+/g, " ").trim();
      setTitle(cleanTitle);
    }
    try {
      const text = await f.text();
      const qs = parseQuizHtml(text);
      if (qs.length > 0) {
        setParsedCount(qs.length);
        setStatus(`✓ ${qs.length} questions detected from ${f.name}`);
      } else {
        setParsedCount(null);
        setStatus(`File loaded (${(f.size / 1024).toFixed(1)} KB)`);
      }
    } catch {
      setStatus(`File selected: ${f.name}`);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return setErr("Please select an HTML or JSON quiz file.");
    if (!title.trim()) return setErr("Please enter a title for this quiz.");
    const finalChapter = chapter.trim() || (subject === "maths" ? "Maths Practice" : subject === "reasoning" ? "Reasoning Practice" : "GK/GS Practice");

    setBusy(true);
    setErr("");
    setStatus("Reading and parsing quiz file...");
    try {
      const html = await file.text();
      let qs: QQ[] = [];
      try {
        qs = parseQuizHtml(html);
      } catch (err) {
        console.warn("Parse warning:", err);
      }

      setStatus("Uploading quiz to Arena...");
      const res = await create({
        data: {
          username: auth.username,
          password: auth.password,
          title: title.trim(),
          chapter: `${subject === "maths" ? "Maths: " : subject === "reasoning" ? "Reasoning: " : ""}${finalChapter}`,
          day: null,
          html: qs.length > 0 ? undefined : html,
          questions: qs.length > 0 ? qs : undefined,
        },
      });

      if (!res || typeof res.count !== "number") {
        throw new Error("Server did not return a valid count.");
      }

      setStatus(`✓ Successfully uploaded ${res.count} questions!`);
      setTimeout(() => {
        onCreated(subject);
        onClose();
      }, 800);
    } catch (x: any) {
      setErr(x?.message || "Failed to upload quiz. Please verify file format.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-3xl border border-primary/40 bg-card p-5 shadow-2xl space-y-4">
      <div className="flex items-center justify-between pb-1 border-b border-border/70">
        <div>
          <h3 className="font-display text-sm font-black text-foreground flex items-center gap-2">
            <span>➕ Upload Quiz to Arena (Admin Arun)</span>
          </h3>
          <p className="text-[11px] text-muted-foreground font-semibold">Upload chapter-wise quizzes for Maths, Reasoning, or GK/GS</p>
        </div>
        <Button variant="unstyled" onClick={onClose} className="p-1 rounded-full text-muted-foreground hover:bg-secondary">
          <X size={17} />
        </Button>
      </div>

      <form onSubmit={handleUpload} className="space-y-3.5">
        <div>
          <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block mb-1.5">
            1. Select Master Subject:
          </label>
          <div className="grid grid-cols-3 gap-2">
            {MASTER_SUBJECTS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  setSubject(s.id);
                  setChapter("");
                }}
                className={cn(
                  "flex items-center justify-center gap-1.5 p-2.5 rounded-2xl border text-xs font-black transition active:scale-95",
                  subject === s.id
                    ? s.borderActive + " text-foreground"
                    : "bg-secondary/60 border-border/70 text-muted-foreground hover:text-foreground"
                )}
              >
                <span>{s.icon}</span>
                <span>{s.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block mb-1">
            2. Quiz Title:
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Blood Relations & Symbol-Based Reasoning"
            className="w-full rounded-2xl border border-input bg-background px-3.5 py-2.5 text-xs font-bold outline-none focus:border-primary text-foreground shadow-xs"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block">
            3. Chapter / Topic Name:
          </label>
          <input
            value={chapter}
            onChange={(e) => setChapter(e.target.value)}
            placeholder="e.g. Blood Relations, Percentage, Modern History..."
            className="w-full rounded-2xl border border-input bg-background px-3.5 py-2.5 text-xs font-bold outline-none focus:border-primary text-foreground shadow-xs"
          />
          <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
            <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">Quick pick:</span>
            {suggestions.map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => setChapter(chip)}
                className={cn(
                  "rounded-xl border px-2 py-0.5 text-[10px] font-bold transition active:scale-95",
                  chapter === chip
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-secondary/70 border-border/70 text-muted-foreground hover:text-foreground hover:bg-secondary"
                )}
              >
                {chip}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block mb-1">
            4. Select HTML or JSON Quiz File:
          </label>
          <input
            type="file"
            accept=".html,.htm,.json"
            onChange={handleFileChange}
            className="w-full text-xs text-muted-foreground file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-primary file:text-primary-foreground hover:file:opacity-90 cursor-pointer rounded-2xl border border-dashed border-border/90 p-2 bg-secondary/30"
          />
          {status && (
            <p className="text-[11px] font-bold text-emerald-400 mt-1 flex items-center gap-1">
              <span>{status}</span>
            </p>
          )}
        </div>

        {err && (
          <p className="rounded-xl bg-destructive/10 border border-destructive/20 p-2.5 text-xs font-bold text-destructive">
            {err}
          </p>
        )}

        <div className="flex items-center gap-2 pt-1">
          <Button
            type="button"
            variant="unstyled"
            onClick={onClose}
            className="flex-1 rounded-2xl border border-border bg-secondary/60 py-3 text-xs font-bold text-muted-foreground hover:text-foreground active:scale-95"
          >
            Cancel
          </Button>

          <Button
            type="submit"
            disabled={busy || !file}
            variant="unstyled"
            className="flex-1 rounded-2xl bg-gradient-to-r from-primary to-accent py-3 text-xs font-black text-primary-foreground shadow-md shadow-primary/30 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            {busy ? (
              <span>Uploading…</span>
            ) : (
              <>
                <FileUp size={15} />
                <span>Upload Quiz ({parsedCount ? `${parsedCount} Qs` : "File"})</span>
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

function SubjectArenaSection({
  auth,
  quizzes,
  attempts,
  currentSubject,
  onSelectSubject,
  onPlayQuiz,
  onOpenShare,
  onRefresh,
}: {
  auth: Auth;
  quizzes: Quiz[];
  attempts: Attempt[];
  currentSubject: MasterSubject;
  onSelectSubject: (s: MasterSubject) => void;
  onPlayQuiz: (z: Quiz) => void;
  onOpenShare: () => void;
  onRefresh: () => void;
}) {
  const [search, setSearch] = useState("");
  const [selectedBoxId, setSelectedBoxId] = useState("all");
  const [showUpload, setShowUpload] = useState(false);
  const doDeleteQuiz = useServerFn(deleteQuiz);

  const activeMaster = useMemo(() => {
    return MASTER_SUBJECTS.find((m) => m.id === currentSubject) || MASTER_SUBJECTS[0];
  }, [currentSubject]);

  const activeBoxes = useMemo(() => {
    if (currentSubject === "maths") return MATHS_SUBJECT_BOXES;
    if (currentSubject === "reasoning") return REASONING_SUBJECT_BOXES;
    return GK_SUBJECT_BOXES;
  }, [currentSubject]);

  // Reset selected box when master subject switches
  useEffect(() => {
    setSelectedBoxId("all");
  }, [currentSubject]);

  const activeBox = useMemo(() => {
    return activeBoxes.find((b) => b.id === selectedBoxId) || activeBoxes[0];
  }, [activeBoxes, selectedBoxId]);

  // Filter quizzes belonging to current master subject
  const currentSubjectQuizzes = useMemo(() => {
    return quizzes.filter((z) => !z.expired && !z.chapter?.startsWith("test:") && getQuizMasterSubject(z) === currentSubject);
  }, [quizzes, currentSubject]);

  // Box stats
  const boxStats = useMemo(() => {
    return activeBoxes.map((box) => {
      const matching = box.id === "all" ? currentSubjectQuizzes : currentSubjectQuizzes.filter(box.matcher);
      const totalQuestions = matching.reduce((sum, z) => sum + (z.questions?.length || 0), 0);
      const completedCount = matching.filter((z) =>
        attempts.some((a) => a.username === auth.username && a.quiz_id === z.id)
      ).length;
      return {
        ...box,
        count: matching.length,
        totalQuestions,
        completedCount,
      };
    });
  }, [activeBoxes, currentSubjectQuizzes, attempts, auth.username]);

  // Overall player marks & completed count in this master subject
  const myTotalCompleted = useMemo(() => {
    const completedIds = new Set(
      attempts.filter((a) => a.username === auth.username).map((a) => a.quiz_id)
    );
    return currentSubjectQuizzes.filter((z) => completedIds.has(z.id)).length;
  }, [currentSubjectQuizzes, attempts, auth.username]);

  const myTotalScore = useMemo(() => {
    let tot = 0;
    for (const z of currentSubjectQuizzes) {
      const myAtts = attempts.filter((a) => a.username === auth.username && a.quiz_id === z.id);
      if (myAtts.length > 0) {
        tot += Math.max(...myAtts.map((a) => a.score));
      }
    }
    return tot;
  }, [currentSubjectQuizzes, attempts, auth.username]);

  // Filter quizzes by active box and search
  const filtered = useMemo(() => {
    return currentSubjectQuizzes.filter((z) => {
      const title = (z.title || "").toLowerCase();
      const chap = (z.chapter || "").toLowerCase();
      const q = search.toLowerCase().trim();
      const matchesSearch = !q || title.includes(q) || chap.includes(q);
      if (!matchesSearch) return false;
      if (selectedBoxId === "all") return true;
      return activeBox.matcher(z);
    });
  }, [currentSubjectQuizzes, search, selectedBoxId, activeBox]);

  // Group by chapter: earliest added quiz at TOP, newest at BOTTOM
  const chapterGroups = useMemo(() => {
    const map = new Map<string, Quiz[]>();
    for (const z of filtered) {
      let rawCh = (z.chapter || "General Practice").trim();
      rawCh = rawCh.replace(/^(?:maths|reasoning|gk\/gs|gk)\s*:\s*/i, "").trim() || "General Practice";
      if (!map.has(rawCh)) map.set(rawCh, []);
      map.get(rawCh)!.push(z);
    }

    const groups: { chapter: string; quizzes: Quiz[]; totalQuestions: number }[] = [];
    for (const [chapter, groupQuizzes] of map.entries()) {
      groupQuizzes.sort((a, b) => {
        const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return timeA - timeB; // Earliest at TOP
      });
      const totalQuestions = groupQuizzes.reduce((s, z) => s + (z.questions?.length || 0), 0);
      groups.push({ chapter, quizzes: groupQuizzes, totalQuestions });
    }

    groups.sort((a, b) => {
      const orderA = getSyllabusChapterOrder(currentSubject, a.chapter);
      const orderB = getSyllabusChapterOrder(currentSubject, b.chapter);
      if (orderA !== orderB) return orderA - orderB;
      return a.chapter.localeCompare(b.chapter, undefined, { numeric: true, sensitivity: "base" });
    });
    return groups;
  }, [filtered, currentSubject]);

  const [copiedQuizId, setCopiedQuizId] = useState<string | null>(null);

  const handleShareParticularQuiz = (z: Quiz) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "https://ssc-arena.pages.dev";
    const sub = getQuizMasterSubject(z);
    const link = `${origin}/?sub=${sub}&quizId=${z.id}`;
    const subLabel = sub === "maths" ? "Maths" : sub === "reasoning" ? "Reasoning" : "GK/GS";
    const text = `🎯 *SSC ${subLabel} Quiz Challenge!*\n\n📝 *Quiz:* ${z.title}\n📚 *Chapter:* ${z.chapter || subLabel}\n❓ *Questions:* ${z.questions.length} Qs (${z.questions.length * 2} Marks)\n\n⚔️ *Players:* Arun, Ali, Naveen, Devansh\n\n👉 *Direct Quiz Link (Click to attempt):* \n${link}`;
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;

    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        navigator.clipboard.writeText(link);
        setCopiedQuizId(z.id);
        setTimeout(() => setCopiedQuizId(null), 2500);
      }
    } catch {}

    if (typeof navigator !== "undefined" && navigator.share) {
      navigator.share({ title: z.title, text, url: link }).catch(() => {
        window.open(waUrl, "_blank");
      });
    } else {
      window.open(waUrl, "_blank");
    }
  };

  return (
    <div className="space-y-4">
      {/* ============================================================ */}
      {/* 3 MASTER SUBJECTS CARDS (GK/GS, Maths, Reasoning)            */}
      {/* ============================================================ */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between px-1">
          <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block">
            Select Subject Arena
          </label>
          <span className="text-[10px] font-bold text-muted-foreground">3 Core Subjects</span>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {MASTER_SUBJECTS.map((sub) => {
            const isSelected = currentSubject === sub.id;
            const matchingQuizzes = quizzes.filter(
              (z) => !z.expired && !z.chapter?.startsWith("test:") && getQuizMasterSubject(z) === sub.id
            );
            const count = matchingQuizzes.length;
            const totalQs = matchingQuizzes.reduce((acc, qz) => acc + (qz.questions?.length || 0), 0);

            return (
              <button
                key={sub.id}
                type="button"
                onClick={() => {
                  onSelectSubject(sub.id);
                  setSelectedBoxId("all");
                }}
                className={cn(
                  "group relative flex flex-col p-3 sm:p-4 rounded-3xl border text-left transition-all duration-200 active:scale-95 shadow-soft",
                  isSelected
                    ? cn("border-2 shadow-lg", sub.borderActive)
                    : "bg-card/90 border-border/80 hover:border-border hover:bg-card"
                )}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-2xl sm:text-3xl">{sub.icon}</span>
                  <span
                    className={cn(
                      "text-[10px] sm:text-xs font-black px-2 py-0.5 rounded-full border tabular-nums",
                      isSelected
                        ? "bg-white/15 text-white border-white/20"
                        : "bg-secondary text-muted-foreground border-border/80"
                    )}
                  >
                    {count} {count === 1 ? "Quiz" : "Quizzes"}
                  </span>
                </div>

                <div className="mt-2.5 min-w-0">
                  <h3 className={cn("font-display font-black text-sm sm:text-base tracking-tight truncate", isSelected ? "text-foreground font-extrabold" : "text-foreground/90")}>
                    {sub.name}
                  </h3>
                  <p className="text-[10px] sm:text-[11px] font-bold text-muted-foreground truncate">{sub.hindi}</p>
                </div>

                <div className="mt-2.5 pt-2 border-t border-border/40 flex items-center justify-between text-[10px] font-bold text-muted-foreground w-full">
                  <span>{totalQs} Qs</span>
                  {isSelected ? (
                    <span className="text-emerald-400 font-black flex items-center gap-1">
                      Active ●
                    </span>
                  ) : (
                    <span>Tap to view</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Hero Stats Card for Current Subject */}
      <div className="rounded-3xl border border-border/80 bg-gradient-to-br from-card via-card to-secondary/50 p-5 shadow-soft">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/20 px-2.5 py-0.5 text-[10px] font-black text-primary uppercase tracking-wider">
              <Sparkles size={11} /> SSC {activeMaster.name} Arena
            </div>
            <h2 className="mt-1 text-xl sm:text-2xl font-black font-display text-foreground tracking-tight">
              {activeMaster.icon} {activeMaster.name} Quizzes
            </h2>
            <p className="text-xs text-muted-foreground font-semibold mt-0.5">{activeMaster.desc}</p>
          </div>

          <div className="flex items-center gap-2">
            {auth.username === "arun" && (
              <Button
                variant="unstyled"
                onClick={() => setShowUpload(!showUpload)}
                className="shrink-0 rounded-2xl bg-gradient-to-r from-primary to-accent px-3 py-2 text-xs font-black text-primary-foreground shadow-md shadow-primary/25 active:scale-95 flex items-center gap-1"
              >
                <Plus size={14} />
                <span>{showUpload ? "Close" : "Upload Quiz"}</span>
              </Button>
            )}
          </div>
        </div>

        {/* 3 Quick Performance Meters */}
        <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-border/60 text-center">
          <div className="rounded-2xl bg-secondary/60 p-2.5 border border-border/40">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Uploaded</span>
            <span className="font-display text-lg font-black text-foreground tabular-nums">{currentSubjectQuizzes.length}</span>
          </div>
          <div className="rounded-2xl bg-secondary/60 p-2.5 border border-border/40">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Completed</span>
            <span className="font-display text-lg font-black text-emerald-400 tabular-nums">{myTotalCompleted}</span>
          </div>
          <div className="rounded-2xl bg-secondary/60 p-2.5 border border-border/40">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Your Marks</span>
            <span className="font-display text-lg font-black text-primary tabular-nums">{myTotalScore} pts</span>
          </div>
        </div>
      </div>

      {/* WhatsApp Invite Banner */}
      <div className="rounded-3xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 via-card to-card p-3.5 flex items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
            <WhatsAppIcon className="h-4.5 w-4.5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-extrabold text-foreground truncate">Play with Friends on WhatsApp</p>
            <p className="text-[10px] text-muted-foreground font-semibold truncate">Invite Ali, Naveen & Devansh to solve quizzes</p>
          </div>
        </div>
        <Button
          variant="unstyled"
          onClick={onOpenShare}
          className="shrink-0 rounded-xl bg-emerald-500 hover:bg-emerald-600 px-3 py-1.5 text-[11px] font-black text-white shadow-md shadow-emerald-500/20 active:scale-95 flex items-center gap-1.5"
        >
          <WhatsAppIcon className="h-3.5 w-3.5" />
          <span>Share Link</span>
        </Button>
      </div>

      {/* Admin Upload Drawer */}
      {showUpload && auth.username === "arun" && (
        <ArenaQuizUpload
          auth={auth}
          currentSubject={currentSubject}
          onCreated={(targetSub) => {
            setShowUpload(false);
            if (targetSub !== currentSubject) onSelectSubject(targetSub);
            onRefresh();
          }}
          onClose={() => setShowUpload(false)}
        />
      )}

      {/* ============================================================ */}
      {/* SUBJECT BOXES GRID (7 Categories for active master subject)    */}
      {/* ============================================================ */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <h3 className="font-display font-extrabold text-sm text-foreground flex items-center gap-2">
            <span>{activeMaster.name} Topic Boxes</span>
            <span className="text-[10px] font-bold text-muted-foreground">Tap to filter</span>
          </h3>
          {selectedBoxId !== "all" && (
            <button
              onClick={() => setSelectedBoxId("all")}
              className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
            >
              Reset to All ({currentSubjectQuizzes.length})
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
          {boxStats.map((box) => {
            const isSelected = selectedBoxId === box.id;
            return (
              <button
                key={box.id}
                type="button"
                onClick={() => setSelectedBoxId(box.id)}
                className={cn(
                  "group relative flex flex-col text-left p-3.5 rounded-3xl border transition-all duration-200 active:scale-[0.98]",
                  isSelected
                    ? box.activeBg
                    : "bg-card/90 border-border/80 hover:border-border hover:bg-card"
                )}
              >
                {/* Top Row: Icon & Count Badge */}
                <div className="flex items-center justify-between w-full">
                  <span className="text-2xl">{box.icon}</span>
                  <span
                    className={cn(
                      "text-[10px] font-black px-2 py-0.5 rounded-full border tabular-nums",
                      isSelected
                        ? "bg-white/10 text-white border-white/20"
                        : "bg-secondary text-muted-foreground border-border/80"
                    )}
                  >
                    {box.count} {box.count === 1 ? "Quiz" : "Quizzes"}
                  </span>
                </div>

                {/* Subject Names */}
                <div className="mt-2.5 min-w-0">
                  <p className={cn("font-display font-black text-sm tracking-tight truncate", isSelected ? "text-foreground font-extrabold" : "text-foreground/90")}>
                    {box.name}
                  </p>
                  <p className="text-[10px] font-bold text-muted-foreground truncate">{box.hindi}</p>
                </div>

                {/* Bottom Progress Indicator */}
                <div className="mt-3 pt-2 border-t border-border/50 flex items-center justify-between text-[10px] font-bold text-muted-foreground w-full">
                  <span>{box.totalQuestions} Qs</span>
                  {box.completedCount > 0 ? (
                    <span className="text-emerald-400 font-extrabold flex items-center gap-0.5">
                      <CheckCircle2 size={10} /> {box.completedCount} done
                    </span>
                  ) : (
                    <span>0 done</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ============================================================ */}
      {/* SEARCH BAR & ACTIVE FILTER CHIP                             */}
      {/* ============================================================ */}
      <div className="space-y-2 pt-1">
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Search in ${activeMaster.name} · ${activeBox.name} (${filtered.length} quizzes)...`}
            className="w-full rounded-2xl border border-input bg-card pl-10 pr-9 py-2.5 text-xs font-semibold outline-none focus:border-primary shadow-xs transition"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X size={14} />
            </button>
          )}
        </div>

        {selectedBoxId !== "all" && (
          <div className="flex items-center justify-between rounded-2xl bg-secondary/70 border border-border/80 px-3 py-2 text-xs">
            <span className="font-bold text-foreground flex items-center gap-1.5">
              <span>{activeBox.icon}</span>
              <span>Showing: <strong>{activeBox.name}</strong> ({filtered.length} available)</span>
            </span>
            <button
              onClick={() => setSelectedBoxId("all")}
              className="text-[11px] font-black text-primary hover:underline"
            >
              Clear Filter
            </button>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* CHAPTER-WISE GROUPED QUIZZES LIST (Oldest Top, Newest Bottom) */}
      {/* ============================================================ */}
      <div className="space-y-6">
        {chapterGroups.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border/90 p-8 text-center space-y-2 bg-card/50">
            <p className="text-sm font-bold text-foreground">No quizzes found for {activeMaster.name}.</p>
            <p className="text-xs text-muted-foreground">Select another topic box above or upload a new quiz.</p>
            {auth.username === "arun" && (
              <Button
                variant="unstyled"
                onClick={() => setShowUpload(true)}
                className="mt-2 rounded-xl bg-primary px-3.5 py-1.5 text-xs font-black text-primary-foreground shadow-sm active:scale-95"
              >
                + Upload Quiz Now
              </Button>
            )}
          </div>
        ) : (
          chapterGroups.map((group) => (
            <div key={group.chapter} className="space-y-3">
              {/* Chapter Header Banner */}
              <div className="flex items-center justify-between px-2 py-1 border-b border-border/60">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-base">{activeMaster.icon}</span>
                  <h4 className="font-display font-extrabold text-sm text-foreground truncate">
                    {group.chapter}
                  </h4>
                </div>
                <span className="rounded-full bg-secondary border border-border px-2.5 py-0.5 text-[10px] font-black text-muted-foreground shrink-0">
                  {group.quizzes.length} {group.quizzes.length === 1 ? "Quiz" : "Quizzes"} · {group.totalQuestions} Qs
                </span>
              </div>

              {/* Quizzes inside this Chapter (sorted: earliest at TOP, latest at BOTTOM) */}
              <div className="space-y-3">
                {group.quizzes.map((z, idx) => {
                  const myAttempts = attempts.filter((a) => a.username === auth.username && a.quiz_id === z.id);
                  const bestAttempt = myAttempts.reduce(
                    (best, cur) => (cur.score > (best?.score ?? -1) ? cur : best),
                    null as Attempt | null
                  );
                  const timesAttempted = myAttempts.length;
                  const percentage = bestAttempt ? Math.round((bestAttempt.score / (bestAttempt.total || 1)) * 100) : 0;

                  // Other players who attempted this quiz
                  const otherPlayerAttempts = PLAYERS.map((u) => {
                    const uAtts = attempts.filter((a) => a.username === u && a.quiz_id === z.id);
                    const best = uAtts.reduce(
                      (b, c) => (c.score > (b?.score ?? -1) ? c : b),
                      null as Attempt | null
                    );
                    return { username: u, best, count: uAtts.length };
                  }).filter((p) => p.count > 0);

                  // Find matching subject box for card badge
                  const quizBox = activeBoxes.slice(1).find((sb) => sb.matcher(z)) || activeBoxes[0];

                  return (
                    <div
                      key={z.id}
                      className="rounded-3xl border border-border/80 bg-card p-4 sm:p-5 shadow-soft space-y-3.5 hover:border-border transition-all"
                    >
                      {/* Row 1: Badges, Title & Delete (Admin) */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="rounded-full bg-secondary/80 border border-border px-2 py-0.5 text-[10px] font-black text-muted-foreground">
                              #{idx + 1}
                            </span>
                            <span className="rounded-full bg-secondary border border-border px-2 py-0.5 text-[10px] font-black text-foreground inline-flex items-center gap-1">
                              <span>{quizBox.icon}</span>
                              <span>{quizBox.name}</span>
                            </span>
                            <span className="rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black px-2 py-0.5">
                              {z.questions.length} Questions
                            </span>
                            <span className="rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[10px] font-black px-2 py-0.5">
                              {z.questions.length * 2} Marks
                            </span>
                          </div>

                          <h4 className="font-display font-extrabold text-base text-foreground leading-snug pt-0.5">
                            {z.title}
                          </h4>

                          {z.chapter && (
                            <p className="text-[11px] font-semibold text-muted-foreground">
                              {z.chapter}
                            </p>
                          )}
                        </div>

                        {auth.username === "arun" && (
                          <Button
                            variant="unstyled"
                            onClick={async () => {
                              if (confirm(`Delete quiz "${z.title}"? This cannot be undone.`)) {
                                await doDeleteQuiz({ data: { username: auth.username, password: auth.password, quizId: z.id } });
                                onRefresh();
                              }
                            }}
                            title="Delete quiz (Admin)"
                            className="p-1.5 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition"
                          >
                            <Trash2 size={15} />
                          </Button>
                        )}
                      </div>

                      {/* Row 2: Your Performance on this Quiz */}
                      <div className="rounded-2xl border border-border/70 bg-secondary/40 p-3 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-muted-foreground flex items-center gap-1">
                            <span>Your Best Score:</span>
                            {bestAttempt ? (
                              <span className="font-black text-emerald-400 tabular-nums">
                                {bestAttempt.score} / {bestAttempt.total} ({percentage}%)
                              </span>
                            ) : (
                              <span className="text-muted-foreground font-semibold">Not attempted yet</span>
                            )}
                          </span>

                          <span className="text-[11px] font-bold text-muted-foreground flex items-center gap-1">
                            <span>Kitni baar diya:</span>
                            <span className="font-black text-foreground tabular-nums">
                              {timesAttempted} {timesAttempted === 1 ? "time" : "times"}
                            </span>
                          </span>
                        </div>

                        {/* Visual Progress Bar */}
                        {bestAttempt && (
                          <div className="w-full bg-secondary rounded-full h-2 overflow-hidden border border-border/50">
                            <div
                              className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                              style={{ width: `${Math.min(100, Math.max(5, percentage))}%` }}
                            />
                          </div>
                        )}
                      </div>

                      {/* Row 3: Other Players Activity Strip */}
                      {otherPlayerAttempts.length > 0 && (
                        <div className="flex items-center gap-1.5 flex-wrap text-[11px] pt-0.5">
                          <span className="text-muted-foreground font-bold">Other players:</span>
                          {otherPlayerAttempts.map((p) => (
                            <span
                              key={p.username}
                              className={cn(
                                "inline-flex items-center gap-1.5 rounded-xl border px-2 py-0.5 font-bold text-[10px]",
                                p.username === auth.username
                                  ? "border-primary/40 bg-primary/10 text-primary"
                                  : "border-border/70 bg-secondary/60 text-foreground"
                              )}
                            >
                              <span className="h-4 w-4 rounded-md bg-secondary text-[9px] font-black flex items-center justify-center shrink-0">
                                {p.username[0].toUpperCase()}
                              </span>
                              <span className="font-extrabold">{cap(p.username)}:</span>
                              <span className="tabular-nums font-black">{p.best?.score ?? 0}/{z.questions.length}</span>
                              <span className="text-muted-foreground font-medium">({p.count}x)</span>
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Row 4: Action Button + Particular Quiz WhatsApp Share */}
                      <div className="pt-1 flex items-center gap-2">
                        <Button
                          variant="unstyled"
                          onClick={() => onPlayQuiz(z)}
                          className="flex-1 rounded-2xl bg-gradient-to-r from-primary to-accent py-3 text-xs font-black text-primary-foreground shadow-md shadow-primary/25 active:scale-98 flex items-center justify-center gap-2 transition"
                        >
                          {timesAttempted > 0 ? (
                            <>
                              <RotateCcw size={14} />
                              <span>Re-attempt Quiz</span>
                            </>
                          ) : (
                            <>
                              <Play size={14} fill="currentColor" />
                              <span>Start Quiz</span>
                            </>
                          )}
                        </Button>

                        <Button
                          variant="unstyled"
                          onClick={() => handleShareParticularQuiz(z)}
                          title="Send this quiz challenge on WhatsApp"
                          className="shrink-0 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 px-3.5 py-3 text-xs font-black text-emerald-400 active:scale-95 flex items-center gap-1.5 transition"
                        >
                          <WhatsAppIcon className="h-4 w-4" />
                          <span>{copiedQuizId === z.id ? "Copied Link!" : "Share Quiz"}</span>
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function LeaderboardSection({
  auth,
  quizzes,
  attempts,
  onOpenShare,
  onPlayQuiz,
  defaultSubject,
}: {
  auth: Auth;
  quizzes: Quiz[];
  attempts: Attempt[];
  onOpenShare: () => void;
  onPlayQuiz: (z: Quiz) => void;
  defaultSubject?: MasterSubject;
}) {
  const [subjFilter, setSubjFilter] = useState<"all" | MasterSubject>(defaultSubject || "all");

  const relevantQuizzes = useMemo(() => {
    const list = quizzes.filter((z) => !z.expired && !z.chapter?.startsWith("test:"));
    if (subjFilter === "all") return list;
    return list.filter((z) => getQuizMasterSubject(z) === subjFilter);
  }, [quizzes, subjFilter]);

  const [selectedQuizId, setSelectedQuizId] = useState<string>(() => relevantQuizzes[0]?.id ?? "");

  useEffect(() => {
    if (!relevantQuizzes.some((z) => z.id === selectedQuizId)) {
      setSelectedQuizId(relevantQuizzes[0]?.id ?? "");
    }
  }, [relevantQuizzes, selectedQuizId]);

  const [rival, setRival] = useState<string>(() => {
    const others = PLAYERS.filter((u) => u !== auth.username);
    return others[0] || PLAYERS[0];
  });

  // Calculate Standings for the 4 fixed players
  const standings = useMemo(() => {
    const list = PLAYERS.map((u) => {
      const uAttempts = attempts.filter((a) => a.username === u);
      const relevantAttempts = uAttempts.filter((a) => relevantQuizzes.some((z) => z.id === a.quiz_id));
      const totalAttempts = relevantAttempts.length;
      const uniqueQuizzes = new Set(relevantAttempts.map((a) => a.quiz_id)).size;

      let totalScore = 0;
      let totalPossible = 0;
      for (const z of relevantQuizzes) {
        const atts = uAttempts.filter((a) => a.quiz_id === z.id);
        if (atts.length > 0) {
          const best = Math.max(...atts.map((a) => a.score));
          totalScore += best;
          totalPossible += (atts[0]?.total || z.questions?.length || 0);
        }
      }
      const accuracy = totalPossible > 0 ? Math.round((totalScore / totalPossible) * 100) : 0;
      const points = totalScore * 10 + totalAttempts * 2;

      return {
        username: u,
        score: points,
        totalMarks: totalScore,
        totalPossible,
        quizzesTaken: uniqueQuizzes,
        totalAttempts,
        accuracy,
      };
    });

    list.sort((a, b) => b.totalMarks - a.totalMarks || b.accuracy - a.accuracy || b.totalAttempts - a.totalAttempts);
    let r = 0;
    return list.map((x) => ({ ...x, rank: x.totalAttempts > 0 ? ++r : null }));
  }, [attempts, relevantQuizzes]);

  const first = standings.find((s) => s.rank === 1);
  const second = standings.find((s) => s.rank === 2);
  const third = standings.find((s) => s.rank === 3);

  // Quiz-specific player breakdown
  const selectedQuiz = useMemo(() => relevantQuizzes.find((z) => z.id === selectedQuizId) || relevantQuizzes[0], [relevantQuizzes, selectedQuizId]);
  const quizPlayerBreakdown = useMemo(() => {
    if (!selectedQuiz) return [];
    const list = PLAYERS.map((u) => {
      const uAtts = attempts.filter((a) => a.username === u && a.quiz_id === selectedQuiz.id);
      const best = uAtts.reduce(
        (b, c) => (c.score > (b?.score ?? -1) ? c : b),
        null as Attempt | null
      );
      const timesAttempted = uAtts.length;
      const latestAt = uAtts.length > 0 ? uAtts[uAtts.length - 1].at : null;
      return {
        username: u,
        bestScore: best ? best.score : null,
        total: selectedQuiz.questions.length,
        timesAttempted,
        latestAt,
      };
    });
    list.sort((a, b) => (b.bestScore ?? -1) - (a.bestScore ?? -1) || b.timesAttempted - a.timesAttempted);
    return list;
  }, [attempts, selectedQuiz]);

  // Head to Head stats
  const playerA = standings.find((s) => s.username === auth.username) ?? standings[0];
  const playerB = standings.find((s) => s.username === rival) ?? (standings.find((s) => s.username !== auth.username) ?? standings[0]);

  return (
    <div className="space-y-4">
      {/* Top Banner with WhatsApp Share */}
      <div className="rounded-3xl border border-border/80 bg-card p-5 shadow-soft flex items-center justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 text-[10px] font-black text-amber-500 uppercase tracking-wider">
            <Trophy size={11} /> Live Arena Leaderboard
          </div>
          <h2 className="mt-1 text-xl sm:text-2xl font-black font-display text-foreground">Scoreboard & Comparison</h2>
          <p className="text-xs text-muted-foreground font-semibold mt-0.5">Player rankings for Arun, Ali, Naveen & Devansh</p>
        </div>

        <Button
          variant="unstyled"
          onClick={onOpenShare}
          className="shrink-0 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 px-3 py-2 text-xs font-black text-emerald-400 hover:bg-emerald-500/20 active:scale-95 flex items-center gap-1.5 transition"
        >
          <WhatsAppIcon className="h-4 w-4" />
          <span>Share</span>
        </Button>
      </div>

      {/* Subject Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {[
          { id: "all", label: "All Subjects", icon: "🌟" },
          { id: "gk", label: "GK / GS", icon: "🏛️" },
          { id: "maths", label: "Maths", icon: "🔢" },
          { id: "reasoning", label: "Reasoning", icon: "🧩" },
        ].map((tab) => {
          const isSelected = subjFilter === tab.id;
          const count = tab.id === "all"
            ? quizzes.filter((z) => !z.expired && !z.chapter?.startsWith("test:")).length
            : quizzes.filter((z) => !z.expired && !z.chapter?.startsWith("test:") && getQuizMasterSubject(z) === tab.id).length;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSubjFilter(tab.id as any)}
              className={cn(
                "rounded-2xl px-3.5 py-2 text-xs font-black transition active:scale-95 flex items-center gap-1.5 shrink-0 border",
                isSelected
                  ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/25"
                  : "bg-secondary/70 border-border/80 text-muted-foreground hover:text-foreground"
              )}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              <span className="text-[10px] opacity-80 font-bold tabular-nums">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Top 3 Podium */}
      {standings.some((s) => s.rank) && (
        <div className="grid grid-cols-3 gap-2 items-end pt-3 pb-1">
          {/* #2 Rank */}
          {second ? (
            <div className="flex flex-col items-center rounded-3xl border border-slate-700 bg-card p-3 shadow-soft text-center">
              <div className="relative">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-800 text-slate-200 font-display text-lg font-black shadow-sm ring-2 ring-slate-500/40">
                  {second.username[0].toUpperCase()}
                </div>
                <span className="absolute -top-1.5 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-slate-500 text-[10px] font-black text-white shadow-xs">
                  2
                </span>
              </div>
              <p className="mt-2 font-display text-xs font-black truncate w-full text-foreground">{cap(second.username)}</p>
              <p className="text-[11px] font-black text-primary mt-0.5 tabular-nums">{second.totalMarks} marks</p>
              <div className="mt-2 w-full h-8 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-center text-[10px] font-black text-slate-300">
                🥈 2nd · {second.totalAttempts}x
              </div>
            </div>
          ) : <div />}

          {/* #1 Rank (Center, Elevated) */}
          {first ? (
            <div className="flex flex-col items-center rounded-3xl border-2 border-amber-500/60 bg-gradient-to-b from-amber-500/15 via-card to-card p-3.5 shadow-elevated text-center -translate-y-2">
              <div className="relative">
                <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 text-lg">👑</span>
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-300 text-white font-display text-xl font-black shadow-md ring-4 ring-amber-500/30">
                  {first.username[0].toUpperCase()}
                </div>
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-black text-white shadow-xs">
                  1
                </span>
              </div>
              <p className="mt-2 font-display text-sm font-black truncate w-full text-foreground">{cap(first.username)}</p>
              <p className="text-xs font-black text-amber-500 mt-0.5 tabular-nums">{first.totalMarks} marks</p>
              <div className="mt-2 w-full h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-xs font-black text-amber-400">
                🏆 1st · {first.totalAttempts}x
              </div>
            </div>
          ) : <div />}

          {/* #3 Rank */}
          {third ? (
            <div className="flex flex-col items-center rounded-3xl border border-amber-800/40 bg-card p-3 shadow-soft text-center">
              <div className="relative">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-950/50 text-amber-400 font-display text-lg font-black shadow-sm ring-2 ring-amber-700/30">
                  {third.username[0].toUpperCase()}
                </div>
                <span className="absolute -top-1.5 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-700 text-[10px] font-black text-white shadow-xs">
                  3
                </span>
              </div>
              <p className="mt-2 font-display text-xs font-black truncate w-full text-foreground">{cap(third.username)}</p>
              <p className="text-[11px] font-black text-primary mt-0.5 tabular-nums">{third.totalMarks} marks</p>
              <div className="mt-2 w-full h-8 rounded-2xl bg-amber-950/40 border border-amber-800/40 flex items-center justify-center text-[10px] font-black text-amber-500">
                🥉 3rd · {third.totalAttempts}x
              </div>
            </div>
          ) : <div />}
        </div>
      )}

      {/* SECTION: Quiz-Specific Scores & Attempt Counts */}
      <div className="rounded-3xl border border-border/80 bg-card p-4.5 shadow-soft space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 size={18} className="text-primary" />
            <h3 className="font-display font-extrabold text-sm text-foreground">
              {subjFilter === "all" ? "Quiz-wise" : `${cap(subjFilter)} Quiz-wise`} Score & Attempt Tracker
            </h3>
          </div>
          <span className="text-[11px] font-semibold text-muted-foreground">Marks & attempts count</span>
        </div>

        {/* Quiz Selector */}
        {relevantQuizzes.length > 0 ? (
          <div>
            <label className="text-[11px] font-black uppercase tracking-wider text-muted-foreground block mb-1">
              Select Quiz:
            </label>
            <select
              value={selectedQuiz?.id ?? ""}
              onChange={(e) => setSelectedQuizId(e.target.value)}
              className="w-full rounded-2xl border border-input bg-secondary/50 px-3.5 py-2.5 text-xs font-bold outline-none focus:border-primary shadow-xs text-foreground"
            >
              {relevantQuizzes.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.title} ({z.questions.length} Qs)
                </option>
              ))}
            </select>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">No quizzes available for this filter.</p>
        )}

        {/* Detailed Players Table for Selected Quiz */}
        {selectedQuiz && (
          <div className="rounded-2xl border border-border/70 overflow-hidden divide-y divide-border/60">
            <div className="bg-secondary/60 px-3.5 py-2 grid grid-cols-12 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
              <span className="col-span-4">Player</span>
              <span className="col-span-4 text-center">Score / Marks</span>
              <span className="col-span-4 text-right">Kitni Baar Diya</span>
            </div>

            {quizPlayerBreakdown.map((p) => (
              <div
                key={p.username}
                className={cn(
                  "px-3.5 py-2.5 grid grid-cols-12 items-center text-xs transition",
                  p.username === auth.username && "bg-primary/10 font-bold"
                )}
              >
                <div className="col-span-4 flex items-center gap-2 min-w-0">
                  <span className="h-6 w-6 rounded-lg bg-secondary text-[10px] font-black flex items-center justify-center shrink-0">
                    {p.username[0].toUpperCase()}
                  </span>
                  <span className="truncate font-bold text-foreground">
                    {cap(p.username)} {p.username === auth.username && <span className="text-primary text-[10px]">(You)</span>}
                  </span>
                </div>

                <div className="col-span-4 text-center">
                  {p.bestScore !== null ? (
                    <span className="inline-flex items-center gap-1 font-black text-emerald-400 tabular-nums">
                      <span>{p.bestScore}/{p.total}</span>
                      <span className="text-[10px] text-muted-foreground">({Math.round((p.bestScore / (p.total || 1)) * 100)}%)</span>
                    </span>
                  ) : (
                    <span className="text-[11px] text-muted-foreground">Not Given</span>
                  )}
                </div>

                <div className="col-span-4 text-right font-black tabular-nums text-foreground">
                  {p.timesAttempted > 0 ? (
                    <span className="rounded-full bg-primary/10 border border-primary/20 px-2 py-0.5 text-[10px] text-primary">
                      {p.timesAttempted} {p.timesAttempted === 1 ? "Attempt" : "Attempts"}
                    </span>
                  ) : (
                    <span className="text-[10px] text-muted-foreground">0x</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Head-to-Head Comparison Card */}
      <div className="rounded-3xl border border-border/80 bg-card p-4.5 shadow-soft space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Swords size={18} className="text-primary" />
            <h3 className="font-display font-extrabold text-sm text-foreground">Head-to-Head Comparison</h3>
          </div>
          <span className="text-[11px] font-semibold text-muted-foreground">Direct Rival Battle</span>
        </div>

        {/* Rival Selector Pills */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-muted-foreground">Rival:</span>
          <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
            {PLAYERS.filter((u) => u !== auth.username).map((u) => (
              <Button
                key={u}
                variant="unstyled"
                onClick={() => setRival(u)}
                className={cn(
                  "rounded-xl px-2.5 py-1 text-xs font-bold transition active:scale-95",
                  rival === u
                    ? "bg-primary text-primary-foreground font-black shadow-xs"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                )}
              >
                {cap(u)}
              </Button>
            ))}
          </div>
        </div>

        {/* Side-by-Side Comparison Grid */}
        <div className="rounded-2xl border border-border/70 bg-secondary/30 p-3 space-y-2">
          <div className="grid grid-cols-3 items-center text-center font-display font-black text-xs">
            <div className="text-left text-primary">{cap(playerA.username)} (You)</div>
            <div className="text-muted-foreground text-[10px] uppercase tracking-wider">Metric</div>
            <div className="text-right text-accent">{cap(playerB.username)}</div>
          </div>

          {([
            ["Total Marks", `${playerA.totalMarks} pts`, `${playerB.totalMarks} pts`, playerA.totalMarks > playerB.totalMarks, playerB.totalMarks > playerA.totalMarks],
            ["Quizzes Taken", `${playerA.quizzesTaken}`, `${playerB.quizzesTaken}`, playerA.quizzesTaken > playerB.quizzesTaken, playerB.quizzesTaken > playerA.quizzesTaken],
            ["Total Attempts", `${playerA.totalAttempts}x`, `${playerB.totalAttempts}x`, playerA.totalAttempts > playerB.totalAttempts, playerB.totalAttempts > playerA.totalAttempts],
            ["Accuracy", `${playerA.accuracy}%`, `${playerB.accuracy}%`, playerA.accuracy > playerB.accuracy, playerB.accuracy > playerA.accuracy],
          ] as const).map(([label, valA, valB, winA, winB]) => (
            <div key={label} className="grid grid-cols-3 items-center text-center text-xs py-1 border-t border-border/40">
              <div className={cn("text-left font-bold tabular-nums", winA ? "text-emerald-400 font-black" : "text-foreground")}>
                {winA && "⭐ "} {valA}
              </div>
              <div className="text-[11px] text-muted-foreground font-semibold">{label}</div>
              <div className={cn("text-right font-bold tabular-nums", winB ? "text-emerald-400 font-black" : "text-foreground")}>
                {valB} {winB && " ⭐"}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Full Leaderboard Standings List for 4 Players */}
      <div className="space-y-2">
        <h3 className="font-display font-extrabold text-sm text-foreground px-1">All 4 Players Standings</h3>
        {standings.map((b) => (
          <div
            key={b.username}
            className={cn(
              "flex w-full items-center gap-3 rounded-2xl border p-3.5 text-left transition shadow-soft",
              b.rank === 1 ? "border-amber-500/40 bg-amber-500/6" : "border-border/80 bg-card",
              b.username === auth.username && "ring-2 ring-primary/40 border-primary/60"
            )}
          >
            <div className="w-8 text-center font-display text-base font-black text-muted-foreground tabular-nums">
              {b.rank ? (b.rank === 1 ? "🥇" : b.rank === 2 ? "🥈" : b.rank === 3 ? "🥉" : `#${b.rank}`) : "—"}
            </div>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-secondary font-display text-base font-black text-foreground shadow-xs">
              {b.username[0].toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-display font-extrabold text-sm text-foreground">
                {cap(b.username)} {b.username === auth.username && <span className="text-xs text-primary font-bold">(You)</span>}
              </p>
              <p className="text-[11px] text-muted-foreground font-semibold tabular-nums mt-0.5">
                {b.totalMarks} marks · {b.totalAttempts} attempts · {b.accuracy}% accuracy
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="font-display text-lg font-black text-primary tabular-nums">{b.totalMarks}</p>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tight">marks</p>
            </div>
          </div>
        ))}
      </div>

      {/* Admin Presence console for Arun */}
      {auth.username === "arun" && (
        <details className="group rounded-2xl border border-border/80 bg-card p-4 transition shadow-soft">
          <summary className="flex cursor-pointer items-center justify-between text-xs font-black uppercase tracking-wider text-muted-foreground hover:text-foreground">
            <span>⚙️ Player Activity Console (Admin)</span>
            <span className="transition-transform group-open:rotate-180">⌄</span>
          </summary>
          <div className="pt-3">
            <Activity auth={auth} />
          </div>
        </details>
      )}
    </div>
  );
}

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });

function Activity({ auth }: { auth: Auth }) {
  const fetchAct = useServerFn(getActivity);
  const q = useQuery({
    queryKey: ["activity"],
    queryFn: () => fetchAct({ data: { username: auth.username, password: auth.password } }),
    refetchInterval: 30000,
  });
  if (!q.data) return null;
  return (
    <div className="space-y-3 pt-2">
      <div className="grid grid-cols-2 gap-2">
        {PLAYERS.map((u) => {
          const p = q.data.presence?.find((x: any) => x.username === u);
          const online = p && Date.now() - new Date(p.last_seen).getTime() < 2.5 * 60 * 1000;
          return (
            <div key={u} className="rounded-xl bg-secondary/60 p-3 border border-border/60">
              <p className="text-xs font-extrabold text-foreground">{online ? "🟢" : "⚪"} {cap(u)}</p>
              <p className="text-[10px] text-muted-foreground font-medium mt-0.5">
                {online ? "Online now" : p ? `Last: ${when(p.last_seen)}` : "No activity"}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
