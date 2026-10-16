// Builds and sends the push notifications (slot reminders + rank taunts). Server-only.
import { normalize, slotsFor, type UserData } from "./syllabus";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/firebase_messaging";
const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];

// India time (UTC+5:30)
function ist(now = new Date()) {
  const d = new Date(now.getTime() + 330 * 60000);
  const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
  return { key, min: d.getUTCHours() * 60 + d.getUTCMinutes() };
}
type Msg = { username: string; title: string; body: string };

export function buildMessages(users: string[], rows: { username: string; data: unknown }[], now = new Date()): Msg[] {
  const { key, min } = ist(now);
  const data: Record<string, UserData> = {};
  for (const u of users) data[u] = normalize(rows.find((r) => r.username === u)?.data);

  const out: Msg[] = [];

  for (const u of users) {
    const d = data[u];
    const done = d.daily[key] ?? {};
    const sl = slotsFor(d, key);
    const total = sl.length;
    const doneCount = sl.filter((s) => done[s.id]).length;
    const pending = total - doneCount;

    // 1. High-priority: Alert 0-15 minutes BEFORE task start time (e.g. 9:55 AM for 10:00 AM task)
    const upcomingSlot = sl.find((s) => {
      if (done[s.id]) return false;
      const parts = s.start.split(":").map(Number);
      if (parts.length < 2 || isNaN(parts[0]) || isNaN(parts[1])) return false;
      const slotMin = parts[0] * 60 + parts[1];
      const diff = slotMin - min;
      return diff >= 0 && diff <= 15;
    });

    if (upcomingSlot) {
      const parts = upcomingSlot.start.split(":").map(Number);
      const slotMin = parts[0] * 60 + parts[1];
      const diff = slotMin - min;
      const whenStr = diff <= 2 ? "Right now" : `in ${diff} minutes`;
      out.push({
        username: u,
        title: `⏰ Next Task: ${upcomingSlot.name} at ${upcomingSlot.start}`,
        body: `Starting ${whenStr}! Open Arena to track your study slot and maintain your daily streak 🔥`,
      });
      continue;
    }

    // 2. Fallback: 3 to 4 scheduled daily checkpoint reminders
    // Morning (9:00 - 9:15), Afternoon (14:00 - 14:15), Evening (18:30 - 18:45), Night Recap (21:45 - 22:00)
    const isMorning = min >= 540 && min <= 555;
    const isAfternoon = min >= 840 && min <= 855;
    const isEvening = min >= 1110 && min <= 1125;
    const isNight = min >= 1305 && min <= 1320;

    if (isMorning || isAfternoon || isEvening || isNight) {
      if (isMorning) {
        out.push({
          username: u,
          title: `☀️ Morning Kickoff: ${total} tasks planned today`,
          body: `Today is a new day! Review your timetable and start your first study session.`,
        });
      } else if (isNight) {
        out.push({
          username: u,
          title: pending > 0 ? `🌙 Day Ending: ${pending} tasks incomplete` : `🏆 All ${total} tasks finished!`,
          body: pending > 0
            ? `Tick off any completed tasks and update your syllabus marks before midnight.`
            : `Outstanding work today! Check your ranking on the arena leaderboard.`,
        });
      } else {
        out.push({
          username: u,
          title: `📝 ${pending > 0 ? `${pending} tasks remaining today` : "Great progress! All tasks on track"}`,
          body: pick([
            `Open Study Arena to tick completed tasks & update syllabus progress.`,
            `Consistency beats intensity! Keep your daily streak alive.`,
            `Update your completed chapters and practice scores to climb ranks.`,
          ]),
        });
      }
    }
  }

  return out;
}

const APP_URL = process.env["APP_URL"] || "https://ssc-arena.amanmishra8004.workers.dev/";

async function getCredentials() {
  let lovableKey = process.env["LOVABLE_API_KEY"] || (globalThis as any)?.LOVABLE_API_KEY;
  let fcmKey = process.env["FIREBASE_MESSAGING_API_KEY"] || (globalThis as any)?.FIREBASE_MESSAGING_API_KEY;

  if (!lovableKey || !fcmKey) {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data } = await supabaseAdmin.from("app_secrets" as any).select("name,value");
      if (Array.isArray(data)) {
        for (const s of data as { name: string; value: string }[]) {
          if (s.name === "lovable_api_key" && !lovableKey) lovableKey = s.value;
          if (s.name === "firebase_messaging_api_key" && !fcmKey) fcmKey = s.value;
        }
      }
    } catch {}
  }

  return { lovableKey, fcmKey };
}

export async function sendAll(messages: Msg[], tokens: { token: string; username: string }[]) {
  const { lovableKey, fcmKey } = await getCredentials();
  if (!lovableKey || !fcmKey) {
    console.warn("[Push] Cloud push gateway credentials not set (LOVABLE_API_KEY / FIREBASE_MESSAGING_API_KEY). In-app local notifications will handle alerts.");
    return { sent: 0, stale: [], notConfigured: true };
  }
  const headers = { Authorization: `Bearer ${lovableKey}`, "X-Connection-Api-Key": fcmKey, "Content-Type": "application/json" };

  const jobs = messages.flatMap((m) => tokens.filter((t) => t.username === m.username).map((t) => ({ m, token: t.token })));
  const stale: string[] = [];
  let sent = 0;
  for (let i = 0; i < jobs.length; i += 6) {
    await Promise.all(jobs.slice(i, i + 6).map(async ({ m, token }) => {
      try {
        const res = await fetch(`${GATEWAY_URL}/v1/projects/_/messages:send`, {
          method: "POST", headers,
          body: JSON.stringify({ message: {
            token,
            notification: { title: m.title, body: m.body },
            webpush: { notification: { icon: "/icon-192.png" }, fcm_options: { link: APP_URL } },
          } }),
        });
        if (res.ok) { sent++; return; }
        const text = await res.text();
        if (res.status === 404 || (res.status === 400 && text.includes("INVALID_ARGUMENT")) || text.includes("UNREGISTERED")) stale.push(token);
        else console.error(`FCM send failed [${res.status}]: ${text}`);
      } catch (fetchErr) {
        console.error("FCM gateway fetch error:", fetchErr);
      }
    }));
  }
  return { sent, stale };
}
