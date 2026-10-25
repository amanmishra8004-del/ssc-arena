import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import { addUser, changePassword, getActivity, getAll, listUsers, login, ping, registerPush, removeUser, resetPassword, saveData, testPush } from "@/lib/data.functions";
import { enablePush, pushSupported } from "@/lib/push";
import { sendDeviceNotification, checkTimetableAlerts } from "@/lib/local-notify";
import {
  SYLLABUS, USERS, type UserData, type Slot, type CAItem, type CustomChapter, type ChapterState, normalize, stats, todayKey, chapterKey, fmt, TOTAL_CHAPTERS,
} from "@/lib/syllabus";
import { Button } from "@/components/ui/button";
import {
  BookOpen, CalendarDays, ChevronRight, Menu, Trophy, UserRound, Bell, KeyRound, LogOut, Brain,
  Newspaper, Hash, ClipboardList, Type, Trash2, ArrowUp, ArrowDown, GripVertical, Clock3, Check,
  Play, Flame, Pencil, Plus, Minus, FileQuestion, FileText, CloudOff, MessageSquare, Eye, EyeOff,
  Sparkles, RotateCcw, AlertTriangle, CheckCircle2, Award, Swords, ArrowRight, X
} from "lucide-react";
import {
  QuizZone, QuizPlayer, useQuizScores, useChapterQuizMap, useChapterAllQuizzesMap,
  useChapterWeakQuestionsMap, useAllPlayerQuizStats, type ChapterQuizItem
} from "@/components/quiz-zone";
import { MathPracticeZone } from "@/components/math-practice";
import { BlackBookVocabZone } from "@/components/blackbook-vocab";
import { PYQPracticeZone } from "@/components/pyq-practice";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { TimetableSortable } from "@/components/timetable-sortable";
import { cn } from "@/lib/utils";
import { getDailyCA, uploadDailyCA } from "@/lib/ca.functions";
import { MotionPresence } from "@/components/motion-presence";
import { useWorkspaceNavigation, validateWorkspaceSearch } from "@/lib/workspace-navigation";

export const Route = createFileRoute("/")({
  validateSearch: validateWorkspaceSearch,
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Study Arena — Study Planner & Exam Preparation" },
      { name: "description", content: "Plan your daily study, track chapters and PYQ marks, revise current affairs and compete on a live leaderboard." },
      { property: "og:title", content: "Study Arena — Daily Timetable, Syllabus & Ranking" },
      { property: "og:description", content: "Track tasks, chapters, PYQ marks and compete on a live leaderboard." },
    ],
  }),
  component: App,
});

type Auth = { username: string; password: string; isDefault?: boolean };
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const SUBJ_COLOR: Record<string, string> = {
  Reasoning: "bg-chart-2", Maths: "bg-primary", GS: "bg-accent",
};

function App() {
  return <ArenaApp />;
}

function ArenaApp() {
  const [auth, setAuth] = useState<Auth | null>(null);
  const [ready, setReady] = useState(false);
  const { search, change } = useWorkspaceNavigation();
  const popup = search.panel === "password";
  const setPopup = (open: boolean) => change({ panel: open ? "password" : undefined }, !open);
  const fetchUsers = useServerFn(listUsers);
  useEffect(() => {
    const raw = localStorage.getItem("arena-auth");
    if (raw) setAuth(JSON.parse(raw));
    fetchUsers().then((list) => { if (list?.length) USERS.splice(0, USERS.length, ...list); }).catch(() => {}).finally(() => setReady(true));
  }, []);
  const store = (a: Auth) => { localStorage.setItem("arena-auth", JSON.stringify(a)); setAuth(a); };
  if (!ready) return null;
  if (!auth) return <Login onLogin={(a) => { store(a); if (a.isDefault) setPopup(true); }} />;
  return (
    <>
      <Main auth={auth} openPass={() => setPopup(true)} logout={() => { localStorage.removeItem("arena-auth"); setAuth(null); }} />
      <MotionPresence open={popup}><PassPopup auth={auth} onClose={() => setPopup(false)} onChanged={(np) => { store({ ...auth, password: np, isDefault: false }); setPopup(false); }} /></MotionPresence>
    </>
  );
}

function PassPopup({ auth, onClose, onChanged }: { auth: Auth; onClose: () => void; onChanged: (p: string) => void }) {
  const change = useServerFn(changePassword);
  const [np, setNp] = useState("");
  const [np2, setNp2] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-5 backdrop-blur-md" onClick={onClose}>
      <form onClick={(e) => e.stopPropagation()} className="w-full max-w-sm space-y-4 rounded-3xl border border-border/80 bg-card/95 p-6 shadow-elevated backdrop-blur-xl"
        onSubmit={async (e) => {
          e.preventDefault(); setErr("");
          if (np.length < 4) return setErr("Use at least 4 characters.");
          if (np !== np2) return setErr("The passwords do not match.");
          setBusy(true);
          try { await change({ data: { username: auth.username, password: auth.password, newPassword: np } }); onChanged(np); }
          catch (x: any) { setErr(x?.message || "Something went wrong. Please try again."); }
          setBusy(false);
        }}>
        <div>
          <h2 className="font-display text-xl font-bold">Change password</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {auth.isDefault ? "You are using the default password. Set a new password to protect your account." : "Enter and confirm your new password."}
          </p>
        </div>
        <div className="space-y-2.5">
          <input value={np} onChange={(e) => setNp(e.target.value)} type="password" autoComplete="new-password" placeholder="New password"
            className="w-full rounded-2xl border border-input bg-background/80 px-4 py-3 text-sm font-semibold outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
          <input value={np2} onChange={(e) => setNp2(e.target.value)} type="password" autoComplete="new-password" placeholder="Confirm new password"
            className="w-full rounded-2xl border border-input bg-background/80 px-4 py-3 text-sm font-semibold outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
        </div>
        {err && <p className="rounded-xl bg-destructive/10 border border-destructive/20 p-2 text-xs font-semibold text-destructive">{err}</p>}
        <div className="flex gap-2 pt-1">
          <Button variant="unstyled" type="button" onClick={onClose} className="flex-1 rounded-2xl border border-border bg-secondary/50 py-3 text-sm font-bold active:scale-95">Not now</Button>
          <Button variant="unstyled" disabled={busy} className="flex-1 rounded-2xl bg-gradient-to-r from-primary to-accent py-3 text-sm font-bold text-primary-foreground shadow-md shadow-primary/20 active:scale-95 disabled:opacity-60">{busy ? "Saving…" : "Save"}</Button>
        </div>
      </form>
    </div>
  );
}

