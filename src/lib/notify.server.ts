// Builds and sends the push notifications (slot reminders + rank taunts). Server-only.
import { normalize, slotsFor, type UserData } from "./syllabus";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/firebase_messaging";
const APP_URL = "https://ssc-arena.lovable.app/";
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

  // Everyone: 3 reminders a day — 5 PM, 7 PM, 9 PM (IST) — to update tasks & syllabus
  for (const u of users) {
    const d = data[u];
    const done = d.daily[key] ?? {};
    const sl = slotsFor(d, key);
    const total = sl.length;
    const doneCount = sl.filter((s) => done[s.id]).length;
    const pending = total - doneCount;

    out.push({
      username: u,
      title: `📝 ${pending > 0 ? `${pending} task baaki hain` : "Sab done! Par update karo"}`,
      body: pick([
        `Website kholo — aaj ke tasks tick karo aur syllabus update karo ✅`,
        `Jitna padha, utna mark karo. Tasks + syllabus update karo 📚`,
        `Update karo tasks aur syllabus — warna ranking me peeche reh jaoge 😏`,
      ]),
    });
  }
  return out;
}

export async function sendAll(messages: Msg[], tokens: { token: string; username: string }[]) {
  const LOVABLE_API_KEY = process.env["LOVABLE_API_KEY"];
  const FCM_KEY = process.env["FIREBASE_MESSAGING_API_KEY"];
  if (!LOVABLE_API_KEY || !FCM_KEY) throw new Error("Push credentials not configured");
  const headers = { Authorization: `Bearer ${LOVABLE_API_KEY}`, "X-Connection-Api-Key": FCM_KEY, "Content-Type": "application/json" };

  const jobs = messages.flatMap((m) => tokens.filter((t) => t.username === m.username).map((t) => ({ m, token: t.token })));
  const stale: string[] = [];
  let sent = 0;
  for (let i = 0; i < jobs.length; i += 6) {
    await Promise.all(jobs.slice(i, i + 6).map(async ({ m, token }) => {
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
    }));
  }
  return { sent, stale };
}
