// Client-side notification manager: sends native device alerts & tracks timetable slots
import { slotsFor, type UserData } from "./syllabus";

// Synthesize a gentle notification chime using Web Audio API
export function playNotificationSound() {
  if (typeof window === "undefined") return;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    // 2-tone melodic chime: C6 (1046Hz) to E6 (1318Hz)
    osc.frequency.setValueAtTime(1046, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1318, ctx.currentTime + 0.12);

    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  } catch {}
}

export async function sendDeviceNotification(
  title: string,
  body: string,
  options: { url?: string; tag?: string } = {}
): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) return false;

  let perm = Notification.permission;
  if (perm !== "granted") {
    try {
      perm = await Notification.requestPermission();
    } catch {
      return false;
    }
  }

  if (perm !== "granted") return false;

  playNotificationSound();

  // Try service worker first (supports vibration, background & mobile lock screen)
  if ("serviceWorker" in navigator) {
    try {
      let reg = await navigator.serviceWorker.getRegistration();
      if (!reg) {
        reg = await navigator.serviceWorker.register("/firebase-messaging-sw.js").catch(() => undefined);
      }
      if (reg && typeof reg.showNotification === "function") {
        await reg.showNotification(title, {
          body,
          icon: "/icon-192.png",
          badge: "/icon-192.png",
          tag: options.tag ?? `arena-${Date.now()}`,
          vibrate: [200, 100, 200],
          data: { url: options.url ?? "/" },
        } as any);
        return true;
      }
    } catch (err) {
      console.warn("ServiceWorker showNotification failed, trying fallback:", err);
    }
  }

  // Fallback: standard Window Notification API
  try {
    const notif = new Notification(title, {
      body,
      icon: "/icon-192.png",
      tag: options.tag ?? `arena-${Date.now()}`,
    });
    notif.onclick = () => {
      window.focus();
      notif.close();
    };
    return true;
  } catch (err) {
    console.error("Native notification failed:", err);
    return false;
  }
}

// India time helper (UTC+5:30)
function getIST() {
  const now = new Date();
  const d = new Date(now.getTime() + 330 * 60000);
  const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
  const min = d.getUTCHours() * 60 + d.getUTCMinutes();
  return { key, min };
}

// Checks timetable slots every 30s and sends timely notifications
export function checkTimetableAlerts(mine: UserData | null, username: string) {
  if (!mine || typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  const { key, min } = getIST();
  const done = mine.daily?.[key] ?? {};
  const sl = slotsFor(mine, key);
  const total = sl.length;
  const doneCount = sl.filter((s) => done[s.id]).length;
  const pending = total - doneCount;

  // 1. Task reminder: 0 to 10 minutes before start time
  for (const s of sl) {
    if (done[s.id]) continue;
    const parts = s.start.split(":").map(Number);
    if (parts.length < 2 || isNaN(parts[0]) || isNaN(parts[1])) continue;
    const slotMin = parts[0] * 60 + parts[1];
    const diff = slotMin - min;

    // Check if slot starts within 10 minutes or right now
    if (diff >= 0 && diff <= 10) {
      const alertKey = `arena_notified_${username}_${key}_${s.id}`;
      if (!localStorage.getItem(alertKey)) {
        localStorage.setItem(alertKey, "1");
        const when = diff <= 2 ? "Right now" : `in ${diff} min`;
        sendDeviceNotification(
          `⏰ Next Task: ${s.name} (${s.start})`,
          `Starting ${when}! Open Study Arena to log your slot and protect your streak 🔥`,
          { tag: `slot-${s.id}` }
        );
      }
    }
  }

  // 2. Daily Checkpoints: Morning (9:00 AM) & Night Recap (9:45 PM)
  const isMorning = min >= 540 && min <= 560; // 9:00 - 9:20 AM
  const isNight = min >= 1305 && min <= 1330; // 9:45 - 10:10 PM

  if (isMorning) {
    const morningKey = `arena_morning_${username}_${key}`;
    if (!localStorage.getItem(morningKey)) {
      localStorage.setItem(morningKey, "1");
      sendDeviceNotification(
        `☀️ Morning Kickoff: ${total} tasks planned today`,
        `Start your day strong! Review your timetable and start your first study slot.`,
        { tag: "checkpoint-morning" }
      );
    }
  }

  if (isNight) {
    const nightKey = `arena_night_${username}_${key}`;
    if (!localStorage.getItem(nightKey)) {
      localStorage.setItem(nightKey, "1");
      sendDeviceNotification(
        pending > 0 ? `🌙 Day Ending: ${pending} tasks remaining` : `🏆 All ${total} tasks finished!`,
        pending > 0
          ? `Tick off any completed study tasks & update syllabus progress before midnight.`
          : `Outstanding work today! Check your standings on the Arena leaderboard.`,
        { tag: "checkpoint-night" }
      );
    }
  }
}
