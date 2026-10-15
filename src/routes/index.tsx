import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import { addUser, changePassword, getActivity, getAll, listUsers, login, ping, registerPush, removeUser, resetPassword, saveData, testPush } from "@/lib/data.functions";
import { enablePush, pushSupported } from "@/lib/push";
import {
  SYLLABUS, USERS, type UserData, type Slot, type CAItem, normalize, stats, todayKey, chapterKey, fmt, TOTAL_CHAPTERS,
} from "@/lib/syllabus";
import { Button } from "@/components/ui/button";
import { BookOpen, CalendarDays, ChevronRight, Menu, Trophy, UserRound, Bell, KeyRound, LogOut, Brain, Newspaper, Hash, ClipboardList, Type, Trash2, ArrowUp, ArrowDown, GripVertical, Clock3, Check, Play, Flame, Pencil, Plus, FileQuestion, FileText, CloudOff, MessageSquare } from "lucide-react";
import { QuizNudge, QuizZone, useQuizScores, useChapterQuizMap } from "@/components/quiz-zone";
import { MathPracticeZone } from "@/components/math-practice";
import { BlackBookVocabZone } from "@/components/blackbook-vocab";
import { PYQPracticeZone } from "@/components/pyq-practice";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { TimetableSortable } from "@/components/timetable-sortable";
import { cn } from "@/lib/utils";
import { getDailyCA, uploadDailyCA } from "@/lib/ca.functions";
import studyCompanion from "@/assets/study-companion.png";
import syllabusFox from "@/assets/syllabus-fox.png";
import practiceRobot from "@/assets/practice-robot.png";
import rankingTiger from "@/assets/ranking-tiger.png";
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
  Reasoning: "bg-chart-2", Maths: "bg-primary", GS: "bg-accent", English: "bg-chart-4",
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 px-5 backdrop-blur-sm" onClick={onClose}>
      <form onClick={(e) => e.stopPropagation()} className="w-full max-w-sm space-y-3 rounded-lg border border-border bg-card p-6 shadow-elevated"
        onSubmit={async (e) => {
          e.preventDefault(); setErr("");
          if (np.length < 4) return setErr("Use at least 4 characters.");
          if (np !== np2) return setErr("The passwords do not match.");
          setBusy(true);
          try { await change({ data: { username: auth.username, password: auth.password, newPassword: np } }); onChanged(np); }
          catch (x: any) { setErr(x?.message || "Something went wrong. Please try again."); }
          setBusy(false);
        }}>
        <h2 className="font-display text-xl font-bold">Change password</h2>
        <p className="text-sm text-muted-foreground">
          {auth.isDefault ? "You are using the default password. Set a new password to protect your account." : "Enter and confirm your new password."}
        </p>
        <input value={np} onChange={(e) => setNp(e.target.value)} type="password" autoComplete="new-password" placeholder="New password"
          className="w-full rounded-lg border border-input bg-background px-4 py-3 outline-none focus:border-primary" />
        <input value={np2} onChange={(e) => setNp2(e.target.value)} type="password" autoComplete="new-password" placeholder="Confirm new password"
          className="w-full rounded-lg border border-input bg-background px-4 py-3 outline-none focus:border-primary" />
        {err && <p className="text-sm text-destructive">{err}</p>}
        <div className="flex gap-2 pt-1">
          <Button variant="unstyled" type="button" onClick={onClose} className="flex-1 rounded-lg border border-border py-3 text-sm font-semibold">Not now</Button>
          <Button variant="unstyled" disabled={busy} className="flex-1 rounded-lg bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-60">{busy ? "Saving…" : "Change"}</Button>
        </div>
      </form>
    </div>
  );
}