function Login({ onLogin }: { onLogin: (a: Auth) => void }) {
  const doLogin = useServerFn(login);
  const { search } = useWorkspaceNavigation();
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div className="login-screen relative flex min-h-screen items-center justify-center p-4 sm:p-6 overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 w-60 h-60 rounded-full bg-accent/10 blur-3xl pointer-events-none" />

      <form
        className="relative z-10 w-full max-w-sm space-y-5 rounded-3xl border border-border/80 bg-card/95 p-6 sm:p-8 shadow-elevated backdrop-blur-xl"
        onSubmit={async (e) => {
          e.preventDefault(); setBusy(true); setErr("");
          try {
            const r = await doLogin({ data: { username: u, password: p } });
            if (r.ok) onLogin({ username: r.username, password: p, isDefault: r.isDefault }); else setErr("Incorrect user ID or password.");
          } catch (x: any) { setErr(x?.message || "Connection failed. Please try again."); }
          setBusy(false);
        }}
      >
        <div className="text-center space-y-2">
          <div className="relative mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-tr from-primary via-indigo-500 to-accent shadow-xl shadow-primary/30 ring-1 ring-white/20">
            <Sparkles size={36} className="text-white drop-shadow" />
          </div>
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-bold text-primary">
              <Sparkles size={12} /> SSC CGL Prep Arena
            </span>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight font-display">Study <span className="bg-gradient-to-r from-primary via-purple-400 to-accent bg-clip-text text-transparent">Arena</span></h1>
            <p className="mt-1 text-xs text-muted-foreground font-medium">Daily timetable, syllabus tracking & live arena.</p>
          </div>
        </div>

        {search.quizId && (
          <div className="rounded-2xl border-2 border-primary/50 bg-primary/10 p-3.5 text-center space-y-1 shadow-sm">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/20 px-2.5 py-0.5 text-[10px] font-black uppercase text-primary">
              <span>🎯</span>
              <span>Direct Quiz Invitation</span>
            </div>
            <p className="text-xs font-semibold text-foreground">
              Sign in — your shared quiz will open immediately!
            </p>
          </div>
        )}

        <div className="space-y-1.5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground text-center">Select Profile</p>
          <div className="grid grid-cols-4 gap-1.5">
            {USERS.map((x) => (
              <Button variant="unstyled" type="button" key={x} onClick={() => setU(x)}
                className={cn("flex flex-col items-center gap-1 rounded-2xl border p-2 text-xs font-bold transition active:scale-95",
                  u.toLowerCase() === x.toLowerCase()
                    ? "border-primary bg-primary/12 text-primary ring-2 ring-primary/25 shadow-sm"
                    : "border-border bg-secondary/50 text-muted-foreground hover:bg-secondary")}>
                <div className={cn("flex h-8 w-8 items-center justify-center rounded-full text-xs font-black transition",
                  u.toLowerCase() === x.toLowerCase() ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted text-muted-foreground")}>
                  {x[0].toUpperCase()}
                </div>
                <span className="truncate text-[11px]">{cap(x)}</span>
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <input
            value={u}
            onChange={(e) => setU(e.target.value)}
            placeholder="User ID"
            autoCapitalize="none"
            className="w-full rounded-2xl border border-input bg-background/80 px-4 py-3.5 text-sm font-semibold outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
          <div className="relative">
            <input
              value={p}
              onChange={(e) => setP(e.target.value)}
              placeholder="Password"
              type={showPass ? "text" : "password"}
              autoComplete="current-password"
              className="w-full rounded-2xl border border-input bg-background/80 px-4 py-3.5 pr-11 text-sm font-semibold outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            <Button
              variant="unstyled"
              type="button"
              onClick={() => setShowPass(!showPass)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
            >
              {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
            </Button>
          </div>
        </div>

        {err && <p className="rounded-xl bg-destructive/10 border border-destructive/20 p-2.5 text-center text-xs font-semibold text-destructive">{err}</p>}

        <Button
          variant="unstyled"
          disabled={busy}
          className="w-full rounded-2xl bg-gradient-to-r from-primary to-accent py-3.5 font-display text-sm font-black text-primary-foreground shadow-lg shadow-primary/25 transition active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {busy ? "Signing in…" : <><span>Enter Study Arena</span> <ChevronRight size={18} /></>}
        </Button>
      </form>
    </div>
  );
}

function NotifPopup({ auth, onClose }: { auth: Auth; onClose: () => void }) {
  const reg = useServerFn(registerPush);
  const test = useServerFn(testPush);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const granted = typeof Notification !== "undefined" && Notification.permission === "granted";
  const close = () => { localStorage.setItem("arena-notif-asked", "1"); onClose(); };
  const allow = async () => {
    setBusy(true); setMsg("");
    localStorage.setItem("arena-notif-asked", "1");

    // 1. Send immediate native device alert so the user sees/hears it right now!
    const shown = await sendDeviceNotification(
      "🔔 Study Arena: Notifications Chalu!",
      "Ab daily timetable slot reminders aur study updates yahin aayenge! 🔥"
    );

    // 2. Also register FCM push token in background for cloud push
    const r = await enablePush(true);
    if (r.status === "registered") {
      await reg({ data: { username: auth.username, password: auth.password, token: r.token } }).catch(() => {});
      test({ data: { username: auth.username, password: auth.password } }).catch(() => null);
    }

    if (shown) {
      setMsg("✅ Notification bhej di gayi hai! Apna notification tray / lock screen check karein.");
    } else if (r.status === "registered") {
      setMsg("✅ Notifications enable ho gaye hain!");
    } else if (r.status === "open-in-new-tab") {
      setMsg("PWA ya separate browser tab me open karke notifications enable karein.");
    } else if (r.status === "denied") {
      setMsg("❌ Browser me notifications block hain. URL bar ke paas lock/settings icon par click karke Notifications allow karein.");
    } else if (r.status === "unsupported") {
      setMsg("Aapka browser notifications support nahi karta. Chrome use karein.");
    } else {
      setMsg("Browser ne notification block kar diya. Browser site settings me jaakar allow karein.");
    }
    setBusy(false);
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-5 backdrop-blur-md" onClick={close}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm space-y-4 rounded-3xl border border-border/80 bg-card/95 p-6 shadow-elevated backdrop-blur-xl">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Bell size={24} />
        </div>
        <div>
          <h2 className="font-display text-xl font-bold">Study Notifications</h2>
          <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
            Get instant chime alerts before your timetable study slots start, plus morning kickoff & evening progress recaps.
          </p>
        </div>
        {granted && (
          <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-2.5 text-xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-2">
            <span>✅</span>
            <span>Device notifications are active</span>
          </div>
        )}
        {msg && <p className="rounded-2xl bg-secondary/80 border border-border p-3 text-xs leading-relaxed font-semibold">{msg}</p>}
        <div className="flex gap-2 pt-1">
          <Button variant="unstyled" onClick={close} className="flex-1 rounded-2xl border border-border bg-secondary/50 py-3 text-sm font-bold active:scale-95">{msg ? "Done" : "Not now"}</Button>
          <Button variant="unstyled" disabled={busy} onClick={allow} className="flex-1 rounded-2xl bg-gradient-to-r from-primary to-accent py-3 text-sm font-bold text-primary-foreground shadow-md shadow-primary/20 active:scale-95 disabled:opacity-60">
            {busy ? "Sending…" : granted ? "Send test alert" : "Enable"}
          </Button>
        </div>
      </div>
    </div>
  );
}

type Tab = "today" | "syllabus" | "quiz" | "extras" | "arena";

const richnessScore = (d: any) => {
  if (!d || typeof d !== "object") return 0;
  let n = 0;
  for (const day of Object.values(d.daily ?? {})) n += Object.keys(day as object).length;
  n += Object.keys(d.chapters ?? {}).length;
  n += (d.ca?.length ?? 0) + (d.mocks?.length ?? 0) + (d.vocab?.length ?? 0) + (d.bbWordsMastered?.length ?? 0) + (d.bbIdiomsMastered?.length ?? 0);
  return n;
};

function Main({ auth, logout, openPass }: { auth: Auth; logout: () => void; openPass: () => void }) {
  const fetchAll = useServerFn(getAll);
  const save = useServerFn(saveData);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["all"], queryFn: () => fetchAll(), refetchInterval: 3000 });
  const [mine, setMine] = useState<UserData>(() => {
    if (typeof localStorage !== "undefined") {
      const cachedRaw = localStorage.getItem(`arena-data-${auth.username}`);
      if (cachedRaw) {
        try {
          return normalize(JSON.parse(cachedRaw));
        } catch {}
      }
    }
    return normalize({});
  });
  const { search, change } = useWorkspaceNavigation();
  const router = useRouter();
  const tab = search.tab ?? (search.quizId ? "quiz" : "syllabus");
  const viewing = search.profile && USERS.includes(search.profile) ? search.profile : null;
  const setTab = (next: Tab) => change({ tab: next, profile: undefined, panel: undefined });
  const setViewing = (next: string | null) => change({ profile: next ?? undefined, panel: undefined });
  const goBack = () => { if (router.history.canGoBack()) router.history.back(); else change({ tab: "syllabus", profile: undefined, panel: undefined }, true); };
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "offline">("saved");
  const latestPayload = useRef<UserData | null>(null);
  const menu = search.panel === "menu";
  const setMenu = (open: boolean) => change({ panel: open ? "menu" : undefined }, !open);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const doPing = useServerFn(ping);

  const flushSave = async (payloadToSave: UserData) => {
    setSaveStatus("saving");
    try {
      const res = await save({ data: { ...auth, payload: payloadToSave } });
      if (res && (res as any).ok === false) {
        localStorage.setItem(`arena-pending-${auth.username}`, "1");
        setSaveStatus("offline");
        return;
      }
      localStorage.removeItem(`arena-pending-${auth.username}`);
      setSaveStatus("saved");
      qc.invalidateQueries({ queryKey: ["all"] });
    } catch {
      localStorage.setItem(`arena-pending-${auth.username}`, "1");
      setSaveStatus("offline");
    }
  };

  useEffect(() => {
    const go = () => { if (document.visibilityState === "visible") doPing({ data: { username: auth.username, password: auth.password } }).then((r) => { if (r && r.ok === false) logout(); }).catch(() => {}); };
    go();
    const t = setInterval(go, 60000);
    document.addEventListener("visibilitychange", go);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", go); };
  }, [auth.username, auth.password]);

  // Notifications: silent refresh if already allowed (no annoying auto-popups)
  const notif = search.panel === "notifications";
  const setNotif = (open: boolean) => change({ panel: open ? "notifications" : undefined }, !open);
  const regPush = useServerFn(registerPush);
  useEffect(() => {
    if (!pushSupported()) return undefined;
    if (Notification.permission === "granted") {
      enablePush(false).then((r) => { if (r.status === "registered") regPush({ data: { username: auth.username, password: auth.password, token: r.token } }).catch(() => {}); });
    }
    return undefined;
  }, [auth.username, auth.password]);

  // Periodic local timetable & checkpoint notifications
  useEffect(() => {
    if (!auth?.username) return;
    checkTimetableAlerts(mine, auth.username);
    const t = setInterval(() => {
      checkTimetableAlerts(mine, auth.username);
    }, 25000);
    return () => clearInterval(t);
  }, [mine, auth?.username]);

  // Sync server data when available
  useEffect(() => {
    if (q.data) {
      const row = q.data.find((r) => r.username.toLowerCase() === auth.username.toLowerCase());
      const isPending = localStorage.getItem(`arena-pending-${auth.username}`) === "1";
      const serverData = row?.data && Object.keys(row.data).length ? row.data : null;

      if (serverData) {
        if (!isPending && richnessScore(serverData) >= richnessScore(mine)) {
          const normalized = normalize(serverData);
          latestPayload.current = normalized;
          setMine(normalized);
          localStorage.setItem(`arena-data-${auth.username}`, JSON.stringify(serverData));
        } else if (isPending) {
          flushSave(mine);
        }
      } else if (isPending) {
        flushSave(mine);
      }
    }
  }, [q.data, auth.username]);

  const update = (fn: (d: UserData) => UserData) => {
    setMine((prev) => {
      if (!prev) return prev;
      const next = fn(structuredClone(prev));
      latestPayload.current = next;
      localStorage.setItem(`arena-data-${auth.username}`, JSON.stringify(next));
      localStorage.setItem(`arena-pending-${auth.username}`, "1");
      if (timer.current) clearTimeout(timer.current);
      setSaveStatus("saving");
      timer.current = setTimeout(() => {
        flushSave(next);
      }, 50);
      return next;
    });
  };

  // Re-sync pending offline data on reconnect and flush on tab close/unload
  useEffect(() => {
    const handleSync = () => {
      const isPending = localStorage.getItem(`arena-pending-${auth.username}`) === "1";
      if (isPending) {
        const raw = localStorage.getItem(`arena-data-${auth.username}`);
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            flushSave(parsed);
          } catch {}
        }
      }
    };

    const handleBeforeUnload = () => {
      if (timer.current && latestPayload.current) {
        clearTimeout(timer.current);
        save({ data: { ...auth, payload: latestPayload.current } }).catch(() => {});
      }
    };

    window.addEventListener("online", handleSync);
    window.addEventListener("pagehide", handleBeforeUnload);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("online", handleSync);
      window.removeEventListener("pagehide", handleBeforeUnload);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [auth.username, auth.password]);

  const all = useMemo(() => {
    const m: Record<string, UserData> = {};
    for (const u of USERS) {
      const row = q.data?.find((r) => r.username === u);
      m[u] = u === auth.username && mine ? mine : normalize(row?.data);
    }
    return m;
  }, [q.data, mine, auth.username]);

  const board = useMemo(() => {
    const list = USERS.map((u) => ({ u, ...stats(all[u]) }));
    list.sort((a, b) => b.score - a.score);
    let r = 0;
    return list.map((x) => ({ ...x, rank: x.score > 0 ? ++r : null }));
  }, [all]);

  if (!mine) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading your workspace…</div>;
  const fallbackMe = { u: auth.username, score: 0, rank: null, todayMin: 0, planMin: 0, tasksDone: 0, totalMin: 0, lec: 0, rev: 0, pyq: 0, caCount: 0, streak: 0 };
  const me = board.find((b) => b.u.toLowerCase() === auth.username.toLowerCase()) ?? fallbackMe;

  return (
    <div className="arena-shell min-h-screen pb-28">
      <header className="app-header sticky top-0 z-20 flex items-center justify-between gap-3 px-4 py-2.5">
        <Button variant="unstyled" onClick={() => setViewing(auth.username)} className="flex min-w-0 items-center gap-2.5 text-left active:scale-98">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-primary to-accent font-display text-base font-black text-white shadow-sm ring-2 ring-primary/25">
            {auth.username[0].toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate font-display text-sm font-extrabold leading-tight text-foreground">{cap(auth.username)}</p>
            <div className="save-status flex items-center gap-1 text-[11px] text-muted-foreground font-semibold mt-0.5">
              {saveStatus === "saving" && (
                <span className="inline-flex items-center gap-1 text-primary">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
                  <span>Saving…</span>
                </span>
              )}
              {saveStatus === "saved" && (
                <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                  <Check size={11} strokeWidth={3} />
                  <span>Synced</span>
                </span>
              )}
              {saveStatus === "offline" && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    flushSave(latestPayload.current ?? mine);
                  }}
                  className="inline-flex items-center gap-1 text-amber-500 hover:underline"
                  title="Saved locally on this device. Click to sync with cloud"
                >
                  <CloudOff size={11} />
                  <span>Device only</span>
                </button>
              )}
            </div>
          </div>
        </Button>

        <div className="flex shrink-0 items-center gap-1.5">
          {/* Flame streak badge */}
          <div className="flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 text-xs font-black text-amber-600 dark:text-amber-400 shadow-2xs">
            <Flame size={14} className="text-amber-500 fill-amber-500" />
            <span>{me.streak}d</span>
          </div>

          {/* Rank badge */}
          <Button
            variant="unstyled"
            aria-label="Open leaderboard"
            onClick={() => setTab("arena")}
            className="flex h-8 items-center gap-1 rounded-full border border-primary/25 bg-primary/10 px-2.5 text-xs font-black text-primary active:scale-95"
          >
            <Trophy size={13} />
            <span>{me.rank ? `#${me.rank}` : "—"}</span>
          </Button>

          {/* Notifications bell */}
          <Button
            variant="unstyled"
            onClick={() => setNotif(true)}
            aria-label="Notifications"
            className="relative flex h-8 w-8 items-center justify-center rounded-full bg-secondary/80 border border-border text-foreground active:scale-95"
          >
            <Bell size={16} className={typeof Notification !== "undefined" && Notification.permission === "granted" ? "text-primary" : "text-muted-foreground"} />
            {typeof Notification !== "undefined" && Notification.permission !== "granted" && (
              <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
            )}
          </Button>

          {/* Menu button */}
          <Button
            variant="unstyled"
            onClick={() => setMenu(true)}
            aria-label="Menu"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary/80 border border-border text-foreground active:scale-95"
          >
            <Menu size={16} />
          </Button>
        </div>
      </header>

      <MotionPresence open={menu}>
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-background/70 backdrop-blur-md sm:items-center p-0 sm:p-4" onClick={() => setMenu(false)}>
          <div className="w-full max-w-md space-y-3 rounded-t-[32px] sm:rounded-3xl border border-border/80 bg-card p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto mb-1 h-1.5 w-12 rounded-full bg-muted sm:hidden" />
            <p className="font-display text-lg font-extrabold">Account & Menu</p>
            {([
              [UserRound, "My profile", "Your study progress, streaks & stats", () => { setViewing(auth.username); }],
              [Bell, "Notifications", "Turn on reminders & test device chime", () => setNotif(true)],
              [KeyRound, "Change password", "Update your account password", openPass],
              [LogOut, "Sign out", "Sign out of Study Arena on this device", logout],
            ] as const).map(([Icon, t, d, fn]) => (
              <Button variant="unstyled" key={t} onClick={() => { if (t === "Sign out") setMenu(false); fn(); }} className="flex w-full items-center gap-3.5 rounded-2xl bg-secondary/60 hover:bg-secondary p-3.5 text-left active:scale-[0.98] transition border border-border/60">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-card text-primary shadow-2xs">
                  <Icon size={20} className="shrink-0" />
                </div>
                <span className="min-w-0 flex-1">
                  <span className="block font-bold text-sm text-foreground">{t}</span>
                  <span className="block text-xs text-muted-foreground font-medium">{d}</span>
                </span>
                <ChevronRight size={16} className="shrink-0 text-muted-foreground" />
              </Button>
            ))}
          </div>
        </div>
      </MotionPresence>

      <main key={viewing ?? tab} className="workspace-view px-4 pt-4">
        {viewing ? (
          <Profile user={viewing} data={all[viewing]} entry={board.find((b) => b.u === viewing) ?? me} onBack={goBack} onSwitch={setViewing} me={auth.username} openPass={openPass} />
        ) : tab === "quiz" ? (
          <QuizZone who={auth.username} targetChapter={search.chapter} targetQuizId={search.quizId} />
        ) : tab === "arena" ? (
          <Arena board={board} me={auth.username} onView={setViewing} auth={auth} all={all} />
        ) : (
          <Syllabus data={mine} update={update} all={all} auth={auth} />
        )}
      </main>

      <nav className="arena-navigation">
        <div className="desktop-brand">
          <img src="/icon-192.png" alt="" />
          <span>Study Arena</span>
        </div>
        <div className="navigation-items">
          {([
            ["syllabus", BookOpen, "Syllabus", () => setTab("syllabus"), (tab === "syllabus" || !tab) && !viewing],
            ["quiz", FileQuestion, "Quiz Arena", () => setTab("quiz"), tab === "quiz" && !viewing],
            ["arena", Trophy, "Leaderboard", () => setTab("arena"), tab === "arena" && !viewing],
            ["profile", UserRound, "Profile", () => setViewing(auth.username), !!viewing],
          ] as const).map(([k, Icon, l, action, on]) => (
            <Button
              variant="unstyled"
              key={k}
              onClick={() => { action(); window.scrollTo({ top: 0, behavior: "smooth" }); }}
              aria-current={on ? "page" : undefined}
              className={cn(
                "nav-item transition-all duration-200 active:scale-90",
                on ? "bg-primary/15 text-primary scale-[1.03]" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div className={cn("flex h-7 w-7 items-center justify-center rounded-full transition-transform", on && "scale-110")}>
                <Icon size={20} strokeWidth={on ? 2.5 : 1.8} />
              </div>
              <span className={cn("text-[10px] tracking-tight leading-none transition-all", on ? "font-extrabold text-primary" : "font-semibold")}>{l}</span>
            </Button>
          ))}
        </div>
      </nav>
    </div>
  );
}

function Hint({ title, subtitle }: { icon?: string; title: string; subtitle?: string; character?: string; children?: React.ReactNode }) {
  return (
    <div className="page-heading flex items-center justify-between gap-3 pb-1 pt-0.5">
      <div>
        <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-primary">
          <Sparkles size={11} /> Study Arena
        </span>
        <h2 className="mt-0.5 text-2xl sm:text-3xl font-black tracking-tight font-display text-foreground">{title}</h2>
        {subtitle && <p className="text-xs text-muted-foreground font-semibold mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

type Entry = ReturnType<typeof stats> & { u: string; rank: number | null };
type Upd = (fn: (d: UserData) => UserData) => void;

function Ring({ pct, size = 88, children }: { pct: number; size?: number; children?: React.ReactNode }) {
  const r = size / 2 - 7, c = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="color-mix(in oklab, var(--color-muted) 80%, transparent)" strokeWidth="8" fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--color-primary)" strokeWidth="8" fill="none" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(1, Math.max(0, pct)))} style={{ transition: "stroke-dashoffset .6s cubic-bezier(0.16, 1, 0.3, 1)" }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}

function Today({ data, update, me, board, onNavigate }: { data: UserData; update: Upd; me: Entry; board: Entry[]; onNavigate: (tab: Tab) => void }) {
  const tk = todayKey();
  const done = data.daily[tk] ?? {};
  const [edit, setEdit] = useState(false);
  const [nowMin, setNowMin] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => { const n = new Date(); setNowMin(n.getHours() * 60 + n.getMinutes()); };
    tick(); const id = setInterval(tick, 30000); return () => clearInterval(id);
  }, []);
  const special = !!data.daySlots[tk];
  const slots = data.daySlots[tk] ?? data.slots;
  const arr = (d: UserData) => d.daySlots[tk] ?? d.slots;
  const doneCount = slots.filter((s) => done[s.id]).length;
  const above = me.rank && me.rank > 1 ? board[me.rank - 2] : null;
  const leader = board[0];
  const current = nowMin === null ? undefined : slots.find((s) => isLive(s, nowMin));
  const next = nowMin === null ? undefined : [...slots].filter((s) => toMin(s.start) > nowMin).sort((a, b) => a.start.localeCompare(b.start))[0];
  const remaining = current && nowMin !== null ? Math.max(0, current.minutes - ((nowMin - toMin(current.start) + 1440) % 1440)) : 0;
  const toggle = (id: string) => update((d) => { d.daily[tk] = { ...(d.daily[tk] ?? {}), [id]: !d.daily[tk]?.[id] }; return d; });
  const reorder = (from: number, to: number) => update((d) => { const list = arr(d); const [slot] = list.splice(from, 1); if (slot) list.splice(to, 0, slot); return d; });

  const move = (i: number, dir: -1 | 1) => update((d) => {
    const j = i + dir; if (j < 0 || j >= arr(d).length) return d;
    [arr(d)[i], arr(d)[j]] = [arr(d)[j], arr(d)[i]]; return d;
  });

  return (
    <div className="today-workspace space-y-4">
      {/* Unified Focus & Daily Target Hero Card */}
      <section className="relative overflow-hidden rounded-3xl border border-border/80 bg-gradient-to-b from-card/95 via-card to-card p-5 shadow-elevated">
        <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <span className={cn("h-2.5 w-2.5 rounded-full", current ? "bg-accent animate-ping" : "bg-primary")} />
            <span className="text-[11px] font-black uppercase tracking-wider text-accent">
              {current ? (done[current.id] ? "Session Complete" : "Live Focus Session") : next ? "Up Next" : "Daily Goal"}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 text-xs font-black text-amber-500">
              <Flame size={13} className="fill-amber-500" />
              <span>{me.streak}d</span>
            </span>
            <Button
              variant="unstyled"
              onClick={() => onNavigate("arena")}
              className="inline-flex items-center gap-1 rounded-full bg-primary/10 border border-primary/25 px-2.5 py-0.5 text-xs font-black text-primary active:scale-95"
            >
              <Trophy size={12} />
              <span>{me.rank ? `#${me.rank}` : "—"}</span>
            </Button>
          </div>
        </div>

        {/* Focus Task & Large Tabular Countdown */}
        <div className="py-3.5">
          <div className="flex items-baseline justify-between gap-2">
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-primary">
                {(current ?? next)?.subject ?? "Focus Routine"}
              </span>
              <h2 className="truncate text-xl sm:text-2xl font-black font-display text-foreground mt-0.5">
                {current?.label ?? next?.label ?? "All Tasks Complete! 🎉"}
              </h2>
            </div>
            {current ? (
              <div className="text-right shrink-0">
                <span className="font-mono tabular-nums text-3xl sm:text-4xl font-black tracking-tight text-accent">
                  {fmt(remaining)}
                </span>
                <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">left</span>
              </div>
            ) : next && nowMin !== null ? (
              <div className="text-right shrink-0">
                <span className="text-xs font-extrabold text-muted-foreground tabular-nums">
                  in {fmt(toMin(next.start) - nowMin)}
                </span>
              </div>
            ) : null}
          </div>

          {(current ?? next) && (
            <p className="mt-1 text-xs font-semibold text-muted-foreground flex items-center gap-1.5 tabular-nums">
              <Clock3 size={12} />
              <span>{(current ?? next)?.start} – {addMin((current ?? next)?.start ?? "00:00", (current ?? next)?.minutes ?? 0)}</span>
              <span>·</span>
              <span>{fmt((current ?? next)?.minutes ?? 0)} target</span>
            </p>
          )}

          {current && (
            <div className="mt-3 space-y-2.5">
              <div className="h-2 w-full overflow-hidden rounded-full bg-secondary border border-border/50">
                <div
                  className="h-full bg-gradient-to-r from-primary via-accent to-primary rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(0, ((current.minutes - remaining) / (current.minutes || 1)) * 100))}%` }}
                />
              </div>
              <Button
                variant="unstyled"
                onClick={() => toggle(current.id)}
                className={cn(
                  "w-full flex items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-black transition active:scale-98 shadow-md",
                  done[current.id]
                    ? "bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border"
                    : "bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-primary/25"
                )}
              >
                <Check size={18} strokeWidth={3} />
                {done[current.id] ? "Completed · Click to undo" : "Complete session (+10 pts)"}
              </Button>
            </div>
          )}
        </div>

        {/* 3 Clean Bottom Metrics */}
        <div className="grid grid-cols-3 gap-2 border-t border-border/60 pt-3 text-center">
          <div className="rounded-2xl bg-secondary/50 p-2 border border-border/40">
            <span className="text-[10px] font-bold uppercase text-muted-foreground block">Tasks</span>
            <span className="font-display text-base font-black text-foreground tabular-nums">
              {doneCount} / {slots.length}
            </span>
          </div>
          <div className="rounded-2xl bg-secondary/50 p-2 border border-border/40">
            <span className="text-[10px] font-bold uppercase text-muted-foreground block">Studied</span>
            <span className="font-display text-base font-black text-primary tabular-nums">
              {fmt(me.todayMin) || "0h"}
            </span>
          </div>
          <div className="rounded-2xl bg-secondary/50 p-2 border border-border/40">
            <span className="text-[10px] font-bold uppercase text-muted-foreground block">Target</span>
            <span className="font-display text-base font-black text-foreground tabular-nums">
              {Math.round((me.todayMin / (me.planMin || 1)) * 100)}%
            </span>
          </div>
        </div>
      </section>

      {/* Timetable Header */}
      <div className="flex items-center justify-between gap-2 pt-1">
        <div className="min-w-0">
          <h2 className="text-lg font-extrabold text-foreground">Today's Timetable</h2>
          {special && <p className="text-[11px] font-bold text-primary">Date-specific schedule active</p>}
        </div>
        <Button variant={edit ? "default" : "secondary"} onClick={() => setEdit(!edit)} className="h-8 rounded-full px-3 text-xs font-extrabold gap-1.5 active:scale-95 shadow-2xs">
          {edit ? <Check size={14} /> : <Pencil size={13} />}{edit ? "Done" : "Edit"}
        </Button>
      </div>
      {slots.length === 0 && !edit && (
        <Button variant="unstyled" onClick={() => setEdit(true)} className="w-full rounded-lg border-2 border-dashed border-border p-6 text-sm text-muted-foreground">No tasks scheduled. <b className="text-primary">Create a timetable</b> </Button>
      )}
      {edit && (
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-y border-border py-3 text-xs">
          <span className="flex min-w-0 items-center gap-2 font-semibold text-muted-foreground"><GripVertical size={16} className="shrink-0" />Timetable editor</span>
          <Button variant="unstyled" onClick={() => update((d) => { arr(d).sort((a, b) => a.start.localeCompare(b.start)); return d; })} className="rounded-full bg-secondary px-3 py-1.5 font-bold text-foreground">Sort by time</Button>
        </div>
      )}

      <TimetableSortable ids={slots.map((s) => s.id)} onMove={reorder}>
      <div className="timetable-list space-y-2.5">
        {slots.map((s, i) => (
          <SlotRow key={s.id} s={s} checked={!!done[s.id]} edit={edit} live={nowMin !== null && isLive(s, nowMin)}
            onToggle={() => toggle(s.id)}
            onUp={() => move(i, -1)} onDown={() => move(i, 1)}
            onChange={(patch) => update((d) => { arr(d)[i] = { ...arr(d)[i], ...patch }; return d; })}
            onDelete={() => { if (confirm(`"${s.label}" Delete this task?`)) update((d) => { arr(d).splice(i, 1); return d; }); }} />
        ))}
      </div>
      </TimetableSortable>
      {edit && (
        <Button variant="unstyled" onClick={() => update((d) => {
          const last = arr(d)[arr(d).length - 1];
          const start = last ? addMin(last.start, last.minutes) : "06:00";
          arr(d).push({ id: "s" + Date.now().toString(36), subject: "Maths", label: "New task", minutes: 60, start });
          return d;
        })} className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border py-3 text-sm font-bold text-muted-foreground"><Plus size={17} />Add task</Button>
      )}
      <details className="group rounded-2xl border border-border/80 bg-card p-4 transition shadow-soft">
        <summary className="flex cursor-pointer items-center justify-between text-xs font-black uppercase tracking-wider text-muted-foreground hover:text-foreground">
          <span>📅 Date-Specific Custom Timetables</span>
          <span className="transition-transform group-open:rotate-180">⌄</span>
        </summary>
        <div className="pt-3">
          <DayPlans data={data} update={update} />
        </div>
      </details>
    </div>
  );
}

function DayPlans({ data, update }: { data: UserData; update: Upd }) {
  const tk = todayKey();
  const [date, setDate] = useState(tk);
  const [open, setOpen] = useState<string | null>(null);
  const dates = Object.keys(data.daySlots).sort();
  const list = open ? data.daySlots[open] : undefined;
  const nice = (k: string) => new Date(k + "T00:00").toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
  const create = () => {
    if (!date) return;
    if (!data.daySlots[date]) update((d) => { d.daySlots[date] = d.slots.map((s) => ({ ...s, id: s.id + "_" + date.replace(/-/g, "") })); return d; });
    setOpen(date);
  };
  const ed = (fn: (l: Slot[]) => void) => update((d) => { const l = open && d.daySlots[open]; if (l) fn(l); return d; });
  return (
    <section className="mt-6 space-y-3 border-t border-border pt-6">
      <div>
        <h2 className="text-lg font-bold">Date-specific timetables</h2>
        <p className="text-xs text-muted-foreground">Custom schedules for individual dates</p>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
        <input type="date" aria-label="Timetable date" value={date} min={tk} onChange={(e) => setDate(e.target.value)} className="w-full min-w-0 rounded-lg border border-border bg-background px-3 py-2 text-sm" />
        <Button variant="unstyled" onClick={create} className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">{data.daySlots[date] ? "Open" : "Create"}</Button>
      </div>
      {dates.length > 0 && (
        <div className="space-y-2">
          {dates.map((k) => (
            <div key={k} className={cn("flex items-center gap-2 rounded-lg border px-3 py-2 text-sm", open === k ? "border-primary bg-primary/10" : "border-border")}>
              <span className="flex-1 font-bold">{nice(k)}{k === tk ? " · Today" : ""} <span className="font-normal text-muted-foreground">({data.daySlots[k].length} task)</span></span>
              <Button variant="unstyled" onClick={() => setOpen(open === k ? null : k)} className="rounded-lg bg-secondary px-3 py-1.5 text-xs font-bold">{open === k ? "Close" : "Edit"}</Button>
              <Button variant="unstyled" onClick={() => { if (confirm(`${nice(k)} Delete this date-specific timetable?`)) { update((d) => { delete d.daySlots[k]; return d; }); if (open === k) setOpen(null); } }} className="rounded-lg bg-destructive/15 px-3 py-1.5 text-xs font-bold text-destructive">Delete</Button>
            </div>
          ))}
        </div>
      )}
      {open && list && (
        <TimetableSortable ids={list.map((s) => s.id)} onMove={(from, to) => ed((l) => { const [slot] = l.splice(from, 1); if (slot) l.splice(to, 0, slot); })}><div className="space-y-2.5">
          <p className="text-xs font-bold">{nice(open)} timetable · Changes are saved automatically</p>
          {list.map((s, i) => (
            <SlotRow key={s.id} s={s} checked={false} edit live={false} onToggle={() => {}}
              onUp={() => ed((l) => { if (i > 0) [l[i - 1], l[i]] = [l[i], l[i - 1]]; })}
              onDown={() => ed((l) => { if (i < l.length - 1) [l[i + 1], l[i]] = [l[i], l[i + 1]]; })}
              onChange={(patch) => ed((l) => { l[i] = { ...l[i], ...patch }; })}
              onDelete={() => { if (confirm(`"${s.label}" Delete this task?`)) ed((l) => { l.splice(i, 1); }); }} />
          ))}
          <Button variant="unstyled" onClick={() => ed((l) => { const last = l[l.length - 1]; l.push({ id: "s" + Date.now().toString(36), subject: "Maths", label: "New task", minutes: 60, start: last ? addMin(last.start, last.minutes) : "06:00" }); })}
            className="w-full rounded-lg border-2 border-dashed border-border py-3 text-sm font-bold text-muted-foreground">Add task</Button>
        </div></TimetableSortable>
      )}
    </section>
  );
}

const toMin = (t: string) => { const [h, m] = (t || "0:0").split(":").map(Number); return (h || 0) * 60 + (m || 0); };
const addMin = (t: string, n: number) => { const x = ((toMin(t) + n) % 1440 + 1440) % 1440; return `${String(Math.floor(x / 60)).padStart(2, "0")}:${String(x % 60).padStart(2, "0")}`; };
const SUBJECTS = ["Maths", "GS", "Reasoning", "English", "Other"];

const isLive = (s: Slot, nowMin: number) => { const st = toMin(s.start); const d = ((nowMin - st) % 1440 + 1440) % 1440; return d < s.minutes; };

function SlotRow({ s, checked, edit, live, onToggle, onUp, onDown, onChange, onDelete }: { s: Slot; checked: boolean; edit: boolean; live?: boolean; onToggle: () => void; onUp: () => void; onDown: () => void; onChange: (p: Partial<Slot>) => void; onDelete: () => void }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: s.id, disabled: !edit });
  const end = addMin(s.start, s.minutes);
  const inp = "rounded-xl border border-input bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-primary";
  if (edit) return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} data-task-id={s.id} className={cn("relative rounded-2xl border bg-card p-3.5 shadow-soft space-y-3", isDragging ? "z-20 border-primary shadow-elevated ring-2 ring-primary/30" : "border-border")}>
      <div className="flex items-center justify-between border-b border-border/80 pb-2">
        <Button variant="unstyled" ref={setActivatorNodeRef} {...attributes} {...listeners} aria-label={`Reorder ${s.label}`} title="Hold to reorder" className="drag-handle flex items-center gap-2 rounded-xl py-1 text-xs font-bold text-muted-foreground"><GripVertical size={18} className="shrink-0 text-primary" /><span className="truncate">{s.subject}</span></Button>
        <div className="flex shrink-0 gap-1">
          <Button variant="unstyled" onClick={onUp} aria-label="Move up" title="Move up" className="flex h-8 w-8 items-center justify-center rounded-xl bg-secondary border border-border"><ArrowUp size={14} /></Button>
          <Button variant="unstyled" onClick={onDown} aria-label="Move down" title="Move down" className="flex h-8 w-8 items-center justify-center rounded-xl bg-secondary border border-border"><ArrowDown size={14} /></Button>
          <Button variant="unstyled" onClick={onDelete} aria-label="Delete task" title="Delete task" className="flex h-8 w-8 items-center justify-center rounded-xl bg-destructive/10 text-destructive border border-destructive/20"><Trash2 size={14} /></Button>
        </div>
      </div>
      <div className="space-y-2.5">
        <input aria-label="Task name" value={s.label} onChange={(e) => onChange({ label: e.target.value })} className={cn(inp, "w-full font-bold")} placeholder="Task name" />
        <div className="grid grid-cols-2 gap-2 text-sm">
          <label className="space-y-1"><span className="text-[11px] font-bold text-muted-foreground">Start Time</span><input type="time" value={s.start} onChange={(e) => onChange({ start: e.target.value })} className={cn(inp, "w-full")} aria-label="start time" /></label>
          <label className="space-y-1"><span className="text-[11px] font-bold text-muted-foreground">End Time</span><input type="time" value={end} onChange={(e) => { let m = toMin(e.target.value) - toMin(s.start); if (m <= 0) m += 1440; onChange({ minutes: m }); }} className={cn(inp, "w-full")} aria-label="end time" /></label>
        </div>
        <div className="flex items-center justify-between gap-2">
          <select value={s.subject} onChange={(e) => onChange({ subject: e.target.value })} className={cn(inp, "font-semibold")} aria-label="subject">
            {SUBJECTS.map((x) => <option key={x}>{x}</option>)}
          </select>
          <span className="flex items-center gap-1 text-xs font-bold text-muted-foreground"><Clock3 size={14} />{fmt(s.minutes)}</span>
        </div>
      </div>
    </div>
  );
  return (
    <div ref={setNodeRef} data-task-id={s.id} className={cn("task-row flex items-center justify-between gap-3.5 rounded-2xl border p-3.5 sm:p-4 transition shadow-soft", live && !checked ? "task-live border-accent/60 bg-accent/8 shadow-md ring-1 ring-accent/30" : checked ? "task-completed border-border/50 bg-secondary/30" : "border-border/80 bg-card hover:border-border")}>
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-1.5">
          <span className={cn("h-2 w-2 rounded-full", SUBJ_COLOR[s.subject] ?? "bg-muted")} />
          <span className="text-[11px] font-extrabold uppercase tracking-wide text-muted-foreground">{s.subject}</span>
          {live && (
            <span className={cn("ml-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black", checked ? "bg-emerald-500/15 text-emerald-400" : "bg-accent/15 text-accent animate-pulse")}>
              <Play size={9} fill="currentColor" /> {checked ? "Completed" : "Live"}
            </span>
          )}
        </div>
        <p className={cn("font-bold text-sm leading-snug text-foreground", checked && "text-muted-foreground line-through opacity-75")}>{s.label}</p>
        <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground font-semibold tabular-nums">
          <Clock3 size={12} /> {s.start} – {end} · {fmt(s.minutes)}
        </p>
      </div>
      <Button
        variant="unstyled"
        onClick={onToggle}
        aria-label={checked ? "Not done" : "Mark done"}
        className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border-2 transition active:scale-90",
          checked
            ? "border-emerald-500 bg-emerald-500 text-white shadow-md shadow-emerald-500/30"
            : "border-border bg-secondary/50 text-muted-foreground hover:border-primary/50 hover:text-foreground"
        )}
      >
        <Check size={20} strokeWidth={checked ? 3 : 2} />
      </Button>
    </div>
  );
}

