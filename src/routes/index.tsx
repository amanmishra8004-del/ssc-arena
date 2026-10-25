import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { changePassword, getActivity, login, ping } from "@/lib/data.functions";
import { deleteQuiz, type QQ } from "@/lib/quiz.functions";
import { useQuizzes, QuizPlayer, QuizUpload } from "@/components/quiz-zone";
import { Button } from "@/components/ui/button";
import {
  Trophy, Award, Check, Play, RotateCcw, Swords, Sparkles, Plus,
  Search, ChevronRight, KeyRound, LogOut, Menu, X,
  BarChart3, Users, Eye, EyeOff, Trash2, CheckCircle2,
  Compass, Shield, Flame, Share2, Download, Smartphone, Copy, CheckCheck
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MotionPresence } from "@/components/motion-presence";
import { useWorkspaceNavigation, validateWorkspaceSearch } from "@/lib/workspace-navigation";

export const Route = createFileRoute("/")({
  validateSearch: validateWorkspaceSearch,
  head: () => ({
    title: "GK/GS Quiz Arena — Arun, Ali, Naveen, Devansh",
    meta: [
      { property: "og:title", content: "🎯 SSC GK/GS Quiz Arena" },
      { name: "description", content: "SSC GK/GS Quizzes by subjects, leaderboard, attempt tracker & player scoreboard for Arun, Ali, Naveen and Devansh." },
      { property: "og:description", content: "Compete on uploaded SSC GK/GS Quizzes, track marks and live leaderboard." },
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

const SUBJECT_BOXES: SubjectBox[] = [
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

function App() {
  return <ArenaApp />;
}

function ArenaApp() {
  const [auth, setAuth] = useState<Auth | null>(null);
  const [ready, setReady] = useState(false);
  const [showApkModal, setShowApkModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  const { search, change } = useWorkspaceNavigation();
  const popup = search.panel === "password";
  const setPopup = (open: boolean) => change({ panel: open ? "password" : undefined }, !open);

  // Listen for native PWA install prompt
  useEffect(() => {
    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
  }, []);

  useEffect(() => {
    const raw = localStorage.getItem("arena-auth");
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        setAuth(parsed);
        // Show APK modal once on first-time login/visit
        const apkPromptShown = localStorage.getItem("arena-apk-prompt-shown");
        if (!apkPromptShown) {
          setTimeout(() => setShowApkModal(true), 1200);
        }
      } catch {}
    }
    setReady(true);
  }, []);

  const store = (a: Auth) => {
    localStorage.setItem("arena-auth", JSON.stringify(a));
    setAuth(a);
    // Show APK modal on first login
    const apkPromptShown = localStorage.getItem("arena-apk-prompt-shown");
    if (!apkPromptShown) {
      setTimeout(() => setShowApkModal(true), 800);
    }
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
        onOpenInstall={() => setShowApkModal(true)}
      />
    );
  }

  return (
    <>
      <Main
        auth={auth}
        openPass={() => setPopup(true)}
        openInstall={() => setShowApkModal(true)}
        openShare={() => setShowShareModal(true)}
        logout={() => {
          localStorage.removeItem("arena-auth");
          setAuth(null);
        }}
      />

      {/* Install as APK / Mobile App Modal */}
      <MotionPresence open={showApkModal}>
        <ApkInstallModal
          deferredPrompt={deferredPrompt}
          onClose={() => {
            localStorage.setItem("arena-apk-prompt-shown", "true");
            setShowApkModal(false);
          }}
        />
      </MotionPresence>

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

function ApkInstallModal({
  deferredPrompt,
  onClose,
}: {
  deferredPrompt: any;
  onClose: () => void;
}) {
  const [installed, setInstalled] = useState(false);
  const [showSteps, setShowSteps] = useState(false);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === "accepted") {
          setInstalled(true);
          setTimeout(() => onClose(), 1500);
          return;
        }
      } catch {}
    }
    setShowSteps(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/85 p-4 backdrop-blur-md" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm space-y-4 rounded-3xl border border-border/80 bg-card p-6 shadow-2xl backdrop-blur-2xl text-center"
      >
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-primary to-accent shadow-xl shadow-primary/30 ring-4 ring-primary/20">
          <Smartphone className="h-8 w-8 text-white" />
        </div>

        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-[10px] font-black text-emerald-400 uppercase tracking-wider">
            <Sparkles size={11} /> Mobile APK Ready
          </div>
          <h2 className="mt-2 text-xl font-black font-display text-foreground tracking-tight">Install as Mobile App</h2>
          <p className="mt-1 text-xs text-muted-foreground font-semibold">
            Run SSC GK Arena like a native Android APK directly on your phone
          </p>
        </div>

        {/* Perks list */}
        <div className="rounded-2xl border border-border/70 bg-secondary/40 p-3 text-left space-y-2 text-xs font-semibold">
          <div className="flex items-center gap-2 text-foreground">
            <span className="text-emerald-400 font-black">✓</span>
            <span><strong>Fullscreen view</strong> (bina browser address bar ke)</span>
          </div>
          <div className="flex items-center gap-2 text-foreground">
            <span className="text-emerald-400 font-black">✓</span>
            <span><strong>1-Tap Home Screen Icon</strong> (Seedhe app khulega)</span>
          </div>
          <div className="flex items-center gap-2 text-foreground">
            <span className="text-emerald-400 font-black">✓</span>
            <span><strong>Fast offline caching</strong> & instant score sync</span>
          </div>
        </div>

        {/* Step by step guidance if direct prompt not available */}
        {showSteps && (
          <div className="rounded-2xl border border-primary/30 bg-primary/10 p-3 text-left space-y-2 text-xs text-primary-foreground">
            <p className="font-extrabold text-primary text-[11px] uppercase tracking-wider">📱 How to Install on Phone:</p>
            <div className="text-[11px] space-y-1 text-foreground font-medium">
              <p><strong>Android Chrome:</strong> Tap <strong className="text-primary">⋮ (3 dots)</strong> at top right ➔ Tap <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>.</p>
              <p><strong>iPhone Safari:</strong> Tap <strong className="text-primary">Share icon</strong> ➔ Tap <strong>"Add to Home Screen"</strong>.</p>
            </div>
          </div>
        )}

        <div className="space-y-2 pt-1">
          <Button
            variant="unstyled"
            onClick={handleInstallClick}
            className="w-full rounded-2xl bg-gradient-to-r from-primary to-accent py-3.5 text-xs font-black text-primary-foreground shadow-lg shadow-primary/30 active:scale-95 flex items-center justify-center gap-2"
          >
            {installed ? (
              <>
                <CheckCircle2 size={16} />
                <span>Installed Successfully!</span>
              </>
            ) : (
              <>
                <Download size={16} />
                <span>📲 Install App on Phone</span>
              </>
            )}
          </Button>

          <Button
            variant="unstyled"
            type="button"
            onClick={onClose}
            className="w-full rounded-2xl border border-border/80 bg-secondary/60 py-2.5 text-xs font-bold text-muted-foreground hover:text-foreground active:scale-95"
          >
            Continue in Browser
          </Button>
        </div>
      </div>
    </div>
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
  onOpenInstall,
}: {
  onLogin: (a: Auth) => void;
  onOpenShare: () => void;
  onOpenInstall: () => void;
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
        <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs font-bold">
          <button
            type="button"
            onClick={onOpenShare}
            className="text-emerald-400 hover:underline flex items-center gap-1.5"
          >
            <WhatsAppIcon className="h-3.5 w-3.5" />
            <span>Share on WhatsApp</span>
          </button>

          <button
            type="button"
            onClick={onOpenInstall}
            className="text-primary hover:underline flex items-center gap-1"
          >
            <Download size={13} />
            <span>Install as App</span>
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
  openInstall,
  openShare,
}: {
  auth: Auth;
  logout: () => void;
  openPass: () => void;
  openInstall: () => void;
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

  // Auto-launch quiz if URL contains ?quiz= or ?quizId=
  useEffect(() => {
    if (search.quizId && quizzes.length > 0 && !playingQuiz) {
      const found = quizzes.find((x) => x.id === search.quizId);
      if (found) {
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
              <Sparkles size={10} /> GK/GS Arena Player
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

          {/* Install as APK App Button */}
          <Button
            variant="unstyled"
            onClick={openInstall}
            title="Install Mobile App"
            className="flex items-center gap-1.5 rounded-2xl border border-primary/30 bg-primary/10 px-2.5 py-1.5 text-xs font-extrabold text-primary hover:bg-primary/20 active:scale-95 transition"
          >
            <Download size={14} />
            <span className="hidden sm:inline">App</span>
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
                openInstall();
              }}
              className="flex w-full items-center gap-3 rounded-2xl bg-primary/10 hover:bg-primary/15 p-3.5 text-left active:scale-98 transition border border-primary/25"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-primary-foreground shrink-0">
                <Smartphone size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-extrabold text-primary">Install as Mobile APK</p>
                <p className="text-[10px] text-muted-foreground font-medium">Direct fullscreen app on mobile home screen</p>
              </div>
              <ChevronRight size={15} className="text-primary" />
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
          <GKQuizSection
            auth={auth}
            quizzes={quizzes}
            attempts={attempts}
            onPlayQuiz={(z) => setPlayingQuiz(z)}
            onOpenShare={openShare}
            onOpenInstall={openInstall}
            onRefresh={() => qc.invalidateQueries({ queryKey: ["quizzes"] })}
          />
        ) : (
          <LeaderboardSection
            auth={auth}
            quizzes={quizzes}
            attempts={attempts}
            onOpenShare={openShare}
            onPlayQuiz={(z) => setPlayingQuiz(z)}
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
            <span>GK/GS Quizzes</span>
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

function GKQuizSection({
  auth,
  quizzes,
  attempts,
  onPlayQuiz,
  onOpenShare,
  onOpenInstall,
  onRefresh,
}: {
  auth: Auth;
  quizzes: Quiz[];
  attempts: Attempt[];
  onPlayQuiz: (z: Quiz) => void;
  onOpenShare: () => void;
  onOpenInstall: () => void;
  onRefresh: () => void;
}) {
  const [search, setSearch] = useState("");
  const [selectedSubjectId, setSelectedSubjectId] = useState("all");
  const [showUpload, setShowUpload] = useState(false);
  const doDeleteQuiz = useServerFn(deleteQuiz);

  // Filter valid GK/GS quizzes
  const gkQuizzes = useMemo(() => {
    return quizzes.filter((z) => !z.expired && !z.chapter?.startsWith("test:"));
  }, [quizzes]);

  // Overall player marks & completed count
  const myTotalQuizzesCompleted = useMemo(() => {
    const completedIds = new Set(attempts.filter((a) => a.username === auth.username).map((a) => a.quiz_id));
    return completedIds.size;
  }, [attempts, auth.username]);

  const myTotalScore = useMemo(() => {
    let tot = 0;
    for (const z of gkQuizzes) {
      const myAtts = attempts.filter((a) => a.username === auth.username && a.quiz_id === z.id);
      if (myAtts.length > 0) {
        tot += Math.max(...myAtts.map((a) => a.score));
      }
    }
    return tot;
  }, [gkQuizzes, attempts, auth.username]);

  // Active Subject Box Meta
  const activeSubject = useMemo(() => {
    return SUBJECT_BOXES.find((s) => s.id === selectedSubjectId) || SUBJECT_BOXES[0];
  }, [selectedSubjectId]);

  // Calculate stats for each subject box
  const subjectBoxStats = useMemo(() => {
    return SUBJECT_BOXES.map((box) => {
      const matching = box.id === "all" ? gkQuizzes : gkQuizzes.filter(box.matcher);
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
  }, [gkQuizzes, attempts, auth.username]);

  // Filter quizzes by active subject box + search query
  const filtered = useMemo(() => {
    return gkQuizzes.filter((z) => {
      const title = (z.title || "").toLowerCase();
      const chap = (z.chapter || "").toLowerCase();
      const q = search.toLowerCase().trim();
      const matchesSearch = !q || title.includes(q) || chap.includes(q);

      if (!matchesSearch) return false;
      if (selectedSubjectId === "all") return true;
      return activeSubject.matcher(z);
    });
  }, [gkQuizzes, search, selectedSubjectId, activeSubject]);

  // Sort quizzes: earliest added at TOP, newest at bottom, ordered chapter-wise
  const sortedQuizzes = useMemo(() => {
    return [...filtered].sort((a, b) => {
      // Compare chapters if both have defined chapter names
      const chapA = (a.chapter || "").trim();
      const chapB = (b.chapter || "").trim();
      if (chapA && chapB && chapA !== chapB) {
        return chapA.localeCompare(chapB, undefined, { numeric: true, sensitivity: "base" });
      }
      // Earliest added first (at TOP)
      const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return timeA - timeB;
    });
  }, [filtered]);

  const [copiedQuizId, setCopiedQuizId] = useState<string | null>(null);

  const handleShareParticularQuiz = (z: Quiz) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "https://ssc-arena.pages.dev";
    const link = `${origin}/?quiz=${z.id}`;
    const text = `🎯 *SSC GK/GS Quiz Challenge!*\n\n📝 *Quiz:* ${z.title}\n📚 *Chapter:* ${z.chapter || "GK/GS"}\n❓ *Questions:* ${z.questions.length} Qs (${z.questions.length * 2} Marks)\n\n⚔️ *Players:* Arun, Ali, Naveen, Devansh\n\n👉 *Direct Quiz Link (Click to attempt):* \n${link}`;
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
      {/* Hero Stats Card */}
      <div className="rounded-3xl border border-border/80 bg-gradient-to-br from-card via-card to-secondary/50 p-5 shadow-soft">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/20 px-2.5 py-0.5 text-[10px] font-black text-primary uppercase tracking-wider">
              <Sparkles size={11} /> SSC GK / GS Arena
            </div>
            <h2 className="mt-1 text-xl sm:text-2xl font-black font-display text-foreground tracking-tight">GK/GS Quizzes</h2>
            <p className="text-xs text-muted-foreground font-semibold mt-0.5">Select a subject box below & solve quizzes to compete</p>
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
            <span className="font-display text-lg font-black text-foreground tabular-nums">{gkQuizzes.length}</span>
          </div>
          <div className="rounded-2xl bg-secondary/60 p-2.5 border border-border/40">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Completed</span>
            <span className="font-display text-lg font-black text-emerald-400 tabular-nums">{myTotalQuizzesCompleted}</span>
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
        <div className="rounded-3xl border border-primary/40 bg-card p-5 shadow-2xl">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display text-sm font-extrabold text-foreground">Upload GK/GS Quiz (Admin)</h3>
            <span className="text-xs text-muted-foreground font-semibold">HTML or JSON files supported</span>
          </div>
          <QuizUpload
            mode="quiz"
            onCreated={() => {
              setShowUpload(false);
              onRefresh();
            }}
          />
        </div>
      )}

      {/* ============================================================ */}
      {/* SUBJECT BOXES GRID (7 Categories)                            */}
      {/* ============================================================ */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <h3 className="font-display font-extrabold text-sm text-foreground flex items-center gap-2">
            <span>Subject Boxes</span>
            <span className="text-[10px] font-bold text-muted-foreground">Tap to filter</span>
          </h3>
          {selectedSubjectId !== "all" && (
            <button
              onClick={() => setSelectedSubjectId("all")}
              className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
            >
              Reset to All ({gkQuizzes.length})
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
          {subjectBoxStats.map((box) => {
            const isSelected = selectedSubjectId === box.id;
            return (
              <button
                key={box.id}
                type="button"
                onClick={() => setSelectedSubjectId(box.id)}
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
            placeholder={`Search in ${activeSubject.name} (${filtered.length} quizzes)...`}
            className="w-full rounded-2xl border border-input bg-card pl-10 pr-9 py-2.5 text-xs font-semibold outline-none focus:border-primary shadow-xs transition"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X size={14} />
            </button>
          )}
        </div>

        {selectedSubjectId !== "all" && (
          <div className="flex items-center justify-between rounded-2xl bg-secondary/70 border border-border/80 px-3 py-2 text-xs">
            <span className="font-bold text-foreground flex items-center gap-1.5">
              <span>{activeSubject.icon}</span>
              <span>Showing: <strong>{activeSubject.name}</strong> ({filtered.length} available)</span>
            </span>
            <button
              onClick={() => setSelectedSubjectId("all")}
              className="text-[11px] font-black text-primary hover:underline"
            >
              Clear Filter
            </button>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* QUIZZES LIST                                                 */}
      {/* ============================================================ */}
      <div className="space-y-3">
        {sortedQuizzes.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border/90 p-8 text-center space-y-2 bg-card/50">
            <p className="text-sm font-bold text-foreground">No quizzes found for this subject.</p>
            <p className="text-xs text-muted-foreground">Try selecting a different subject box above or upload new quiz.</p>
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
          sortedQuizzes.map((z, idx) => {
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
            const quizSubject = SUBJECT_BOXES.slice(1).find((sb) => sb.matcher(z)) || SUBJECT_BOXES[0];

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
                        <span>{quizSubject.icon}</span>
                        <span>{quizSubject.name}</span>
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
          })
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
}: {
  auth: Auth;
  quizzes: Quiz[];
  attempts: Attempt[];
  onOpenShare: () => void;
  onPlayQuiz: (z: Quiz) => void;
}) {
  const [selectedQuizId, setSelectedQuizId] = useState<string>(() => quizzes[0]?.id ?? "");
  const [rival, setRival] = useState<string>(() => {
    const others = PLAYERS.filter((u) => u !== auth.username);
    return others[0] || PLAYERS[0];
  });

  // Calculate Overall Standings for the 4 fixed players
  const standings = useMemo(() => {
    const list = PLAYERS.map((u) => {
      const uAttempts = attempts.filter((a) => a.username === u);
      const totalAttempts = uAttempts.length;
      const uniqueQuizzes = new Set(uAttempts.map((a) => a.quiz_id)).size;

      let totalScore = 0;
      let totalPossible = 0;
      for (const z of quizzes) {
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
  }, [attempts, quizzes]);

  const first = standings.find((s) => s.rank === 1);
  const second = standings.find((s) => s.rank === 2);
  const third = standings.find((s) => s.rank === 3);

  // Quiz-specific player breakdown
  const selectedQuiz = useMemo(() => quizzes.find((z) => z.id === selectedQuizId) || quizzes[0], [quizzes, selectedQuizId]);
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
            <Trophy size={11} /> Live GK/GS Leaderboard
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
            <h3 className="font-display font-extrabold text-sm text-foreground">Quiz-wise Score & Attempt Tracker</h3>
          </div>
          <span className="text-[11px] font-semibold text-muted-foreground">Marks & attempts count</span>
        </div>

        {/* Quiz Selector */}
        {quizzes.length > 0 && (
          <div>
            <label className="text-[11px] font-black uppercase tracking-wider text-muted-foreground block mb-1">
              Select GK/GS Quiz:
            </label>
            <select
              value={selectedQuiz?.id ?? ""}
              onChange={(e) => setSelectedQuizId(e.target.value)}
              className="w-full rounded-2xl border border-input bg-secondary/50 px-3.5 py-2.5 text-xs font-bold outline-none focus:border-primary shadow-xs text-foreground"
            >
              {quizzes.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.title} ({z.questions.length} Qs)
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Detailed Players Table for Selected Quiz */}
        {selectedQuiz ? (
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
        ) : (
          <p className="text-xs text-muted-foreground">No quizzes available.</p>
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