function Login({ onLogin }: { onLogin: (a: Auth) => void }) {
  const doLogin = useServerFn(login);
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div className="login-screen flex min-h-screen items-center justify-center px-5">
      <form
        className="w-full max-w-sm space-y-5"
        onSubmit={async (e) => {
          e.preventDefault(); setBusy(true); setErr("");
          try {
            const r = await doLogin({ data: { username: u, password: p } });
            if (r.ok) onLogin({ username: r.username, password: p, isDefault: r.isDefault }); else setErr("Incorrect user ID or password.");
          } catch (x: any) { setErr(x?.message || "Connection failed. Please try again."); }
          setBusy(false);
        }}
      >
        <div className="text-center">
          <img src={studyCompanion} width={768} height={768} alt="Study Arena companion" className="companion mx-auto h-36 w-36 object-contain" />
          <h1 className="mt-5 text-4xl font-extrabold tracking-normal">Study <span className="text-primary">Arena</span></h1>
          <p className="mt-2 text-sm text-muted-foreground">Your study. Your progress. Your next milestone.</p>
        </div>
        <div className="flex justify-center gap-2">
          {USERS.map((x) => (
            <Button variant="unstyled" type="button" key={x} onClick={() => setU(x)}
              className={cn("rounded-full border px-3 py-1 text-xs font-semibold transition", u === x ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground")}>
              {cap(x)}
            </Button>
          ))}
        </div>
        <input value={u} onChange={(e) => setU(e.target.value)} placeholder="User ID" autoCapitalize="none"
          className="w-full rounded-lg border border-input bg-card px-4 py-3.5 outline-none focus:border-primary" />
        <input value={p} onChange={(e) => setP(e.target.value)} placeholder="Password" type="password" autoComplete="current-password"
          className="w-full rounded-lg border border-input bg-card px-4 py-3.5 outline-none focus:border-primary" />
        {err && <p className="text-center text-sm text-destructive">{err}</p>}
        <Button variant="unstyled" disabled={busy} className="w-full rounded-lg bg-primary py-3.5 font-display font-bold text-primary-foreground transition active:scale-[0.98] disabled:opacity-60">
          {busy ? "Signing in…" : "Sign in →"}
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
    const r = await enablePush(true);
    if (r.status === "registered") {
      await reg({ data: { username: auth.username, password: auth.password, token: r.token } }).catch(() => {});
      const t = await test({ data: { username: auth.username, password: auth.password } }).catch(() => null);
      setMsg(t && t.sent ? "A test notification has been sent." : "Notifications are enabled.");
    } else if (r.status === "open-in-new-tab") setMsg("Open the app in a separate tab or as an installed app to enable notifications.");
    else if (r.status === "denied") setMsg("Notifications are blocked. Allow notifications in your browser’s site settings, then try again.");
    else if (r.status === "unsupported") setMsg("This browser does not support notifications. Use Chrome, or add the app to your iPhone Home Screen.");
    else if (r.status === "not-configured") setMsg("Notifications are not configured yet. Please try again later.");
    else setMsg("Something went wrong. Please try again later.");
    setBusy(false);
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 px-5 backdrop-blur-sm" onClick={close}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm space-y-3 rounded-lg border border-border bg-card p-6 shadow-elevated">
        <Bell size={28} className="text-primary" />
        <h2 className="font-display text-lg font-bold">Enable notifications</h2>
        <p className="text-sm text-muted-foreground">
          Receive study reminders and updates on your ranking.
        </p>
        {msg && <p className="rounded-lg bg-secondary p-3 text-sm">{msg}</p>}
        <div className="flex gap-2 pt-1">
          <Button variant="unstyled" onClick={close} className="flex-1 rounded-lg bg-secondary py-2.5 text-sm font-semibold">{msg ? "Close" : "Not now"}</Button>
          <Button variant="unstyled" disabled={busy} onClick={allow} className="flex-1 rounded-lg bg-primary py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-60">
            {busy ? "Please wait…" : granted ? "Send test" : "Enable"}
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
  const tab = search.tab ?? "today";
  const viewing = search.profile && USERS.includes(search.profile) ? search.profile : null;
  const setTab = (next: Tab) => change({ tab: next, profile: undefined, panel: undefined });
  const setViewing = (next: string | null) => change({ profile: next ?? undefined, panel: undefined });
  const goBack = () => { if (router.history.canGoBack()) router.history.back(); else change({ tab: "today", profile: undefined, panel: undefined }, true); };
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

  // Notifications: ask once; if already allowed, silently refresh this device's registration
  const notif = search.panel === "notifications";
  const setNotif = (open: boolean) => change({ panel: open ? "notifications" : undefined }, !open);
  const regPush = useServerFn(registerPush);
  useEffect(() => {
    if (!pushSupported()) return undefined;
    if (Notification.permission === "granted") {
      enablePush(false).then((r) => { if (r.status === "registered") regPush({ data: { username: auth.username, password: auth.password, token: r.token } }).catch(() => {}); });
    } else if (Notification.permission === "default" && !localStorage.getItem("arena-notif-asked")) {
      const t = setTimeout(() => setNotif(true), 1500);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [auth.username, auth.password]);

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
      <header className="app-header sticky top-0 z-20 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border/60 bg-background/85 px-4 py-3 backdrop-blur-xl">
        <Button variant="unstyled" onClick={() => setViewing(auth.username)} className="flex min-w-0 items-center gap-3 text-left">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary font-display text-lg font-extrabold text-primary-foreground">{auth.username[0].toUpperCase()}</div>
          <div className="min-w-0">
            <p className="truncate font-display text-sm font-bold leading-tight">{cap(auth.username)}</p>
            <div className="save-status flex items-center gap-1.5 text-xs text-muted-foreground">
              {saveStatus === "saving" && (
                <>
                  <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
                  <span>Saving…</span>
                </>
              )}
              {saveStatus === "saved" && (
                <>
                  <Check size={12} className="text-emerald-500" />
                  <span>All changes saved</span>
                </>
              )}
              {saveStatus === "offline" && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    flushSave(latestPayload.current ?? mine);
                  }}
                  className="flex items-center gap-1 font-medium text-amber-500 hover:underline"
                  title="Saved locally on this device. Click to sync with cloud"
                >
                  <CloudOff size={12} />
                  <span>Device only · Tap to sync</span>
                </button>
              )}
            </div>
          </div>
        </Button>
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="unstyled" aria-label="Open leaderboard" onClick={() => setTab("arena")} className="flex min-h-10 items-center gap-1.5 rounded-lg border border-border bg-secondary px-3 py-2 text-xs font-bold">
            <Trophy size={14} className="text-primary" />
            {me.rank ? <> <span className="text-primary">#{me.rank}</span></> : " No rank"} · {me.score}
          </Button>
          <Button variant="unstyled" onClick={() => setMenu(true)} aria-label="Menu" className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary"><Menu size={20} /></Button>
        </div>
      </header>

      <MotionPresence open={menu}>
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-background/70 backdrop-blur-sm sm:items-center" onClick={() => setMenu(false)}>
          <div className="w-full max-w-md space-y-2 rounded-t-3xl border border-border bg-card p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:rounded-lg" onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto mb-2 h-1.5 w-12 rounded-full bg-muted sm:hidden" />
            <p className="font-display text-lg font-bold">Menu</p>
            {([
              [UserRound, "My profile", "Your complete study progress", () => { setViewing(auth.username); }],
              [Bell, "Notifications", "Notification preferences", () => setNotif(true)],
              [KeyRound, "Change password", "Update your account password", openPass],
              [LogOut, "Sign out", "Sign out of this device", logout],
            ] as const).map(([Icon, t, d, fn]) => (
              <Button variant="unstyled" key={t} onClick={() => { if (t === "Sign out") setMenu(false); fn(); }} className="flex w-full items-center gap-3 rounded-lg bg-secondary p-3.5 text-left active:scale-[0.99]">
                <Icon size={22} className="shrink-0 text-primary" />
                <span className="min-w-0 flex-1"><span className="block font-bold">{t}</span><span className="block text-xs text-muted-foreground">{d}</span></span><ChevronRight size={16} className="shrink-0 text-muted-foreground" />
              </Button>
            ))}
          </div>
        </div>
      </MotionPresence>

      <main key={viewing ?? tab} className="workspace-view px-4 pt-6">
        {viewing ? (
          <Profile user={viewing} data={all[viewing]} entry={board.find((b) => b.u === viewing) ?? me} onBack={goBack} onSwitch={setViewing} me={auth.username} openPass={openPass} />
        ) : tab === "today" ? (
          <Today data={mine} update={update} me={me} board={board} onNavigate={setTab} />
        ) : tab === "syllabus" ? (
          <Syllabus data={mine} update={update} all={all} />
        ) : tab === "quiz" ? (
          <QuizZone who={auth.username} targetChapter={search.chapter} />
        ) : tab === "extras" ? (
          <Extras data={mine} update={update} all={all} who={auth.username} />
        ) : (
          <Arena board={board} me={auth.username} onView={setViewing} auth={auth} />
        )}
      </main>
      {!notif && search.tab !== "quiz" && <QuizNudge who={auth.username} onOpen={() => setTab("quiz")} />}
      <MotionPresence open={notif}><NotifPopup auth={auth} onClose={() => setNotif(false)} /></MotionPresence>

      <nav className="arena-navigation fixed inset-x-0 bottom-0 z-30 border-t border-border/60 bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl">
        <div className="desktop-brand"><img src="/icon-192.png" alt="" /><span>Study Arena</span></div>
        <div className="navigation-items mx-auto grid max-w-2xl grid-cols-5 gap-1 px-1 py-1.5">
          {([["today", CalendarDays, "Today"], ["syllabus", BookOpen, "Syllabus"], ["quiz", FileQuestion, "Quiz"], ["extras", Brain, "Practice"], ["arena", Trophy, "Ranks"]] as const).map(([k, Icon, l]) => {
            const on = tab === k && !viewing;
            return (
              <Button variant="unstyled" key={k} onClick={() => { setTab(k); window.scrollTo({ top: 0 }); }}
                aria-current={on ? "page" : undefined} className={cn("nav-item flex flex-col items-center gap-1 rounded-lg py-2 text-[11px] font-semibold transition", on ? "bg-primary/15 text-primary" : "text-muted-foreground")}>
                <Icon size={20} strokeWidth={on ? 2.3 : 1.7} /><span>{l}</span>
              </Button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

function Hint({ title, character }: { icon: string; title: string; character?: string; children?: React.ReactNode }) {
  return <div className="page-heading flex items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase text-primary">Study Arena</p><h2 className="mt-1 text-2xl font-bold">{title}</h2></div>{character && <img src={character} alt="" loading="lazy" width={768} height={768} className="companion section-companion h-20 w-20 shrink-0 object-contain" />}</div>;
}

type Entry = ReturnType<typeof stats> & { u: string; rank: number | null };
type Upd = (fn: (d: UserData) => UserData) => void;

function Ring({ pct, size = 88, children }: { pct: number; size?: number; children?: React.ReactNode }) {
  const r = size / 2 - 7, c = 2 * Math.PI * r;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--color-muted)" strokeWidth="7" fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--color-primary)" strokeWidth="7" fill="none" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(1, pct))} style={{ transition: "stroke-dashoffset .6s" }} />
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
    <div className="today-workspace space-y-5">
      <div className="today-welcome page-heading grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3"><div className="min-w-0"><p className="text-xs font-semibold text-muted-foreground">{new Date(tk + "T00:00").toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}</p><h1 className="mt-2 text-3xl font-bold">Your day, {cap(me.u)}.</h1><p className="mt-2 text-sm text-muted-foreground">{doneCount === slots.length && slots.length ? "A productive day. Well done." : "Small steps. Meaningful progress."}</p></div><img src={studyCompanion} alt="Study companion" width={768} height={768} className="companion welcome-companion object-contain" /></div>
      <div className="quick-access grid grid-cols-4 gap-2">
        {([["syllabus", BookOpen, "Syllabus"], ["quiz", FileQuestion, "Quiz"], ["extras", Brain, "Practice"], ["arena", Trophy, "Rankings"]] as const).map(([target, Icon, label]) => <Button variant="unstyled" key={target} onClick={() => onNavigate(target)} className="quick-action flex flex-col items-center gap-2 py-2 text-xs font-semibold"><span className="quick-icon flex h-12 w-12 items-center justify-center rounded-lg"><Icon size={22} /></span>{label}</Button>)}
      </div>
      {!edit && nowMin !== null && (
        <section aria-label="Current session" className={cn("focus-session relative overflow-hidden p-5", current ? "session-active" : "session-upcoming")}>
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
            <p className="flex min-w-0 items-center gap-2 text-xs font-semibold uppercase text-primary"><span className="session-dot h-2 w-2 shrink-0 rounded-full bg-primary" />{current ? done[current.id] ? "Current session · Completed" : "In progress" : next ? "Up next" : "Schedule complete"}</p>
            <span className="session-clock flex h-9 w-9 items-center justify-center rounded-full"><Clock3 size={18} className="shrink-0" /></span>
          </div>
          <h2 className="mt-3 text-2xl font-bold">{current?.label ?? next?.label ?? "No session scheduled"}</h2>
          {(current ?? next) && <p className="mt-2 text-sm text-muted-foreground">{(current ?? next)?.subject} <span className="mx-1">·</span> {(current ?? next)?.start} – {addMin((current ?? next)?.start ?? "00:00", (current ?? next)?.minutes ?? 0)}</p>}
          {current ? <>
            <div className="mt-5 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 text-xs"><span className="text-muted-foreground">{fmt(remaining)} remaining</span><span className="font-semibold">{fmt(current.minutes)} session</span></div>
            <progress aria-label="Session elapsed" max={current.minutes} value={current.minutes - remaining} className="session-progress mt-2 h-1.5 w-full" />
            <Button onClick={() => toggle(current.id)} className="mt-5 w-full gap-2" variant={done[current.id] ? "secondary" : "default"}><Check size={17} />{done[current.id] ? "Completed · Undo" : "Complete session"}</Button>
          </> : <p className="mt-4 text-xs text-muted-foreground">{next ? `Starts in ${fmt(toMin(next.start) - nowMin)}` : doneCount === slots.length && slots.length ? "All tasks completed for today." : "No study session is currently active."}</p>}
        </section>
      )}
      <section className="study-summary grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 border-y border-border py-5">
        <Ring pct={me.planMin ? me.todayMin / me.planMin : 0}>
          <span className="font-display text-lg font-extrabold">{Math.round((me.todayMin / (me.planMin || 1)) * 100)}%</span>
        </Ring>
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-normal text-muted-foreground">Study time today</p>
          <p className="font-display text-2xl font-extrabold">{fmt(me.todayMin) || "0h"}</p>
          <p className="text-xs text-muted-foreground">{doneCount}/{slots.length} tasks · target {fmt(me.planMin)}</p>
        </div>
        <div className="streak-stat flex flex-col items-center gap-1 border-l border-border pl-3"><Flame size={22} className="text-accent" /><span className="font-display text-xl font-bold">{me.streak}</span><span className="text-[10px] text-muted-foreground">day streak</span></div>
      </section>

      <div className="rank-nudge flex items-start gap-3 border-b border-border pb-4 text-xs text-muted-foreground"><Trophy size={17} className="shrink-0 text-accent" /><p>
        {!me.rank ? "Complete your first task to join the leaderboard."
          : me.rank === 1 ? `You are ranked #1. ${board[1]?.score ? `${cap(board[1].u)} is ${me.score - board[1].score} points behind you.` : "Maintain your lead."}`
          : above ? `${above.score - me.score + 1} points to pass ${cap(above.u)}. Leader: ${cap(leader.u)}.` : ""}
      </p></div>

      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
        <div className="min-w-0">
          <h2 className="text-xl font-bold">Today’s timetable</h2>
          {special && <p className="text-xs font-bold text-primary">Date-specific timetable active</p>}
          <p className="text-xs text-muted-foreground">{edit ? "Editing timetable" : "Your scheduled study sessions"}</p>
        </div>
        <Button variant={edit ? "default" : "secondary"} onClick={() => setEdit(!edit)} className="shrink-0 gap-2">
          {edit ? <Check size={15} /> : <Pencil size={15} />}{edit ? "Done" : "Edit"}
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
      <DayPlans data={data} update={update} />
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
  const inp = "rounded-lg border border-border bg-secondary px-2 py-2 text-sm text-foreground";
  if (edit) return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} data-task-id={s.id} className={cn("relative rounded-lg border bg-card p-3", isDragging ? "z-20 border-primary shadow-elevated ring-2 ring-primary/30" : "border-border")}>
      <div className="mb-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-b border-border pb-2">
        <Button variant="unstyled" ref={setActivatorNodeRef} {...attributes} {...listeners} aria-label={`Reorder ${s.label}`} title="Hold to reorder" className="drag-handle flex min-w-0 items-center gap-2 self-stretch rounded-lg py-2 text-xs font-semibold text-muted-foreground"><GripVertical size={20} className="shrink-0" /><span className="truncate">{s.subject}</span></Button>
        <div className="flex shrink-0 gap-1">
          <Button variant="unstyled" onClick={onUp} aria-label="Move up" title="Move up" className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary"><ArrowUp size={16} /></Button>
          <Button variant="unstyled" onClick={onDown} aria-label="Move down" title="Move down" className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary"><ArrowDown size={16} /></Button>
          <Button variant="unstyled" onClick={onDelete} aria-label="Delete task" title="Delete task" className="flex h-10 w-10 items-center justify-center rounded-lg text-destructive"><Trash2 size={16} /></Button>
        </div>
      </div>
      <div className="min-w-0 flex-1 space-y-2.5">
        <input aria-label="Task name" value={s.label} onChange={(e) => onChange({ label: e.target.value })} className={cn(inp, "w-full font-semibold")} placeholder="Task name" />
        <div className="grid grid-cols-2 gap-2 text-sm">
          <label className="min-w-0 space-y-1"><span className="text-xs text-muted-foreground">Start</span><input type="time" value={s.start} onChange={(e) => onChange({ start: e.target.value })} className={cn(inp, "w-full")} aria-label="start time" /></label>
          <label className="min-w-0 space-y-1"><span className="text-xs text-muted-foreground">End</span><input type="time" value={end} onChange={(e) => { let m = toMin(e.target.value) - toMin(s.start); if (m <= 0) m += 1440; onChange({ minutes: m }); }} className={cn(inp, "w-full")} aria-label="end time" /></label>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <select value={s.subject} onChange={(e) => onChange({ subject: e.target.value })} className={inp} aria-label="subject">
            {SUBJECTS.map((x) => <option key={x}>{x}</option>)}
          </select>
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><Clock3 size={14} />{fmt(s.minutes)}</span>
        </div>
      </div>
    </div>
  );
  return (
    <div ref={setNodeRef} data-task-id={s.id} className={cn("task-row grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg border p-4 transition", live && !checked ? "task-live border-primary/50 bg-primary/10" : checked ? "task-completed border-border bg-secondary/40" : "border-border bg-card")}>
      <div className="min-w-0 flex-1">
        <p className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground"><span className={cn("h-1.5 w-1.5 rounded-full", SUBJ_COLOR[s.subject] ?? "bg-muted")} />{s.subject}{live && <span className="ml-1 flex items-center gap-1 text-primary"><Play size={10} />{checked ? "Current · Completed" : "In progress"}</span>}</p>
        <p className={cn("font-semibold", checked && "text-muted-foreground line-through")}>{s.label}</p>
        <p className="mt-1 text-xs text-muted-foreground">{s.start} – {end} · {fmt(s.minutes)}</p>
      </div>
      <Button variant="unstyled" onClick={onToggle} aria-label={checked ? "Not done" : "Mark done"}
        className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 text-xl font-bold transition active:scale-90", checked ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40")}>
        {checked ? <Check size={20} /> : <Check size={18} className="text-muted-foreground/40" />}
      </Button>
    </div>
  );
}