function AddChapterModal({
  initialSubject,
  existingSections,
  onClose,
  onAdd,
}: {
  initialSubject: string;
  existingSections: string[];
  onClose: () => void;
  onAdd: (chap: CustomChapter) => void;
}) {
  const [subject, setSubject] = useState(initialSubject);
  const [section, setSection] = useState(existingSections[0] || "");
  const [customSection, setCustomSection] = useState("");
  const [name, setName] = useState("");
  const [lectures, setLectures] = useState("7");
  const [err, setErr] = useState("");

  const effectiveSection = customSection.trim() || section.trim();

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErr("Please enter a chapter name");
      return;
    }
    if (!effectiveSection) {
      setErr("Please specify a section name");
      return;
    }
    const numLectures = parseInt(lectures, 10);
    onAdd({
      id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      subject,
      section: effectiveSection,
      name: name.trim(),
      defaultLectures: !isNaN(numLectures) && numLectures > 0 ? numLectures : 7,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-md" onClick={onClose}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSave}
        className="w-full max-w-md space-y-4 rounded-3xl border border-border/80 bg-card/95 p-6 shadow-elevated backdrop-blur-xl"
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display text-lg font-black text-foreground">Add Custom Chapter / Section</h3>
            <p className="text-xs text-muted-foreground font-semibold">Create a new chapter or subject section</p>
          </div>
          <Button variant="unstyled" type="button" onClick={onClose} className="rounded-full p-1.5 text-muted-foreground hover:bg-secondary">
            <X size={18} />
          </Button>
        </div>

        {err && <p className="rounded-xl border border-destructive/20 bg-destructive/10 p-2 text-xs font-bold text-destructive">{err}</p>}

        <div className="space-y-3">
          <div>
            <label className="text-[11px] font-black uppercase tracking-wider text-muted-foreground block mb-1">Subject</label>
            <div className="grid grid-cols-3 gap-2">
              {["Maths", "Reasoning", "GS"].map((s) => (
                <Button
                  key={s}
                  type="button"
                  variant="unstyled"
                  onClick={() => setSubject(s)}
                  className={cn(
                    "rounded-xl border py-2 text-xs font-black transition active:scale-95 text-center",
                    subject.toLowerCase() === s.toLowerCase()
                      ? "border-primary bg-primary text-primary-foreground shadow-xs shadow-primary/30"
                      : "border-border/80 bg-secondary/50 text-muted-foreground hover:text-foreground"
                  )}
                >
                  {s}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[11px] font-black uppercase tracking-wider text-muted-foreground block mb-1">Section</label>
            {existingSections.length > 0 && (
              <select
                value={section}
                onChange={(e) => {
                  setSection(e.target.value);
                  setCustomSection("");
                }}
                className="w-full mb-1.5 rounded-xl border border-input bg-background/90 px-3 py-2 text-xs font-bold outline-none focus:border-primary"
              >
                {existingSections.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            )}
            <input
              value={customSection}
              onChange={(e) => setCustomSection(e.target.value)}
              placeholder="Or type a brand new section name..."
              className="w-full rounded-xl border border-input bg-background/90 px-3 py-2 text-xs font-semibold outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="text-[11px] font-black uppercase tracking-wider text-muted-foreground block mb-1">Chapter Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Percentage Part 2, Trigonometry Heights..."
              className="w-full rounded-xl border border-input bg-background/90 px-3.5 py-2.5 text-xs font-bold outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="text-[11px] font-black uppercase tracking-wider text-muted-foreground block mb-1">Total Lectures Planned</label>
            <input
              type="number"
              min={1}
              max={100}
              value={lectures}
              onChange={(e) => setLectures(e.target.value)}
              className="w-full rounded-xl border border-input bg-background/90 px-3.5 py-2.5 text-xs font-bold outline-none focus:border-primary"
            />
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button variant="unstyled" type="button" onClick={onClose} className="flex-1 rounded-2xl border border-border bg-secondary/60 py-2.5 text-xs font-bold active:scale-95">
            Cancel
          </Button>
          <Button variant="unstyled" type="submit" className="flex-1 rounded-2xl bg-gradient-to-r from-primary to-accent py-2.5 text-xs font-black text-primary-foreground shadow-md shadow-primary/25 active:scale-95">
            Save Chapter
          </Button>
        </div>
      </form>
    </div>
  );
}

function Syllabus({ data, update, all, auth }: { data: UserData; update: Upd; all: Record<string, UserData>; auth: Auth }) {
  const chapterAllQuizzes = useChapterAllQuizzesMap();
  const chapterWeakQuestions = useChapterWeakQuestionsMap(auth.username);
  const { search, change } = useWorkspaceNavigation();
  const subj = search.subject ?? 0;
  const setSubj = (subject: number) => change({ subject });
  const [openSec, setOpenSec] = useState<string | null>(() => SYLLABUS[0]?.sections[0]?.name ?? null);
  const [expandedChapter, setExpandedChapter] = useState<string | null>(null);
  const [activePracticeQuiz, setActivePracticeQuiz] = useState<{ quiz: any; questions?: any[] } | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingLectureChapter, setEditingLectureChapter] = useState<string | null>(null);
  const [customTotalInput, setCustomTotalInput] = useState("");

  const S = SYLLABUS[subj] ?? SYLLABUS[0];

  // Merge default sections with custom chapters for this subject
  const sections = useMemo(() => {
    if (!S) return [];
    const list: Array<{ name: string; chapters: string[] }> = S.sections.map((s) => ({
      name: s.name,
      chapters: [...s.chapters],
    }));
    const customForSubj = (data.customChapters ?? []).filter(
      (cc) => cc.subject.toLowerCase() === S.subject.toLowerCase()
    );
    for (const cc of customForSubj) {
      let sec = list.find((s) => s.name.toLowerCase() === cc.section.toLowerCase());
      if (!sec) {
        sec = { name: cc.section, chapters: [] };
        list.push(sec);
      }
      if (!sec.chapters.includes(cc.name)) {
        sec.chapters.push(cc.name);
      }
    }
    return list;
  }, [S, data.customChapters]);

  const allSectionsExisting = useMemo(() => sections.map((s) => s.name), [sections]);

  return (
    <div className="space-y-4">
      {/* Practice Modal for Weak Questions */}
      {activePracticeQuiz && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-background/95 p-4 sm:p-6 backdrop-blur-xl">
          <div className="max-w-2xl mx-auto space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <Button
                variant="unstyled"
                onClick={() => setActivePracticeQuiz(null)}
                className="inline-flex items-center gap-1.5 text-xs font-black text-muted-foreground hover:text-foreground active:scale-95"
              >
                ← Exit Practice
              </Button>
              <span className="text-xs font-black text-amber-500 bg-amber-500/15 border border-amber-500/30 px-3 py-1 rounded-full flex items-center gap-1.5">
                <RotateCcw size={12} strokeWidth={2.5} /> Weak Questions Practice Mode
              </span>
            </div>

            <QuizPlayer
              quiz={activePracticeQuiz.quiz}
              questions={activePracticeQuiz.questions}
              onDone={() => setActivePracticeQuiz(null)}
            />
          </div>
        </div>
      )}

      {/* Add Custom Chapter Modal */}
      {showAddModal && (
        <AddChapterModal
          initialSubject={S?.subject || "Maths"}
          existingSections={allSectionsExisting}
          onClose={() => setShowAddModal(false)}
          onAdd={(chap) => {
            update((d) => {
              d.customChapters = [...(d.customChapters ?? []), chap];
              const k = chapterKey(chap.section, chap.name);
              d.chapters[k] = {
                ...(d.chapters[k] ?? {}),
                totalLectures: chap.defaultLectures || 7,
                lecturesDone: 0,
              };
              return d;
            });
            setShowAddModal(false);
          }}
        />
      )}

      <div className="flex items-center justify-between gap-2">
        <Hint title="Syllabus & Quiz Mastery" subtitle="Track lectures, revisions, multiple quizzes & weak questions" />
        <Button
          variant="unstyled"
          onClick={() => setShowAddModal(true)}
          className="shrink-0 rounded-2xl bg-primary/15 border border-primary/30 px-3 py-2 text-xs font-black text-primary hover:bg-primary/25 active:scale-95 flex items-center gap-1.5 shadow-2xs"
        >
          <Plus size={14} strokeWidth={2.5} />
          <span>Add Chapter</span>
        </Button>
      </div>

      {/* Subject Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none -mx-1 px-1">
        {SYLLABUS.map((x, i) => {
          const customForSubj = (data.customChapters ?? []).filter((cc) => cc.subject.toLowerCase() === x.subject.toLowerCase());
          const totalChapters = x.sections.reduce((n, s) => n + s.chapters.length, 0) + customForSubj.length;
          let doneChapters = 0;
          for (const s of x.sections) {
            for (const c of s.chapters) {
              const st = data.chapters[chapterKey(s.name, c)];
              if (st?.lecture || (st?.lecturesDone && st?.totalLectures && st.lecturesDone >= st.totalLectures)) {
                doneChapters++;
              }
            }
          }
          for (const cc of customForSubj) {
            const st = data.chapters[chapterKey(cc.section, cc.name)];
            if (st?.lecture || (st?.lecturesDone && st?.totalLectures && st.lecturesDone >= st.totalLectures)) {
              doneChapters++;
            }
          }
          const pct = Math.round((doneChapters / (totalChapters || 1)) * 100);
          const active = subj === i;
          return (
            <Button
              variant="unstyled"
              aria-pressed={active}
              key={x.subject}
              onClick={() => {
                setSubj(i);
                setOpenSec(x.sections[0]?.name ?? null);
              }}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-2xl border px-3.5 py-2.5 text-xs font-black transition active:scale-95 shadow-soft",
                active
                  ? "border-primary bg-primary text-primary-foreground shadow-md shadow-primary/25"
                  : "border-border/80 bg-card text-muted-foreground hover:text-foreground"
              )}
            >
              <span>{x.subject}</span>
              <span className={cn("text-[10px] font-black px-1.5 py-0.5 rounded-full tabular-nums", active ? "bg-white/20 text-white" : "bg-primary/10 text-primary")}>
                {doneChapters}/{totalChapters} · {pct}%
              </span>
            </Button>
          );
        })}
      </div>

      {/* Sections Accordion */}
      <div className="space-y-3">
        {sections.map((sec) => {
          let secDone = 0;
          let secQuizTotal = 0;
          for (const c of sec.chapters) {
            const k = chapterKey(sec.name, c);
            const st = data.chapters[k];
            if (st?.lecture || (st?.lecturesDone && st?.totalLectures && st.lecturesDone >= st.totalLectures)) {
              secDone++;
            }
            if ((chapterAllQuizzes[k]?.length ?? 0) > 0) {
              secQuizTotal += chapterAllQuizzes[k].length;
            }
          }
          const isOpen = openSec === sec.name;

          return (
            <div key={sec.name} className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-soft">
              <Button
                variant="unstyled"
                aria-expanded={isOpen}
                onClick={() => setOpenSec(isOpen ? null : sec.name)}
                className="flex w-full items-center justify-between p-4 text-left transition hover:bg-secondary/30"
              >
                <div className="min-w-0 flex-1 pr-3">
                  <div className="flex items-center gap-2">
                    <p className="font-display font-black text-sm text-foreground">{sec.name}</p>
                    {secQuizTotal > 0 && (
                      <span className="rounded-full bg-accent/15 border border-accent/25 text-accent text-[10px] font-black px-2 py-0.5 shrink-0">
                        🎯 {secQuizTotal}Q
                      </span>
                    )}
                  </div>
                  <div className="mt-2 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${(secDone / (sec.chapters.length || 1)) * 100}%` }}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-black text-muted-foreground tabular-nums">
                    {secDone}/{sec.chapters.length}
                  </span>
                  <span className={cn("text-xs transition-transform duration-200 text-muted-foreground", isOpen && "rotate-180")}>
                    ⌄
                  </span>
                </div>
              </Button>

              {isOpen && (
                <div className="divide-y divide-border/60 border-t border-border/60 bg-secondary/15">
                  {sec.chapters.map((c) => {
                    const k = chapterKey(sec.name, c);
                    const st = data.chapters[k] ?? {};
                    const quizzes = chapterAllQuizzes[k] ?? [];
                    const weakQs = chapterWeakQuestions[k] ?? [];
                    const totalLectures = st.totalLectures ?? 7;
                    const lecturesDone = st.lecturesDone ?? (st.lecture ? totalLectures : 0);
                    const revCount = st.revisionCount ?? (st.revised ? 1 : 0);
                    const lecturePct = Math.min(100, Math.round((lecturesDone / (totalLectures || 1)) * 100));
                    const isExpanded = expandedChapter === k;

                    const set = (patch: Partial<ChapterState>) =>
                      update((d) => {
                        d.chapters[k] = { ...(d.chapters[k] ?? {}), ...patch };
                        return d;
                      });

                    const cycleRevision = () => {
                      const next = (revCount + 1) % 4;
                      set({
                        revisionCount: next,
                        revised: next > 0,
                      });
                    };

                    const incLectures = () => {
                      const next = Math.min(totalLectures + 15, lecturesDone + 1);
                      set({
                        lecturesDone: next,
                        lecture: next >= totalLectures,
                        totalLectures,
                      });
                    };

                    const decLectures = () => {
                      const next = Math.max(0, lecturesDone - 1);
                      set({
                        lecturesDone: next,
                        lecture: next >= totalLectures && totalLectures > 0,
                        totalLectures,
                      });
                    };

                    return (
                      <div key={c} className="p-4 space-y-3 transition-colors hover:bg-secondary/25">
                        {/* Header Row: Title & Revision Status */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-display font-extrabold text-sm text-foreground leading-snug">{c}</p>
                              {quizzes.length > 0 && (
                                <span className="rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black px-2 py-0.5 shrink-0">
                                  {quizzes.length} {quizzes.length === 1 ? "Quiz" : "Quizzes"}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] font-semibold text-muted-foreground mt-0.5">{sec.name}</p>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {/* Revision Cycle Button */}
                            <Button
                              variant="unstyled"
                              onClick={cycleRevision}
                              title="Click to cycle revision status (Not Revised -> 1x -> 2x -> Mastered)"
                              className={cn(
                                "rounded-xl border px-2.5 py-1 text-[11px] font-black transition active:scale-95 flex items-center gap-1 shadow-2xs",
                                revCount === 0
                                  ? "border-border/80 bg-card text-muted-foreground hover:text-foreground"
                                  : revCount === 1
                                  ? "border-amber-500/50 bg-amber-500/15 text-amber-500"
                                  : revCount === 2
                                  ? "border-blue-500/50 bg-blue-500/15 text-blue-400"
                                  : "border-emerald-500/60 bg-emerald-500/20 text-emerald-400"
                              )}
                            >
                              <span>{revCount === 0 ? "⚪" : revCount === 1 ? "🟡" : revCount === 2 ? "🔵" : "⭐"}</span>
                              <span>{revCount === 0 ? "Not Revised" : revCount === 1 ? "Rev 1x" : revCount === 2 ? "Rev 2x" : "Mastered"}</span>
                            </Button>

                            <Button
                              variant="unstyled"
                              onClick={() => setExpandedChapter(isExpanded ? null : k)}
                              className="h-7 w-7 rounded-lg border border-border/60 bg-card text-muted-foreground flex items-center justify-center hover:text-foreground active:scale-95"
                            >
                              <ChevronRight size={14} className={cn("transition-transform duration-200", isExpanded && "rotate-90")} />
                            </Button>
                          </div>
                        </div>

                        {/* Interactive Lectures Management Row */}
                        <div className="rounded-2xl border border-border/70 bg-card/70 p-3 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] font-bold text-muted-foreground flex items-center gap-1">
                              <span>📚 Lectures:</span>
                              <span className="text-foreground font-black tabular-nums">{lecturesDone}/{totalLectures} Done</span>
                            </span>

                            <div className="flex items-center gap-1.5">
                              <Button
                                variant="unstyled"
                                onClick={decLectures}
                                disabled={lecturesDone <= 0}
                                className="h-7 w-7 rounded-xl border border-border bg-secondary flex items-center justify-center text-foreground font-black active:scale-90 disabled:opacity-40"
                                title="Decrement lecture"
                              >
                                <Minus size={13} strokeWidth={2.5} />
                              </Button>

                              {editingLectureChapter === k ? (
                                <div className="flex items-center gap-1">
                                  <input
                                    type="number"
                                    min={1}
                                    max={100}
                                    value={customTotalInput}
                                    onChange={(e) => setCustomTotalInput(e.target.value)}
                                    placeholder={String(totalLectures)}
                                    className="h-7 w-12 rounded-lg border border-primary bg-background px-1 text-center text-xs font-black outline-none"
                                  />
                                  <Button
                                    variant="unstyled"
                                    onClick={() => {
                                      const val = parseInt(customTotalInput, 10);
                                      if (!isNaN(val) && val > 0) {
                                        set({ totalLectures: val });
                                      }
                                      setEditingLectureChapter(null);
                                    }}
                                    className="h-7 px-2 rounded-lg bg-primary text-primary-foreground text-[10px] font-black"
                                  >
                                    Save
                                  </Button>
                                </div>
                              ) : (
                                <Button
                                  variant="unstyled"
                                  onClick={() => {
                                    setCustomTotalInput(String(totalLectures));
                                    setEditingLectureChapter(k);
                                  }}
                                  title="Click to edit total lectures"
                                  className="h-7 px-2.5 rounded-xl border border-border/80 bg-secondary/60 text-xs font-black text-foreground flex items-center gap-1 active:scale-95"
                                >
                                  <span className="tabular-nums">{lecturesDone} / {totalLectures}</span>
                                  <Pencil size={10} className="text-muted-foreground" />
                                </Button>
                              )}

                              <Button
                                variant="unstyled"
                                onClick={incLectures}
                                className="h-7 w-7 rounded-xl border border-border bg-secondary flex items-center justify-center text-foreground font-black active:scale-90"
                                title="Increment lecture"
                              >
                                <Plus size={13} strokeWidth={2.5} />
                              </Button>

                              {lecturesDone < totalLectures ? (
                                <Button
                                  variant="unstyled"
                                  onClick={() => set({ lecturesDone: totalLectures, lecture: true, totalLectures })}
                                  className="h-7 px-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 text-emerald-400 text-[10px] font-black active:scale-95 ml-1"
                                >
                                  ✓ All Done
                                </Button>
                              ) : (
                                <span className="rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-black text-emerald-400 ml-1">
                                  ✓ Complete
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Lecture Progress Bar */}
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                            <div
                              className={cn("h-full rounded-full transition-all duration-300", lecturePct >= 100 ? "bg-emerald-500" : "bg-primary")}
                              style={{ width: `${lecturePct}%` }}
                            />
                          </div>
                        </div>

                        {/* Multiple Quizzes List for this Chapter */}
                        <div className="rounded-2xl border border-border/70 bg-card/60 p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                              <span>🎯 Chapter Quizzes ({quizzes.length})</span>
                            </span>
                            {auth.username === "arun" && (
                              <Button
                                variant="unstyled"
                                onClick={() => change({ tab: "quiz", chapter: k })}
                                className="text-[10px] font-black text-primary hover:underline flex items-center gap-1"
                              >
                                <Plus size={12} /> Add Quiz
                              </Button>
                            )}
                          </div>

                          {quizzes.length > 0 ? (
                            <div className="space-y-1.5">
                              {quizzes.map((qz, qIdx) => (
                                <div
                                  key={qz.id}
                                  className="flex items-center justify-between gap-2 rounded-xl border border-border/60 bg-secondary/30 p-2.5 transition hover:bg-secondary/60"
                                >
                                  <div className="min-w-0 flex-1">
                                    <p className="text-xs font-bold text-foreground truncate">
                                      {qz.title || `Quiz ${qIdx + 1}`}
                                    </p>
                                    <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground font-semibold">
                                      <span>{qz.count} Questions</span>
                                      {qz.score ? (
                                        <span className={cn(
                                          "font-black px-1.5 py-0.2 rounded-full",
                                          qz.score.pct >= 70 ? "bg-emerald-500/15 text-emerald-400" : "bg-amber-500/15 text-amber-500"
                                        )}>
                                          Score: {qz.score.score}/{qz.score.total} ({qz.score.pct}%)
                                        </span>
                                      ) : (
                                        <span className="text-muted-foreground/80">Not Attempted</span>
                                      )}
                                    </div>
                                  </div>

                                  <Button
                                    variant="unstyled"
                                    onClick={() => change({ tab: "quiz", quizId: qz.id })}
                                    className="shrink-0 rounded-xl bg-gradient-to-r from-primary to-accent px-3 py-1.5 text-xs font-black text-primary-foreground shadow-xs shadow-primary/20 active:scale-95 flex items-center gap-1"
                                  >
                                    <Play size={11} fill="currentColor" />
                                    <span>{qz.score ? "Retake" : "Start"}</span>
                                  </Button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="rounded-xl border border-dashed border-border/60 p-2.5 text-center text-xs text-muted-foreground font-medium">
                              No quizzes uploaded for this chapter yet.
                            </div>
                          )}
                        </div>

                        {/* Weak / Missed Questions Section */}
                        {weakQs.length > 0 && (
                          <div className="rounded-2xl border border-amber-500/40 bg-amber-500/8 p-3 space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="text-amber-500 font-black text-sm">⚠️</span>
                                <div>
                                  <p className="text-xs font-extrabold text-foreground">
                                    {weakQs.length} Weak / Missed Question{weakQs.length > 1 ? "s" : ""}
                                  </p>
                                  <p className="text-[10px] text-muted-foreground font-medium">Solve your mistake bank to master this chapter</p>
                                </div>
                              </div>

                              <Button
                                variant="unstyled"
                                onClick={() => {
                                  setActivePracticeQuiz({
                                    quiz: {
                                      id: `weak-${k}`,
                                      title: `${c} - Missed Questions Re-attempt`,
                                      chapter: k,
                                      questions: weakQs,
                                    },
                                    questions: weakQs,
                                  });
                                }}
                                className="rounded-xl border border-amber-500/50 bg-amber-500/20 px-3 py-1.5 text-xs font-black text-amber-400 transition active:scale-95 shadow-xs flex items-center gap-1 shrink-0"
                              >
                                <RotateCcw size={12} strokeWidth={2.5} />
                                <span>Re-attempt</span>
                              </Button>
                            </div>
                          </div>
                        )}

                        {/* Expanded Extra Controls: PYQ, Marks & Notes */}
                        {isExpanded && (
                          <div className="space-y-2 pt-1 border-t border-border/50">
                            <div className="flex flex-wrap items-center gap-2">
                              <Button
                                variant="unstyled"
                                onClick={() => set({ pyq: !st.pyq })}
                                className={cn(
                                  "h-8 rounded-xl border px-3 text-xs font-black transition active:scale-95 flex items-center gap-1.5",
                                  st.pyq ? "border-accent bg-accent text-accent-foreground shadow-2xs" : "border-border/80 bg-card text-muted-foreground"
                                )}
                              >
                                {st.pyq && <Check size={12} strokeWidth={3} />}
                                <span>PYQs Practiced</span>
                              </Button>

                              {st.pyq && (
                                <input
                                  value={st.marks ?? ""}
                                  onChange={(e) => set({ marks: e.target.value })}
                                  placeholder="PYQ Marks (e.g. 20/25)"
                                  className="h-8 w-36 rounded-xl border border-input bg-card px-2.5 text-xs font-semibold outline-none focus:border-primary"
                                />
                              )}
                            </div>

                            <input
                              value={st.notes ?? ""}
                              onChange={(e) => set({ notes: e.target.value })}
                              placeholder="Chapter notes / formula tips (e.g. revise ratio method)..."
                              className="w-full h-8 rounded-xl border border-input bg-card px-3 text-xs font-medium outline-none focus:border-primary"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const CA_CATS = ["National", "International", "Economy", "Sports", "Sci & Tech", "Awards", "Schemes", "Defence"];

function weekLabel(d = new Date()) {
  const x = new Date(d); x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return `Week of ${x.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`;
}

function Extras({ data, update, all, who, targetQuizId }: { data: UserData; update: Upd; all: Record<string, UserData>; who: string; targetQuizId?: string }) {
  const { search, change } = useWorkspaceNavigation();
  const view = search.practice === "quiz" || search.practice === "mock" || search.practice === "tests" ? "pyq" : search.practice ?? "pyq";
  const setView = (practice: "pyq" | "ca" | "tables" | "vocab" | "idioms") => change({ practice });
  return (
    <div className="space-y-4">
      <Hint title="Practice Hub" subtitle="High-yield SSC preparation tools, vocab, tests & maths" />
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none -mx-1 px-1">
        {([
          ["pyq", FileText, "PYQ Tests"],
          ["vocab", Type, "BlackBook Vocab"],
          ["idioms", MessageSquare, "Idioms (200+)"],
          ["tables", Hash, "Maths Speed"],
          ["ca", Newspaper, "Current Affairs"],
        ] as const).map(([k, Icon, l]) => (
          <Button
            variant="unstyled"
            aria-pressed={view === k}
            key={k}
            onClick={() => setView(k)}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-2xl border px-3.5 py-2.5 text-xs font-extrabold transition shadow-2xs active:scale-95",
              view === k
                ? "border-primary bg-primary text-primary-foreground shadow-sm shadow-primary/25"
                : "border-border/80 bg-card text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
            )}
          >
            <Icon size={16} strokeWidth={view === k ? 2.5 : 2} />
            <span>{l}</span>
          </Button>
        ))}
      </div>
      {view === "pyq" ? (
        <PYQPracticeZone who={who} targetQuizId={targetQuizId} />
      ) : view === "ca" ? (
        <CAZone data={data} update={update} all={all} who={who} />
      ) : view === "tables" ? (
        <MathPracticeZone data={data} update={update} all={all} />
      ) : view === "idioms" ? (
        <BlackBookVocabZone data={data} update={update} all={all} who={who} initialMode="idioms" />
      ) : (
        <BlackBookVocabZone data={data} update={update} all={all} who={who} initialMode="words" />
      )}
    </div>
  );
}

type CAD = { id: string; category: string; title: string; fact: string; trick: string; quiz?: { q: string; options: string[]; answer: number } };

function CAUpload({ onDone }: { onDone: () => void }) {
  const [day, setDay] = useState(() => new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10));
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const up = useServerFn(uploadDailyCA);

  const detectedCount = useMemo(() => {
    return text.split("\n").filter((l) => l.trim().length > 4).length;
  }, [text]);

  const copyChatGptPrompt = async () => {
    const prompt = `Generate the top 50 high-yield Current Affairs for SSC CGL / CHSL for this month.
Format EACH news item strictly on a single line separated by pipe symbols (|) in this format:
Category | Title | Complete Exam Fact | Short Memory Trick

Allowed categories: National, International, Economy, Sports, Defense, Science, Appointments, Awards, Schemes.

Example lines:
National | 27th RBI Governor Appointed | Sanjay Malhotra appointed as the 27th Governor of RBI succeeding Shaktikanta Das | Trick: Malhotra = Money Holding Authority
Sports | World Chess Championship 2024 | D Gukesh became the youngest World Chess Champion in Singapore | Trick: Gukesh = Genius King
Defense | Exercise Malabar 2024 | Quad nations conducted the 28th edition of Exercise Malabar in Visakhapatnam | Trick: Malabar = Quad maritime power`;

    try {
      await navigator.clipboard.writeText(prompt);
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 3000);
    } catch {}
  };

  const submit = async () => {
    if (!text.trim() || busy) return;
    setBusy(true); setMsg("");
    try {
      const a = JSON.parse(localStorage.getItem("arena-auth") ?? "{}");
      const r = await up({ data: { username: a.username ?? "", password: a.password ?? "", day, text } });
      setMsg(`✅ Successfully processed & saved ${r.count} news points for ${r.day}.`);
      setText("");
      onDone();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Upload failed.");
    }
    setBusy(false);
  };

  return (
    <div className="space-y-3 rounded-2xl border-2 border-primary/30 bg-card p-5 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-base font-black font-display text-foreground">Upload Current Affairs (Daily or Monthly)</p>
          <p className="text-xs text-muted-foreground">
            Smart parser automatically separates each news item, detects categories, and stores them in your pack.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={copyChatGptPrompt}
          className="rounded-xl border-primary/40 text-xs font-bold shrink-0 hover:bg-primary/10 shadow-2xs"
        >
          {copiedPrompt ? "✓ Prompt Copied!" : "📋 Copy ChatGPT Prompt"}
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
          <span>Target Date / Pack:</span>
          <input
            type="date"
            value={day}
            onChange={(e) => setDay(e.target.value)}
            className="rounded-xl border-2 border-border/80 bg-background px-3 py-1.5 text-xs font-semibold outline-none focus:border-primary"
          />
        </div>
        {detectedCount > 0 && (
          <span className="rounded-full bg-primary/10 border border-primary/30 text-primary text-xs font-black px-3 py-1">
            {detectedCount} Items Detected
          </span>
        )}
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={7}
        placeholder={`Paste your ChatGPT / text notes here. Supports multiple formats:
1. Pipe Format: Category | Title | Fact | Memory Trick
2. Markdown Headers: ## National \n* Title: Detailed fact...
3. JSON Array: [{"category": "...", "title": "...", "fact": "..."}]`}
        className="w-full rounded-xl border-2 border-border/70 bg-secondary/30 p-3.5 text-xs font-mono leading-relaxed outline-none focus:border-primary"
      />

      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <Button
          variant="unstyled"
          disabled={busy || !text.trim()}
          onClick={submit}
          className="rounded-xl bg-primary px-6 py-2.5 text-xs font-bold text-primary-foreground disabled:opacity-50 shadow-md active:scale-95 transition"
        >
          {busy ? "Parsing & Saving…" : `Upload ${detectedCount ? `(${detectedCount} Points)` : "Pack"}`}
        </Button>
        {msg && <p className="text-xs font-bold text-primary animate-in fade-in">{msg}</p>}
      </div>
    </div>
  );
}

function CAZone({ data, update, all, who }: { data: UserData; update: Upd; all: Record<string, UserData>; who: string }) {
  const { search, change } = useWorkspaceNavigation();
  const tab = search.ca ?? "today";
  const setTab = (ca: "today" | "cards" | "quiz" | "week" | "notes") => change({ ca });
  const fetchCA = useServerFn(getDailyCA);
  const q = useQuery({ queryKey: ["ca-daily"], queryFn: () => fetchCA({ data: { username: "x" } }), staleTime: 30 * 60000, retry: false });
  const days = (q.data?.days ?? []) as { day: string; items: CAD[] }[];
  const todayItems = days.find((d) => d.day === q.data?.today)?.items ?? days[0]?.items ?? [];
  const weekItems = days.flatMap((d) => d.items);
  const known = new Set(data.caq.known);
  const tabs = [["today", "Today"], ["cards", "Flashcards"], ["quiz", "Quiz"], ["week", "This week"], ["notes", "My notes"]] as const;
  return (
    <div className="space-y-4">
      <Hint title="Daily Current Affairs" subtitle="High-yield exam news, flashcards & daily revision" />
      {who === "arun" && (
        <details className="group rounded-2xl border border-border/80 bg-card p-4 transition shadow-soft">
          <summary className="flex cursor-pointer items-center justify-between text-xs font-black uppercase tracking-wider text-muted-foreground hover:text-foreground">
            <span>➕ Admin: Upload Current Affairs News Pack</span>
            <span className="transition-transform group-open:rotate-180">⌄</span>
          </summary>
          <div className="pt-3">
            <CAUpload onDone={() => q.refetch()} />
          </div>
        </details>
      )}
      <div className="practice-tabs flex gap-1.5 overflow-x-auto pb-2">
        {tabs.map(([k, l]) => (
          <Button variant="unstyled" aria-pressed={tab === k} key={k} onClick={() => setTab(k)} className={cn("shrink-0 rounded-lg px-3.5 py-2 text-xs font-semibold", tab === k ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground")}>{l}</Button>
        ))}
      </div>
      {tab === "notes" ? <CurrentAffairs data={data} update={update} all={all} />
        : q.isLoading ? <p className="py-8 text-center text-sm text-muted-foreground">Loading current affairs…</p>
        : q.isError ? <p className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm">Unable to load current affairs. <Button variant="unstyled" onClick={() => q.refetch()} className="font-bold underline">Try again</Button></p>
        : <>
          {weekItems.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">No current affairs uploaded yet.</p>
            : tab === "today" ? <CAList items={todayItems} known={known} update={update} />
            : tab === "cards" ? <CACards items={weekItems.filter((c) => !known.has(c.id))} update={update} />
            : tab === "quiz" ? <CAQuiz items={todayItems} wrongPool={weekItems.filter((c) => data.caq.wrong.includes(c.id))} update={update} />
            : days.map((d) => (
              <div key={d.day} className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-normal text-muted-foreground">{new Date(d.day).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" })}</p>
                <CAList items={d.items} known={known} update={update} compact />
              </div>
            ))}
        </>}
    </div>
  );
}

function CAList({ items, known, update, compact }: { items: CAD[]; known: Set<string>; update: Upd; compact?: boolean }) {
  return (
    <div className="space-y-2.5">
      {items.map((c, i) => (
        <div key={c.id} className={cn("rounded-lg border p-3.5", known.has(c.id) ? "border-primary/40 bg-primary/5" : "border-border bg-card")}>
          <div className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase">
            <span className="rounded bg-secondary px-1.5 py-0.5">{i + 1}</span>
            <span className="rounded bg-accent/20 px-1.5 py-0.5 text-accent">{c.category}</span>
          </div>
          <p className="font-semibold">{c.title}</p>
          <p className="mt-1 text-sm">{c.fact}</p>
          {!compact && c.trick ? <p className="mt-2 rounded-lg bg-accent/10 px-3 py-2 text-sm"> <b>Trick:</b> {c.trick}</p> : null}
          <Button variant="unstyled" onClick={() => update((d) => { const s = new Set(d.caq.known); s.has(c.id) ? s.delete(c.id) : s.add(c.id); d.caq.known = [...s]; return d; })}
            className={cn("mt-2 rounded-full px-3 py-1.5 text-xs font-bold", known.has(c.id) ? "bg-primary text-primary-foreground" : "bg-secondary")}>
            {known.has(c.id) ? "✓ Memorised" : "Mark as memorised"}
          </Button>
        </div>
      ))}
    </div>
  );
}

function CACards({ items, update }: { items: CAD[]; update: Upd }) {
  const [i, setI] = useState(0);
  const [flip, setFlip] = useState(false);
  if (!items.length) return <p className="py-8 text-center text-sm text-muted-foreground">All available flashcards have been memorised.</p>;
  const c = items[i % items.length];
  const next = () => { setFlip(false); setI((x) => (x + 1) % Math.max(1, items.length)); };
  return (
    <div className="space-y-3">
      <p className="text-center text-xs text-muted-foreground">{items.length} cards remaining</p>
      <Button variant="unstyled" onClick={() => setFlip(!flip)} className="flex min-h-56 w-full flex-col items-center justify-center rounded-lg border-2 border-primary/40 bg-card p-6 text-center">
        <span className="mb-2 rounded bg-accent/20 px-2 py-0.5 text-[10px] font-bold uppercase text-accent">{c.category}</span>
        {!flip ? <p className="text-lg font-bold">{c.quiz ? c.quiz.q : c.title}</p> : <>
          <p className="text-lg font-bold text-primary">{c.quiz ? c.quiz.options[c.quiz.answer] : c.title}</p>
          <p className="mt-2 text-sm">{c.fact}</p>
          {c.trick ? <p className="mt-2 text-sm"> {c.trick}</p> : null}
        </>}
      </Button>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="unstyled" onClick={next} className="rounded-lg bg-secondary py-3 text-sm font-bold">Review later</Button>
        <Button variant="unstyled" onClick={() => { update((d) => { d.caq.known = [...new Set([...d.caq.known, c.id])]; return d; }); setFlip(false); }} className="rounded-lg bg-primary py-3 text-sm font-bold text-primary-foreground">✓ Memorised</Button>
      </div>
    </div>
  );
}

function CAQuiz({ items, wrongPool, update }: { items: CAD[]; wrongPool: CAD[]; update: Upd }) {
  const pool = useMemo(() => { const m = new Map<string, CAD>(); [...wrongPool, ...items].forEach((c) => { if (c.quiz) m.set(c.id, c); }); return [...m.values()]; }, [items, wrongPool]);
  const [i, setI] = useState(0);
  const [pick, setPick] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  if (!pool.length) return <p className="py-8 text-center text-sm text-muted-foreground">No quiz available yet.</p>;
  if (i >= pool.length) return (
    <div className="space-y-3 rounded-lg border border-border bg-card p-6 text-center">
      <p className="font-display text-4xl font-extrabold">{score}/{pool.length}</p>
      <p className="text-sm text-muted-foreground">{score === pool.length ? "All answers are correct." : "Missed questions will be included in your next attempt."}</p>
      <Button variant="unstyled" onClick={() => { setI(0); setPick(null); setScore(0); }} className="rounded-full bg-primary px-5 py-2 text-sm font-bold text-primary-foreground">Try again</Button>
    </div>
  );
  const c = pool[i];
  const cq = c.quiz!;
  const choose = (k: number) => {
    if (pick !== null) return;
    setPick(k);
    const ok = k === cq.answer;
    if (ok) setScore((s) => s + 1);
    update((d) => { const w = new Set(d.caq.wrong); ok ? w.delete(c.id) : w.add(c.id); d.caq.wrong = [...w]; return d; });
  };
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">Question {i + 1}/{pool.length}{wrongPool.some((w) => w.id === c.id) ? " · Review question" : ""}</p>
      <p className="font-semibold">{cq.q}</p>
      <div className="space-y-2">
        {cq.options.map((o, k) => (
          <Button variant="unstyled" key={k} onClick={() => choose(k)} className={cn("w-full rounded-lg border px-4 py-3 text-left text-sm",
            pick === null ? "border-border bg-card" : k === cq.answer ? "border-primary bg-primary/15" : k === pick ? "border-destructive bg-destructive/15" : "border-border bg-card opacity-60")}>{o}</Button>
        ))}
      </div>
      {pick !== null && <>
        <p className="rounded-lg bg-accent/10 px-3 py-2 text-sm">{c.fact}{c.trick ? <><br /> {c.trick}</> : null}</p>
        <Button variant="unstyled" onClick={() => { setI(i + 1); setPick(null); }} className="w-full rounded-lg bg-primary py-3 text-sm font-bold text-primary-foreground">Next →</Button>
      </>}
    </div>
  );
}

function CurrentAffairs({ data, update, all }: { data: UserData; update: Upd; all: Record<string, UserData> }) {
  const [cat, setCat] = useState(CA_CATS[0]);
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [feed, setFeed] = useState<"mine" | "all">("mine");
  const [filter, setFilter] = useState("All");
  const wk = weekLabel();
  const items: (CAItem & { by: string })[] = (feed === "mine" ? [["me", data] as const] : USERS.map((u) => [u, all[u]] as const))
    .flatMap(([u, d]) => d.ca.map((c) => ({ ...c, by: u })))
    .filter((c) => filter === "All" || c.category === filter)
    .sort((a, b) => b.id.localeCompare(a.id));
  const grouped = items.reduce<Record<string, typeof items>>((a, c) => ((a[c.week] ??= []).push(c), a), {});
  const thisWeek = data.ca.filter((c) => c.week === wk).length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2 text-center">
        <Stat label="This week" value={thisWeek} />
        <Stat label="Total notes" value={data.ca.length} />
        <Stat label="Revised" value={data.ca.filter((c) => c.revised).length} />
      </div>
      <form className="space-y-2 rounded-lg border border-border bg-card p-4"
        onSubmit={(e) => {
          e.preventDefault(); if (!title.trim()) return;
          update((d) => { d.ca.push({ id: String(Date.now()), week: wk, category: cat, title: title.trim(), note: note.trim(), revised: false }); return d; });
          setTitle(""); setNote("");
        }}>
        <p className="font-display font-bold">+ Add news · <span className="text-muted-foreground">{wk}</span></p>
        <div className="flex flex-wrap gap-1.5">
          {CA_CATS.map((c) => (
            <Button variant="unstyled" type="button" key={c} onClick={() => setCat(c)} className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", cat === c ? "bg-accent text-accent-foreground" : "bg-secondary text-muted-foreground")}>{c}</Button>
          ))}
        </div>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Headline (e.g. RBI repo rate 6.25%)" className="w-full rounded-lg border border-input bg-secondary px-3 py-2.5 text-sm outline-none focus:border-primary" />
        <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Key facts / exam points" rows={2} className="w-full rounded-lg border border-input bg-secondary px-3 py-2.5 text-sm outline-none focus:border-primary" />
        <Button variant="unstyled" className="w-full rounded-lg bg-primary py-2.5 text-sm font-bold text-primary-foreground">Save note (+3 pts)</Button>
      </form>

      <div className="flex items-center gap-2">
        <div className="flex rounded-full bg-secondary p-1 text-xs font-bold">
          <Button variant="unstyled" onClick={() => setFeed("mine")} className={cn("rounded-full px-3 py-1", feed === "mine" && "bg-primary text-primary-foreground")}>Mine</Button>
          <Button variant="unstyled" onClick={() => setFeed("all")} className={cn("rounded-full px-3 py-1", feed === "all" && "bg-primary text-primary-foreground")}>All players</Button>
        </div>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="ml-auto rounded-full bg-secondary px-3 py-1.5 text-xs">
          {["All", ...CA_CATS].map((c) => <option key={c}>{c}</option>)}
        </select>
      </div>

      {Object.keys(grouped).length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No notes yet.</p>}
      {Object.entries(grouped).map(([w, list]) => (
        <div key={w} className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-normal text-muted-foreground">{w}</p>
          {list.map((c) => (
            <div key={c.by + c.id} className="rounded-lg border border-border bg-card p-3.5">
              <div className="flex items-start gap-2">
                <div className="flex-1">
                  <div className="mb-1 flex gap-1.5 text-[10px] font-bold uppercase">
                    <span className="rounded bg-accent/20 px-1.5 py-0.5 text-accent">{c.category}</span>
                    {feed === "all" && <span className="rounded bg-secondary px-1.5 py-0.5">{cap(c.by)}</span>}
                  </div>
                  <p className="font-semibold">{c.title}</p>
                  {c.note && <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{c.note}</p>}
                </div>
                {feed === "mine" && (
                  <div className="flex flex-col gap-1">
                    <Button variant="unstyled" onClick={() => update((d) => { const x = d.ca.find((y) => y.id === c.id); if (x) x.revised = !x.revised; return d; })}
                      className={cn("rounded-full px-2.5 py-1 text-[11px] font-bold", c.revised ? "bg-primary text-primary-foreground" : "bg-secondary")}>{c.revised ? "✓ Rev" : "Revise"}</Button>
                    <Button variant="unstyled" onClick={() => update((d) => { d.ca = d.ca.filter((y) => y.id !== c.id); return d; })} className="text-[11px] text-muted-foreground">Delete</Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function Tables({ data, update, all }: { data: UserData; update: Upd; all: Record<string, UserData> }) {
  const rows = [["table", "Tables", 40], ["square", "Squares", 50], ["cube", "Cubes", 30]] as const;
  return (
    <div className="space-y-3">
      {rows.map(([k, label, max]) => (
        <div key={k} className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <p className="font-display font-bold">{label}</p>
            <p className="text-sm text-muted-foreground">Memorised up to: <span className="font-display text-2xl font-extrabold text-primary">{data.tables[k]}</span></p>
          </div>
          <input type="range" min={0} max={max} value={data.tables[k]} className="mt-3 w-full accent-[var(--color-primary)]"
            onChange={(e) => { const v = +e.target.value; update((d) => { d.tables[k] = v; return d; }); }} />
          <div className="mt-3 space-y-1.5">
            {USERS.map((u) => (
              <div key={u} className="flex items-center gap-2 text-xs">
                <span className="w-16 font-semibold">{cap(u)}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-accent" style={{ width: `${(all[u].tables[k] / max) * 100}%` }} />
                </div>
                <span className="w-8 text-right text-muted-foreground">{all[u].tables[k]}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="study-stat">
      <p className="font-display text-xl font-extrabold">{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}

const MEDAL = ["01", "02", "03"];

function Arena({
  board,
  me,
  onView,
  auth,
  all,
}: {
  board: Entry[];
  me: string;
  onView: (u: string) => void;
  auth: Auth;
  all: Record<string, UserData>;
}) {
  const playerQuizStats = useAllPlayerQuizStats();
  const [rival, setRival] = useState<string>(() => {
    const others = USERS.filter((u) => u !== me);
    return others[0] || USERS[0];
  });

  // Calculate pure quiz & chapter-mastery ranking
  const enriched = useMemo(() => {
    const list = USERS.map((u) => {
      const qs = playerQuizStats[u] ?? { totalScore: 0, totalPossible: 0, attemptsCount: 0, accuracy: 0 };
      const uData = all[u] ?? ({} as UserData);
      const chList = Object.values(uData.chapters ?? {});
      const masteredCount = chList.filter((c) => (c.revisionCount && c.revisionCount >= 1) || c.revised).length;
      const totalLectures = chList.reduce((acc, c) => acc + (c.lecturesDone || (c.lecture ? (c.totalLectures || 7) : 0)), 0);

      let mathsDone = 0;
      let reasoningDone = 0;
      let gsDone = 0;
      for (const [k, c] of Object.entries(uData.chapters ?? {})) {
        const isDone = c.lecture || (c.lecturesDone && c.totalLectures && c.lecturesDone >= c.totalLectures);
        if (!isDone) continue;
        const lowerKey = k.toLowerCase();
        if (lowerKey.includes("arithmetic") || lowerKey.includes("advance") || lowerKey.includes("algebra") || lowerKey.includes("geometry")) {
          mathsDone++;
        } else if (lowerKey.includes("verbal") || lowerKey.includes("non-verbal") || lowerKey.includes("reasoning")) {
          reasoningDone++;
        } else {
          gsDone++;
        }
      }

      // Pure Quiz & Mastery Score
      const points = (qs.totalScore * 10) + (masteredCount * 20) + (totalLectures * 5);

      return {
        u,
        score: points,
        quizScore: qs.totalScore,
        quizPossible: qs.totalPossible,
        quizzesAttempted: qs.attemptsCount,
        accuracy: qs.accuracy,
        masteredCount,
        totalLectures,
        mathsDone,
        reasoningDone,
        gsDone,
      };
    });

    list.sort((a, b) => b.score - a.score || b.quizScore - a.quizScore || b.accuracy - a.accuracy);
    let r = 0;
    return list.map((x) => ({ ...x, rank: x.score > 0 || x.quizzesAttempted > 0 ? ++r : null }));
  }, [all, playerQuizStats]);

  const first = enriched.find((b) => b.rank === 1);
  const second = enriched.find((b) => b.rank === 2);
  const third = enriched.find((b) => b.rank === 3);

  // Player comparison stats
  const playerA = enriched.find((b) => b.u === me) ?? enriched[0];
  const playerB = enriched.find((b) => b.u === rival) ?? (enriched.find((b) => b.u !== me) ?? enriched[0]);

  return (
    <div className="space-y-4">
      <Hint title="Quiz Arena & Leaderboard" subtitle="Compete purely on quiz performance, accuracy & chapter mastery" />

      {/* Top 3 Podium */}
      {enriched.some((b) => b.rank) && (
        <div className="grid grid-cols-3 gap-2 items-end pt-2 pb-1">
          {/* #2 Rank */}
          {second ? (
            <Button
              variant="unstyled"
              onClick={() => onView(second.u)}
              className="flex flex-col items-center rounded-3xl border border-slate-700 bg-card p-3 shadow-soft transition active:scale-95 text-center"
            >
              <div className="relative">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-800 text-slate-200 font-display text-lg font-black shadow-sm ring-2 ring-slate-500/40">
                  {second.u[0].toUpperCase()}
                </div>
                <span className="absolute -top-1.5 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-slate-500 text-[10px] font-black text-white shadow-xs">
                  2
                </span>
              </div>
              <p className="mt-2 font-display text-xs font-black truncate w-full text-foreground">{cap(second.u)}</p>
              <p className="text-[11px] font-black text-primary mt-0.5 tabular-nums">{second.score} pts</p>
              <div className="mt-2 w-full h-9 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-center text-[11px] font-black text-slate-300">
                🥈 2nd
              </div>
            </Button>
          ) : <div />}

          {/* #1 Rank (Center, Elevated) */}
          {first ? (
            <Button
              variant="unstyled"
              onClick={() => onView(first.u)}
              className="flex flex-col items-center rounded-3xl border-2 border-amber-500/60 bg-gradient-to-b from-amber-500/15 via-card to-card p-3.5 shadow-elevated transition active:scale-95 text-center -translate-y-2"
            >
              <div className="relative">
                <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 text-lg">👑</span>
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-300 text-white font-display text-xl font-black shadow-md ring-4 ring-amber-500/30">
                  {first.u[0].toUpperCase()}
                </div>
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-black text-white shadow-xs">
                  1
                </span>
              </div>
              <p className="mt-2 font-display text-sm font-black truncate w-full text-foreground">{cap(first.u)}</p>
              <p className="text-xs font-black text-amber-500 mt-0.5 tabular-nums">{first.score} pts</p>
              <div className="mt-2 w-full h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-xs font-black text-amber-400">
                🏆 1st
              </div>
            </Button>
          ) : <div />}

          {/* #3 Rank */}
          {third ? (
            <Button
              variant="unstyled"
              onClick={() => onView(third.u)}
              className="flex flex-col items-center rounded-3xl border border-amber-800/40 bg-card p-3 shadow-soft transition active:scale-95 text-center"
            >
              <div className="relative">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-950/50 text-amber-400 font-display text-lg font-black shadow-sm ring-2 ring-amber-700/30">
                  {third.u[0].toUpperCase()}
                </div>
                <span className="absolute -top-1.5 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-700 text-[10px] font-black text-white shadow-xs">
                  3
                </span>
              </div>
              <p className="mt-2 font-display text-xs font-black truncate w-full text-foreground">{cap(third.u)}</p>
              <p className="text-[11px] font-black text-primary mt-0.5 tabular-nums">{third.score} pts</p>
              <div className="mt-2 w-full h-8 rounded-2xl bg-amber-950/40 border border-amber-800/40 flex items-center justify-center text-[11px] font-black text-amber-500">
                🥉 3rd
              </div>
            </Button>
          ) : <div />}
        </div>
      )}

      {/* Head-to-Head Comparison Card */}
      <div className="rounded-3xl border border-border/80 bg-card p-4.5 shadow-soft space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Swords size={18} className="text-primary" />
            <h3 className="font-display font-extrabold text-sm text-foreground">Head-to-Head Battle</h3>
          </div>
          <span className="text-[11px] font-semibold text-muted-foreground">Compare Quiz Mastery</span>
        </div>

        {/* Rival Selector Pills */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-muted-foreground">Compare with:</span>
          <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
            {USERS.filter((u) => u !== me).map((u) => (
              <Button
                key={u}
                variant="unstyled"
                onClick={() => setRival(u)}
                className={cn(
                  "rounded-xl px-2.5 py-1 text-xs font-bold transition active:scale-95",
                  rival === u
                    ? "bg-primary text-primary-foreground font-black shadow-2xs"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                )}
              >
                {cap(u)}
              </Button>
            ))}
          </div>
        </div>

        {/* Side-by-Side Comparison Grid */}
        <div className="rounded-2xl border border-border/70 bg-secondary/30 p-3 space-y-2.5">
          {/* Header Row: Players */}
          <div className="grid grid-cols-3 items-center text-center font-display font-black text-xs">
            <div className="text-left text-primary flex items-center gap-1.5">
              <span className="h-6 w-6 rounded-lg bg-primary/20 flex items-center justify-center text-[10px]">
                {playerA.u[0].toUpperCase()}
              </span>
              <span>{cap(playerA.u)} (You)</span>
            </div>
            <div className="text-muted-foreground text-[10px] font-extrabold uppercase tracking-wider">Metrics</div>
            <div className="text-right text-accent flex items-center justify-end gap-1.5">
              <span>{cap(playerB.u)}</span>
              <span className="h-6 w-6 rounded-lg bg-accent/20 flex items-center justify-center text-[10px]">
                {playerB.u[0].toUpperCase()}
              </span>
            </div>
          </div>

          {/* Comparison Rows */}
          {([
            ["Total Score", `${playerA.score} pts`, `${playerB.score} pts`, playerA.score > playerB.score, playerB.score > playerA.score],
            ["Quiz Marks", `${playerA.quizScore} pts`, `${playerB.quizScore} pts`, playerA.quizScore > playerB.quizScore, playerB.quizScore > playerA.quizScore],
            ["Quizzes Taken", `${playerA.quizzesAttempted}`, `${playerB.quizzesAttempted}`, playerA.quizzesAttempted > playerB.quizzesAttempted, playerB.quizzesAttempted > playerA.quizzesAttempted],
            ["Quiz Accuracy", `${playerA.accuracy}%`, `${playerB.accuracy}%`, playerA.accuracy > playerB.accuracy, playerB.accuracy > playerA.accuracy],
            ["Chapters Mastered", `${playerA.masteredCount}`, `${playerB.masteredCount}`, playerA.masteredCount > playerB.masteredCount, playerB.masteredCount > playerA.masteredCount],
            ["Lectures Done", `${playerA.totalLectures}`, `${playerB.totalLectures}`, playerA.totalLectures > playerB.totalLectures, playerB.totalLectures > playerA.totalLectures],
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

      {/* Point Rules Pill */}
      <div className="rounded-2xl bg-secondary/70 border border-border/80 px-3.5 py-2 text-[11px] text-muted-foreground font-semibold flex items-center justify-between">
        <span className="flex items-center gap-1 font-bold text-foreground">⚡ Ranking Rules:</span>
        <span className="truncate">Quiz Marks ×10 · Chapter Mastered ×20 · Lectures ×5</span>
      </div>

      {/* Full Leaderboard Standings List */}
      <div className="space-y-2">
        {enriched.map((b) => (
          <Button
            variant="unstyled"
            key={b.u}
            onClick={() => onView(b.u)}
            className={cn(
              "flex w-full items-center gap-3 rounded-2xl border p-3.5 text-left transition shadow-soft active:scale-[0.98]",
              b.rank === 1 ? "border-amber-500/40 bg-amber-500/6" : "border-border/80 bg-card hover:border-border",
              b.u === me && "ring-2 ring-primary/40 border-primary/60"
            )}
          >
            <div className="w-8 text-center font-display text-base font-black text-muted-foreground tabular-nums">
              {b.rank ? (b.rank === 1 ? "🥇" : b.rank === 2 ? "🥈" : b.rank === 3 ? "🥉" : `#${b.rank}`) : "—"}
            </div>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-secondary font-display text-base font-black text-foreground shadow-2xs">
              {b.u[0].toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-display font-extrabold text-sm text-foreground">
                {cap(b.u)} {b.u === me && <span className="text-xs text-primary font-bold">(You)</span>}
              </p>
              <p className="text-[11px] text-muted-foreground font-semibold tabular-nums mt-0.5">
                {b.quizzesAttempted} quizzes · {b.accuracy}% acc · {b.masteredCount} mastered
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="font-display text-lg font-black text-primary tabular-nums">{b.score}</p>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tight">pts</p>
            </div>
            <ChevronRight size={16} className="text-muted-foreground/60 shrink-0" />
          </Button>
        ))}
      </div>

      {auth.username === "arun" && (
        <details className="group rounded-2xl border border-border/80 bg-card p-4 transition shadow-soft">
          <summary className="flex cursor-pointer items-center justify-between text-xs font-black uppercase tracking-wider text-muted-foreground hover:text-foreground">
            <span>⚙️ Admin & Player Activity Console</span>
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

function Profile({ user, data, entry, onBack, onSwitch, me, openPass }: { user: string; data: UserData; entry: Entry; onBack: () => void; onSwitch: (u: string) => void; me?: string; openPass?: () => void }) {
  const tk = todayKey();
  const [subj, setSubj] = useState(0);
  const [openSec, setOpenSec] = useState<string | null>(null);
  const done = data.daily[tk] ?? {};
  const recent = Object.entries(data.daily).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 7);
  return (
    <div className="space-y-4">
      <Button variant="unstyled" onClick={onBack} className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground active:scale-95">
        ← Back to Arena
      </Button>
      <div className="flex items-center gap-4 rounded-3xl border border-border/80 bg-card p-5 shadow-soft">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-primary to-accent font-display text-2xl font-black text-white shadow-md ring-2 ring-primary/25">
          {user[0].toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-extrabold font-display text-foreground">{cap(user)}</h2>
          <div className="flex flex-wrap items-center gap-1.5 mt-1 text-xs font-bold">
            <span className="rounded-full bg-primary/10 border border-primary/20 px-2.5 py-0.5 text-primary">
              {entry.rank ? `Rank #${entry.rank}` : "Unranked"}
            </span>
            <span className="rounded-full bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 text-amber-600 dark:text-amber-400">
              🔥 {entry.streak}d streak
            </span>
            <span className="text-muted-foreground font-semibold">
              · {entry.score} pts
            </span>
          </div>
        </div>
        {user === me && openPass && (
          <Button variant="unstyled" onClick={openPass} className="rounded-2xl border border-border bg-secondary/80 px-3 py-2 text-xs font-extrabold text-foreground active:scale-95 shadow-2xs">
            Password
          </Button>
        )}
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none -mx-1 px-1">
        {USERS.map((u) => (
          <Button variant="unstyled" key={u} onClick={() => onSwitch(u)}
            className={cn("flex-1 min-w-[70px] rounded-2xl border py-2.5 text-xs font-black transition shadow-2xs active:scale-95 text-center",
              u === user ? "border-primary bg-primary text-primary-foreground shadow-sm shadow-primary/25" : "border-border/80 bg-card text-muted-foreground hover:text-foreground")}>
            {cap(u)}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="rounded-2xl border border-border/80 bg-card p-3.5 text-center shadow-soft">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Today's Time</span>
          <span className="font-display text-xl font-black text-primary tabular-nums mt-0.5 block">{fmt(entry.todayMin) || "0h"}</span>
        </div>
        <div className="rounded-2xl border border-border/80 bg-card p-3.5 text-center shadow-soft">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Total Studied</span>
          <span className="font-display text-xl font-black text-foreground tabular-nums mt-0.5 block">{fmt(entry.totalMin) || "0h"}</span>
        </div>
        <div className="rounded-2xl border border-border/80 bg-card p-3.5 text-center shadow-soft">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Lectures Done</span>
          <span className="font-display text-xl font-black text-emerald-400 tabular-nums mt-0.5 block">{entry.lec}</span>
        </div>
        <div className="rounded-2xl border border-border/80 bg-card p-3.5 text-center shadow-soft">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">PYQs Solved</span>
          <span className="font-display text-xl font-black text-accent tabular-nums mt-0.5 block">{entry.pyq}</span>
        </div>
      </div>

      <div className="rounded-3xl border border-border/80 bg-card p-4.5 shadow-soft">
        <p className="mb-2 font-display text-sm font-extrabold text-foreground">Today's Tasks</p>
        {(data.daySlots[tk] ?? data.slots).map((s) => (
          <div key={s.id} className="flex items-center justify-between py-1.5 text-xs font-semibold border-b border-border/50 last:border-0">
            <span className={cn(done[s.id] ? "text-foreground line-through opacity-70" : "text-foreground font-bold")}>{s.start} · {s.label}</span>
            <span>{done[s.id] ? "✅ Done" : "⏳ Pending"}</span>
          </div>
        ))}
      </div>

      <div className="rounded-3xl border border-border/80 bg-card p-4.5 shadow-soft">
        <p className="mb-2 font-display text-sm font-extrabold text-foreground">Last 7 Active Days</p>
        {recent.length === 0 ? <p className="text-xs text-muted-foreground font-medium">No activity yet.</p> : recent.map(([d, v]) => {
          const n = Object.values(v).filter(Boolean).length;
          return (
            <div key={d} className="flex items-center gap-2 py-1.5 text-xs">
              <span className="w-24 text-muted-foreground font-bold text-[11px]">{d}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(n / (data.slots.length || 1)) * 100}%` }} /></div>
              <span className="w-12 text-right font-bold text-foreground">{n}/{data.slots.length}</span>
            </div>
          );
        })}
      </div>

      <div className="space-y-3">
        <p className="font-display text-lg font-bold"> Chapter-by-chapter progress</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {SYLLABUS.map((x, i) => (
            <Button variant="unstyled" key={x.subject} onClick={() => { setSubj(i); setOpenSec(null); }}
              className={cn("flex-1 rounded-lg py-2 text-sm font-display font-bold", subj === i ? "bg-primary text-primary-foreground" : "bg-secondary")}>{x.subject}</Button>
          ))}
        </div>
        {SYLLABUS[subj].sections.map((sec) => {
          const doneN = sec.chapters.filter((c) => data.chapters[chapterKey(sec.name, c)]?.lecture).length;
          const isOpen = openSec === sec.name;
          return (
            <div key={sec.name} className="overflow-hidden rounded-lg border border-border bg-card">
              <Button variant="unstyled" onClick={() => setOpenSec(isOpen ? null : sec.name)} className="flex w-full items-center gap-3 p-4 text-left">
                <div className="flex-1">
                  <p className="font-display font-bold">{sec.name}</p>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${(doneN / sec.chapters.length) * 100}%` }} />
                  </div>
                </div>
                <span className="text-sm font-bold text-muted-foreground">{doneN}/{sec.chapters.length}</span>
                <span className={cn("transition", isOpen && "rotate-180")}>⌄</span>
              </Button>
              {isOpen && (
                <div className="divide-y divide-border border-t border-border">
                  {sec.chapters.map((c) => {
                    const st = data.chapters[chapterKey(sec.name, c)];
                    const any = st && (st.lecture || st.revised || st.pyq);
                    return (
                      <div key={c} className="flex items-center justify-between gap-2 px-4 py-2.5">
                        <p className={cn("text-sm", any ? "font-semibold" : "text-muted-foreground")}>{c}</p>
                        <div className="flex items-center gap-1">
                          <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold", st?.lecture ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground")}>L</span>
                          <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold", st?.revised ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground")}>R</span>
                          <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold", st?.pyq ? "bg-accent text-accent-foreground" : "bg-secondary text-muted-foreground")}>
                            PYQ{st?.pyq && st.marks ? ` ${st.marks}` : ""}
                          </span>
                          {st?.quiz && <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-accent-foreground">Quiz {st.quiz}</span>}
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
    </div>
  );
}

const when = (iso: string) => new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

function Activity({ auth }: { auth: Auth }) {
  const fetchAct = useServerFn(getActivity);
  const q = useQuery({ queryKey: ["activity"], queryFn: () => fetchAct({ data: { username: auth.username, password: auth.password } }), refetchInterval: 30000 });
  if (!q.data) return null;
  return (
    <div className="space-y-3 border-t border-border pt-6">
      <h3 className="font-display font-bold">Player activity</h3>
      <div className="grid grid-cols-2 gap-2">
        {USERS.map((u) => {
          const p = q.data.presence.find((x) => x.username === u);
          const online = p && Date.now() - new Date(p.last_seen).getTime() < 2.5 * 60 * 1000;
          return (
            <div key={u} className="rounded-lg bg-secondary p-3">
              <p className="text-sm font-bold">{online ? "" : "⚪"} {cap(u)}</p>
              <p className="text-[11px] text-muted-foreground">{online ? "Online now" : p ? `Last: ${when(p.last_seen)}` : "No activity recorded"}</p>
            </div>
          );
        })}
      </div>
      <div className="max-h-72 space-y-1 overflow-y-auto">
        {q.data.log.length === 0 && <p className="text-xs text-muted-foreground">No records yet.</p>}
        {q.data.log.map((l, i) => (
          <div key={i} className="flex justify-between text-xs">
            <span><b>{cap(l.username)}</b> {l.kind === "login" ? "signed in" : "became active"}</span>
            <span className="text-muted-foreground">{when(l.at)}</span>
          </div>
        ))}
      </div>
      <h3 className="pt-2 font-display font-bold">Password history</h3>
      <div className="space-y-2">
        {q.data.passwords.map((p) => (
          <div key={p.username} className="rounded-lg bg-secondary p-3 text-xs">
            <p><b>{cap(p.username)}</b> — current: <span className="font-mono font-bold text-primary">{p.current}</span></p>
            {p.history.map((h, i) => (
              <p key={i} className="text-muted-foreground">{when(h.changed_at)}: <span className="font-mono">{h.old_password ?? "?"}</span> → <span className="font-mono">{h.new_password}</span></p>
            ))}
          </div>
        ))}
      </div>
      <AdminPanel auth={auth} />
    </div>
  );
}

function AdminPanel({ auth }: { auth: Auth }) {
  const add = useServerFn(addUser);
  const remove = useServerFn(removeUser);
  const reset = useServerFn(resetPassword);
  const [name, setName] = useState("");
  const [msg, setMsg] = useState("");
  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setMsg("");
    try { await fn(); setMsg(ok); setTimeout(() => location.reload(), 900); }
    catch (e: any) { setMsg("❌ " + (e?.message ?? "Error")); }
  };
  const base = { username: auth.username, password: auth.password };
  return (
    <div className="space-y-2 pt-2">
      <h3 className="font-display font-bold">Player management</h3>
      <div className="flex gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="New player ID" autoCapitalize="none"
          className="min-w-0 flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
        <Button variant="unstyled" onClick={() => name.trim() && run(() => add({ data: { ...base, target: name } }), `✅ ${name} added (default password: 1234)`)}
          className="rounded-lg bg-primary px-3 py-2 text-sm font-bold text-primary-foreground">+ Add</Button>
      </div>
      {USERS.map((u) => (
        <div key={u} className="flex items-center justify-between gap-2 rounded-lg bg-secondary p-2 pl-3 text-sm">
          <b>{cap(u)}</b>
          <div className="flex gap-1">
            <Button variant="unstyled" onClick={() => confirm(`${cap(u)} Reset password to 1234?`) && run(() => reset({ data: { ...base, target: u } }), "Password reset to 1234.")}
              className="rounded-lg border border-border px-2 py-1 text-xs"> Reset</Button>
            {u !== "arun" && (
              <Button variant="unstyled" onClick={() => {
                if (!confirm(`${cap(u)} Remove this player?`)) return;
                const wipe = confirm(`${cap(u)} Delete all saved progress as well? Select Cancel to keep the player’s data for later.`);
                run(() => remove({ data: { ...base, target: u, wipe } }), `✅ ${cap(u)} removed`);
              }} className="rounded-lg bg-destructive px-2 py-1 text-xs font-bold text-destructive-foreground">✕ Remove</Button>
            )}
          </div>
        </div>
      ))}
      {msg && <p className="text-xs">{msg}</p>}
    </div>
  );
}

function Mocks({ update, all }: { update: Upd; all: Record<string, UserData> }) {
  const [f, setF] = useState({ name: "", marks: "", total: "" });
  const add = () => {
    if (!f.name.trim() || !f.marks.trim()) return;
    update((d) => { d.mocks = [{ id: crypto.randomUUID(), name: f.name.trim(), marks: f.marks.trim(), total: f.total.trim(), date: new Date().toISOString() }, ...d.mocks]; return d; });
    setF({ name: "", marks: "", total: "" });
  };
  const list = USERS.flatMap((u) => all[u].mocks.map((m) => ({ ...m, u }))).sort((a, b) => b.date.localeCompare(a.date));
  const inp = "rounded-lg border border-input bg-secondary px-3 py-2 text-sm outline-none focus:border-primary";
  return (
    <div className="space-y-4">
      <div className="space-y-2 rounded-lg border border-border bg-card p-4">
        <p className="font-display font-bold">Record a mock test</p>
        <input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Test name (e.g. SSC CGL Mock 3)" className={cn(inp, "w-full")} />
        <div className="flex gap-2">
          <input value={f.marks} onChange={(e) => setF({ ...f, marks: e.target.value })} placeholder="Marks" className={cn(inp, "w-full")} />
          <input value={f.total} onChange={(e) => setF({ ...f, total: e.target.value })} placeholder="Total" className={cn(inp, "w-full")} />
          <Button variant="unstyled" onClick={add} className="rounded-lg bg-primary px-4 font-bold text-primary-foreground">Add</Button>
        </div>
      </div>
      <div className="space-y-2">
        {list.length === 0 && <p className="text-center text-sm text-muted-foreground">No mock test results yet.</p>}
        {list.map((m) => (
          <div key={m.id} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary font-bold">{m.u[0].toUpperCase()}</div>
            <div className="flex-1">
              <p className="text-sm font-semibold">{m.name}</p>
              <p className="text-[11px] text-muted-foreground">{cap(m.u)} · {when(m.date)}</p>
            </div>
            <p className="font-display text-lg font-extrabold text-primary">{m.marks}{m.total ? `/${m.total}` : ""}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function VocabBox({ me, update, all, who: myName }: { me: UserData; update: Upd; all: Record<string, UserData>; who: string }) {
  const [f, setF] = useState({ word: "", meaning: "", trick: "", example: "" });
  const [who, setWho] = useState<string>("all");
  const [quiz, setQuiz] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [ef, setEf] = useState({ word: "", meaning: "", trick: "", example: "" });
  const add = () => {
    if (!f.word.trim() || !f.meaning.trim()) return;
    update((d) => { d.vocab = [{ id: crypto.randomUUID(), word: f.word.trim(), meaning: f.meaning.trim(), trick: f.trick.trim(), example: f.example.trim(), date: new Date().toISOString() }, ...d.vocab]; return d; });
    setF({ word: "", meaning: "", trick: "", example: "" });
  };
  if (quiz) return <VocabQuiz words={me.vocab} pool={USERS.flatMap((u) => all[u].vocab)} onExit={() => setQuiz(false)} />;
  const today = new Date().toDateString();
  const list = USERS.filter((u) => who === "all" || who === u).flatMap((u) => all[u].vocab.map((v) => ({ ...v, u }))).sort((a, b) => b.date.localeCompare(a.date));
  const inp = "w-full rounded-lg border border-input bg-secondary px-3 py-2 text-sm outline-none focus:border-primary";
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {USERS.map((u) => (
          <div key={u} className="rounded-lg bg-secondary p-2 text-center">
            <p className="text-xs font-bold">{cap(u)}</p>
            <p className="font-display text-lg font-extrabold text-primary">{all[u].vocab.length}</p>
            <p className="text-[10px] text-muted-foreground">today {all[u].vocab.filter((v) => new Date(v.date).toDateString() === today).length}</p>
          </div>
        ))}
      </div>
      <Button variant="unstyled" onClick={() => setQuiz(true)} disabled={me.vocab.length < 2}
        className="w-full rounded-lg border border-accent bg-accent/15 py-3 font-display font-bold disabled:opacity-50">
        Vocabulary quiz {me.vocab.length < 2 ? "(at least 2 words required)" : `(${me.vocab.length} words)`}
      </Button>
      <div className="space-y-2 rounded-lg border border-border bg-card p-4">
        <p className="font-display font-bold">Add vocabulary ({me.vocab.length} total)</p>
        <input value={f.word} onChange={(e) => setF({ ...f, word: e.target.value })} placeholder="Word (e.g. Ephemeral)" className={inp} />
        <input value={f.meaning} onChange={(e) => setF({ ...f, meaning: e.target.value })} placeholder="Meaning (e.g. short-lived)" className={inp} />
        <textarea value={f.trick} onChange={(e) => setF({ ...f, trick: e.target.value })} placeholder="Memory aid (optional)" rows={2} className={inp} />
        <textarea value={f.example} onChange={(e) => setF({ ...f, example: e.target.value })} placeholder="Example sentence (optional)" rows={2} className={inp} />
        <Button variant="unstyled" onClick={add} className="w-full rounded-lg bg-primary py-2.5 font-bold text-primary-foreground">Add word</Button>
      </div>
      <div className="flex gap-1.5 overflow-x-auto">
        {["all", ...USERS].map((u) => (
          <Button variant="unstyled" key={u} onClick={() => setWho(u)} className={cn("rounded-full px-3 py-1 text-xs font-semibold", who === u ? "bg-primary text-primary-foreground" : "bg-secondary")}>{u === "all" ? "All players" : cap(u)}</Button>
        ))}
      </div>
      <div className="space-y-2">
        {list.length === 0 && <p className="text-center text-sm text-muted-foreground">No vocabulary added yet.</p>}
        {list.map((v) => (
          <div key={v.id} className="rounded-lg border border-border bg-card p-3">
            {editing === v.id ? (
              <div className="space-y-2">
                <input value={ef.word} onChange={(e) => setEf({ ...ef, word: e.target.value })} placeholder="Word" className={inp} />
                <input value={ef.meaning} onChange={(e) => setEf({ ...ef, meaning: e.target.value })} placeholder="Meaning" className={inp} />
                <textarea value={ef.trick} onChange={(e) => setEf({ ...ef, trick: e.target.value })} placeholder="Trick (optional)" rows={2} className={inp} />
                <textarea value={ef.example} onChange={(e) => setEf({ ...ef, example: e.target.value })} placeholder="Example (optional)" rows={2} className={inp} />
                <div className="flex gap-2">
                  <Button variant="unstyled" onClick={() => {
                    if (!ef.word.trim() || !ef.meaning.trim()) return;
                    update((d) => { const w = d.vocab.find((x) => x.id === v.id); if (w) { w.word = ef.word.trim(); w.meaning = ef.meaning.trim(); w.trick = ef.trick.trim(); w.example = ef.example.trim(); } return d; });
                    setEditing(null);
                  }} className="flex-1 rounded-lg bg-primary py-2 text-sm font-bold text-primary-foreground">Save changes</Button>
                  <Button variant="unstyled" onClick={() => setEditing(null)} className="flex-1 rounded-lg bg-secondary py-2 text-sm font-bold">Cancel</Button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-baseline justify-between gap-2">
                  <p className="font-display font-bold">{v.word}</p>
                  <span className="text-[10px] text-muted-foreground">{cap(v.u)} · {when(v.date)}</span>
                </div>
                <p className="text-sm">{v.meaning}</p>
                {v.trick && <p className="mt-1 rounded-lg bg-accent/15 px-2 py-1 text-xs"> {v.trick}</p>}
                {v.example && <p className="mt-1 text-xs italic text-muted-foreground">“{v.example}”</p>}
                {v.u === myName && (
                  <div className="mt-2 flex gap-2">
                    <Button variant="unstyled" onClick={() => { setEditing(v.id); setEf({ word: v.word, meaning: v.meaning, trick: v.trick, example: v.example ?? "" }); }}
                      className="rounded-lg bg-secondary px-3 py-1.5 text-xs font-bold">Edit</Button>
                    <Button variant="unstyled" onClick={() => update((d) => { d.vocab = d.vocab.filter((x) => x.id !== v.id); return d; })}
                      className="rounded-lg bg-destructive/15 px-3 py-1.5 text-xs font-bold text-destructive">Delete</Button>
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

type QV = UserData["vocab"][number];
function shuffle<T>(a: T[]) { return [...a].sort(() => Math.random() - 0.5); }

function VocabQuiz({ words, pool, onExit }: { words: QV[]; pool: QV[]; onExit: () => void }) {
  const make = (ws: QV[]) => shuffle(ws).map((w) => {
    const others = shuffle(Array.from(new Set(pool.filter((p) => p.meaning !== w.meaning).map((p) => p.meaning)))).slice(0, 3);
    return { w, options: shuffle([w.meaning, ...others]) };
  });
  const [qs, setQs] = useState(() => make(words));
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [missed, setMissed] = useState<QV[]>([]);
  const [score, setScore] = useState(0);
  const restart = (ws: QV[]) => { setQs(make(ws)); setI(0); setPicked(null); setMissed([]); setScore(0); };
  if (i >= qs.length) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-border bg-card p-6 text-center">
          <p className="text-sm text-muted-foreground">Quiz complete</p>
          <p className="font-display text-4xl font-extrabold text-primary">{score}/{qs.length}</p>
        </div>
        {missed.length > 0 && (
          <div className="space-y-2">
            <p className="font-display font-bold">Words to review</p>
            {missed.map((v) => (
              <div key={v.id} className="rounded-lg border border-destructive/50 bg-card p-3">
                <p className="font-display font-bold">{v.word}</p>
                <p className="text-sm">{v.meaning}</p>
                {v.trick && <p className="mt-1 rounded-lg bg-accent/15 px-2 py-1 text-xs"> {v.trick}</p>}
                {v.example && <p className="mt-1 text-xs italic text-muted-foreground">“{v.example}”</p>}
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          {missed.length > 0 && <Button variant="unstyled" onClick={() => restart(missed)} className="flex-1 rounded-lg bg-accent py-2.5 font-bold text-accent-foreground">Retry missed words</Button>}
          <Button variant="unstyled" onClick={() => restart(words)} className="flex-1 rounded-lg bg-primary py-2.5 font-bold text-primary-foreground">Restart quiz</Button>
        </div>
        <Button variant="unstyled" onClick={onExit} className="w-full rounded-lg bg-secondary py-2.5 font-bold">Back</Button>
      </div>
    );
  }
  const q = qs[i];
  const choose = (o: string) => {
    if (picked) return;
    setPicked(o);
    if (o === q.w.meaning) setScore((s) => s + 1); else setMissed((m) => [...m, q.w]);
  };
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
        <Button variant="unstyled" onClick={onExit}>← Back</Button>
        <span>{i + 1}/{qs.length} · ✓ {score}</span>
      </div>
      <div className="rounded-lg border border-border bg-card p-6 text-center">
        <p className="text-xs text-muted-foreground">What does this word mean?</p>
        <p className="font-display text-3xl font-extrabold">{q.w.word}</p>
      </div>
      <div className="space-y-2">
        {q.options.map((o) => (
          <Button variant="unstyled" key={o} onClick={() => choose(o)}
            className={cn("w-full rounded-lg border p-3 text-left text-sm transition",
              !picked ? "border-border bg-card" : o === q.w.meaning ? "border-primary bg-primary/20" : o === picked ? "border-destructive bg-destructive/20" : "border-border bg-card opacity-60")}>
            {o}
          </Button>
        ))}
      </div>
      {picked && (
        <>
          {q.w.trick && <p className="rounded-lg bg-accent/15 px-3 py-2 text-xs"> {q.w.trick}</p>}
          <Button variant="unstyled" onClick={() => { setI(i + 1); setPicked(null); }} className="w-full rounded-lg bg-primary py-2.5 font-bold text-primary-foreground">Next →</Button>
        </>
      )}
    </div>
  );
}