function Syllabus({ data, update, all }: { data: UserData; update: Upd; all: Record<string, UserData> }) {
  const quizScores = useQuizScores();
  const chapterQuizzes = useChapterQuizMap();
  const { search, change } = useWorkspaceNavigation();
  const subj = search.subject ?? 0;
  const setSubj = (subject: number) => change({ subject });
  const [open, setOpen] = useState<string | null>(SYLLABUS[0].sections[0].name);
  const S = SYLLABUS[subj];
  return (
    <div className="space-y-4">
      <Hint icon="" title="Syllabus" character={syllabusFox} />
      <div className="section-tabs">
        {SYLLABUS.map((x, i) => {
          const total = x.sections.reduce((n, s) => n + s.chapters.length, 0);
          const doneN = x.sections.reduce((n, s) => n + s.chapters.filter((c) => data.chapters[chapterKey(s.name, c)]?.lecture).length, 0);
          const totalQuizzes = x.sections.reduce((n, s) => n + s.chapters.filter((c) => !!chapterQuizzes[chapterKey(s.name, c)]).length, 0);
          return (
            <Button variant="unstyled" aria-pressed={subj === i} key={x.subject} onClick={() => { setSubj(i); setOpen(x.sections[0].name); }}
              className={cn("rounded-lg border p-3.5 text-left transition", subj === i ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card")}>
              <div className="flex items-center justify-between gap-1">
                <p className="font-display text-base font-bold">{x.subject}</p>
                {totalQuizzes > 0 && (
                  <span className={cn("text-[10px] font-black px-1.5 py-0.5 rounded-full border", subj === i ? "bg-white/20 border-white/30 text-white" : "bg-primary/10 border-primary/20 text-primary")}>
                    🎯 {totalQuizzes}Q
                  </span>
                )}
              </div>
              <p className={cn("mt-1 text-xs", subj === i ? "text-primary-foreground/80 font-medium" : "text-muted-foreground")}>{doneN}/{total} chapters</p>
              <div className="mt-3 h-1 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(doneN / total) * 100}%` }} />
              </div>
            </Button>
          );
        })}
      </div>
      {S.sections.map((sec) => {
        const doneN = sec.chapters.filter((c) => data.chapters[chapterKey(sec.name, c)]?.lecture).length;
        const secQuizCount = sec.chapters.filter((c) => !!chapterQuizzes[chapterKey(sec.name, c)]).length;
        const isOpen = open === sec.name;
        return (
          <div key={sec.name} className="chapter-section overflow-hidden">
            <Button variant="unstyled" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : sec.name)} className="grid w-full grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 py-4 text-left">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-display font-bold">{sec.name}</p>
                  {secQuizCount > 0 && (
                    <span className="rounded-full bg-primary/10 border border-primary/25 text-primary text-[10px] font-black px-2 py-0.5 shrink-0">
                      🎯 {secQuizCount} {secQuizCount === 1 ? "Quiz" : "Quizzes"}
                    </span>
                  )}
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(doneN / sec.chapters.length) * 100}%` }} />
                </div>
              </div>
              <span className="text-sm font-bold text-muted-foreground">{doneN}/{sec.chapters.length}</span>
              <span className={cn("transition", isOpen && "rotate-180")}>⌄</span>
            </Button>
            {isOpen && (
              <div className="divide-y divide-border border-t border-border">
                {sec.chapters.map((c) => {
                  const k = chapterKey(sec.name, c);
                  const st = data.chapters[k] ?? {};
                  const qz = chapterQuizzes[k];
                  const sc = quizScores[k];
                  const set = (patch: object) => update((d) => { d.chapters[k] = { ...(d.chapters[k] ?? {}), ...patch }; return d; });
                  const others = USERS.filter((u) => all[u].chapters[k]?.lecture);
                  return (
                    <div key={c} className="space-y-2 px-4 py-3">
                      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold">{c}</p>
                          <Button
                            variant="unstyled"
                            onClick={() => change({ tab: "quiz", chapter: k })}
                            className={cn(
                              "rounded-lg border px-2 py-0.5 text-[11px] font-bold transition flex items-center gap-1 shadow-2xs active:scale-95",
                              qz
                                ? (sc
                                    ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                                    : "border-primary/50 bg-primary/15 text-primary hover:bg-primary/25")
                                : "border-border/60 bg-secondary/60 text-muted-foreground hover:text-foreground hover:border-primary/40"
                            )}
                            title={`Take Quiz for ${c}${qz ? ` (${qz.count} Questions)` : ""}`}
                          >
                            <span>🎯</span>
                            <span>{sc ? `Quiz ${sc.score}/${sc.total}` : qz ? `Take Quiz (${qz.count}Q)` : "Quiz"}</span>
                          </Button>
                        </div>
                        <div className="flex -space-x-1.5">
                          {others.map((u) => (
                            <span key={u} title={cap(u)} className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-card bg-accent text-[10px] font-bold text-accent-foreground">{u[0].toUpperCase()}</span>
                          ))}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {(["lecture", "revised", "pyq"] as const).map((f) => (
                          <Button variant="unstyled" key={f} onClick={() => set({ [f]: !st[f] })}
                            aria-pressed={!!st[f]} className={cn("min-h-11 rounded-lg border px-3 py-2 text-xs font-semibold transition", st[f] ? "border-primary/40 bg-primary/15 text-primary" : "border-border bg-secondary text-muted-foreground")}>
                            {st[f] ? "✓ " : ""}{f === "lecture" ? " Lecture" : f === "revised" ? " Revised" : " PYQ"}
                          </Button>
                        ))}
                        {/* 4th Action: Direct Chapter Quiz Launch Button - ALWAYS VISIBLE */}
                        <Button
                          variant="unstyled"
                          onClick={() => change({ tab: "quiz", chapter: k })}
                          className={cn(
                            "min-h-11 rounded-lg border px-3.5 py-2 text-xs font-bold transition flex items-center gap-1.5 shadow-2xs active:scale-95",
                            qz
                              ? (sc
                                  ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                                  : "border-primary/50 bg-primary/15 text-primary hover:bg-primary/25")
                              : "border-border bg-secondary/80 text-foreground/80 hover:bg-secondary hover:border-primary/40"
                          )}
                          title={`Directly open quiz for ${c}`}
                        >
                          <span>🎯</span>
                          <span>
                            {sc
                              ? `Quiz: ${sc.score}/${sc.total}`
                              : qz
                              ? `Quiz (${qz.count}Q)`
                              : "Chapter Quiz"}
                          </span>
                        </Button>
                        {st.pyq && (
                          <input value={st.marks ?? ""} onChange={(e) => set({ marks: e.target.value })} placeholder="PYQ marks 18/25"
                            className="w-32 rounded-full border border-input bg-secondary px-3 py-2 text-xs outline-none focus:border-primary" />
                        )}
                      </div>
                      {(() => {
                        const mk = USERS.filter((u) => all[u].chapters[k]?.marks || all[u].chapters[k]?.quiz);
                        return mk.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 text-[11px] text-muted-foreground">
                            {mk.map((u) => {
                              const x = all[u].chapters[k];
                              if (!x) return null;
                              return (
                                <span key={u} className="rounded-full bg-secondary px-2 py-0.5">
                                  <b className="text-foreground">{cap(u)}</b>{x.marks ? ` · PYQ ${x.marks}` : ""}{x.quiz ? ` · Quiz ${x.quiz}` : ""}
                                </span>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

const CA_CATS = ["National", "International", "Economy", "Sports", "Sci & Tech", "Awards", "Schemes", "Defence"];

function weekLabel(d = new Date()) {
  const x = new Date(d); x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return `Week of ${x.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`;
}

function Extras({ data, update, all, who }: { data: UserData; update: Upd; all: Record<string, UserData>; who: string }) {
  const { search, change } = useWorkspaceNavigation();
  const view = search.practice === "quiz" || search.practice === "mock" || search.practice === "tests" ? "pyq" : search.practice ?? "pyq";
  const setView = (practice: "pyq" | "ca" | "tables" | "vocab" | "idioms") => change({ practice });
  return (
    <div className="space-y-4">
      <Hint icon="" title="Practice" character={practiceRobot} />
      <div className="section-tabs">
        {([
          ["pyq", FileText, "PYQ Papers"],
          ["ca", Newspaper, "Current affairs"],
          ["tables", Hash, "Maths calculations"],
          ["vocab", Type, "Vocabulary (1000)"],
          ["idioms", MessageSquare, "Idioms & Phrases (200+)"],
        ] as const).map(([k, Icon, l]) => (
          <Button variant="unstyled" aria-pressed={view === k} key={k} onClick={() => setView(k)} className={cn("flex min-w-0 items-center justify-center gap-2 rounded-lg px-2 py-3 text-sm font-semibold transition", view === k ? "bg-primary/10 text-primary" : "bg-card text-muted-foreground")}>
            <Icon size={18} />{l}
          </Button>
        ))}
      </div>
      {view === "pyq" ? (
        <PYQPracticeZone who={who} />
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
      <Hint icon="" title="Daily current affairs"></Hint>
      {who === "arun" && <CAUpload onDone={() => q.refetch()} />}
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

function Arena({ board, me, onView, auth }: { board: Entry[]; me: string; onView: (u: string) => void; auth: Auth }) {
  const ranked = board.filter((b) => b.rank);
  return (
    <div className="space-y-4">
      <div>
        <Hint icon="" title="Leaderboard" character={rankingTiger} />
        <p className="text-xs text-muted-foreground">Task 10 · Lecture 15 · Revision 8 · PYQ 8 · CA note 3 · Streak 5/day</p>
      </div>
      <div className="flex items-center gap-3 border-b border-border py-3">
        <UserRound size={20} className="shrink-0 text-primary" />
        <p className="text-sm font-semibold">Player progress</p>
      </div>
      {ranked.length === 0 && (
        <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          No rankings yet. Complete a task to enter the leaderboard.
        </div>
      )}
      <div className="space-y-2.5">
        {board.map((b) => (
          <Button variant="unstyled" key={b.u} onClick={() => onView(b.u)}
            className={cn("flex w-full items-center gap-3 rounded-lg border p-4 text-left transition active:scale-[0.99]",
              b.rank === 1 ? "border-accent/40 bg-accent/5" : "border-border bg-card", b.u === me && "border-primary/50")}>
            <div className="w-10 text-center font-display text-2xl font-extrabold">{b.rank ? MEDAL[b.rank - 1] ?? `#${b.rank}` : "—"}</div>
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-secondary font-display text-lg font-bold">{b.u[0].toUpperCase()}</div>
            <div className="min-w-0 flex-1">
              <p className="font-display font-bold">{cap(b.u)} {b.u === me && <span className="text-xs text-primary">(you)</span>}</p>
              <p className="mt-1 text-xs text-muted-foreground">{fmt(b.todayMin) || "0h"} today · {b.lec} chapters</p>
            </div>
            <div className="text-right">
              <p className="font-display text-xl font-extrabold text-primary">{b.score}</p>
              <p className="text-[10px] text-muted-foreground">pts</p>
            </div>
            <span className="shrink-0 rounded-full bg-secondary px-3 py-1.5 text-[11px] font-bold text-primary">View <ChevronRight size={14} className="inline" /></span>
          </Button>
        ))}
      </div>
      {auth.username === "arun" && <Activity auth={auth} />}
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
      <Button variant="unstyled" onClick={onBack} className="text-sm text-muted-foreground">← Back</Button>
      <div className="flex items-center gap-4 rounded-lg border border-border bg-card p-5">
        <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-primary font-display text-3xl font-extrabold text-primary-foreground">{user[0].toUpperCase()}</div>
        <div className="flex-1">
          <h2 className="text-2xl font-extrabold">{cap(user)}</h2>
          <p className="text-sm text-muted-foreground">{entry.rank ? `Rank #${entry.rank}` : "Unranked"} · {entry.score} pts ·  {entry.streak}</p>
        </div>
        {user === me && openPass && (
          <Button variant="unstyled" onClick={openPass} className="rounded-lg bg-secondary px-3 py-2 text-xs font-bold">Change password</Button>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {USERS.map((u) => (
          <Button variant="unstyled" key={u} onClick={() => onSwitch(u)}
            className={cn("flex-1 rounded-full border py-1.5 text-xs font-bold transition", u === user ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground")}>
            {cap(u)}
          </Button>
        ))}
      </div>
      <div className="grid grid-cols-4 gap-2 text-center">
        <Stat label="Today" value={fmt(entry.todayMin) || "0h"} />
        <Stat label="Lecture" value={entry.lec} />
        <Stat label="Revised" value={entry.rev} />
        <Stat label="PYQ" value={entry.pyq} />
      </div>
      <div className="grid grid-cols-4 gap-2 text-center">
        <Stat label="Total time" value={fmt(entry.totalMin) || "0h"} />
        <Stat label="Tables" value={data.tables.table} />
        <Stat label="Squares" value={data.tables.square} />
        <Stat label="CA notes" value={entry.caCount} />
      </div>

      <div className="rounded-lg border border-border bg-card p-4">
        <p className="mb-2 font-display font-bold">Today’s taskss</p>
        {(data.daySlots[tk] ?? data.slots).map((s) => (
          <div key={s.id} className="flex items-center justify-between py-1 text-sm">
            <span className={cn(done[s.id] ? "" : "text-muted-foreground")}>{s.start} · {s.label}</span>
            <span>{done[s.id] ? "✅" : "⬜"}</span>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-border bg-card p-4">
        <p className="mb-2 font-display font-bold">Last 7 active days</p>
        {recent.length === 0 ? <p className="text-sm text-muted-foreground">No activity yet.</p> : recent.map(([d, v]) => {
          const n = Object.values(v).filter(Boolean).length;
          return (
            <div key={d} className="flex items-center gap-2 py-1 text-xs">
              <span className="w-24 text-muted-foreground">{d}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary" style={{ width: `${(n / data.slots.length) * 100}%` }} /></div>
              <span className="w-10 text-right">{n}/{data.slots.length}</span>
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
