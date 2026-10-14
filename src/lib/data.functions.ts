import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const DEFAULT_PASS = "1234";
const NAMES = ["arun", "ali", "naveen", "devansh"];

const cred = z.object({ username: z.string().toLowerCase().trim(), password: z.string() });

async function hash(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("arena:" + s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function names(): Promise<string[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.from("app_users" as any).select("username").order("created_at");
  const list = ((data ?? []) as unknown as { username: string }[]).map((r) => r.username);
  return list.length ? list : NAMES;
}

export const listUsers = createServerFn({ method: "GET" }).handler(async () => names());

const adminIn = cred.extend({ target: z.string().toLowerCase().trim().regex(/^[a-z0-9_]{2,20}$/, "Use 2–20 lowercase letters, numbers or underscores.") });
async function requireArun(username: string, password: string) {
  if (username !== "arun" || !(await check(username, password)).ok) throw new Error("Only the administrator can perform this action.");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export const addUser = createServerFn({ method: "POST" })
  .inputValidator((d) => adminIn.parse(d))
  .handler(async ({ data }) => {
    const db = await requireArun(data.username, data.password);
    const { error } = await db.from("app_users" as any).insert({ username: data.target } as any);
    if (error) throw new Error(error.code === "23505" ? "This player ID already exists." : error.message);
    await db.from("user_passwords" as any).delete().eq("username", data.target);
    return { ok: true };
  });

export const removeUser = createServerFn({ method: "POST" })
  .inputValidator((d) => adminIn.extend({ wipe: z.boolean() }).parse(d))
  .handler(async ({ data }) => {
    if (data.target === "arun") throw new Error("The administrator cannot be removed.");
    const db = await requireArun(data.username, data.password);
    await db.from("app_users" as any).delete().eq("username", data.target);
    await db.from("user_passwords" as any).delete().eq("username", data.target);
    await db.from("user_presence" as any).delete().eq("username", data.target);
    await db.from("push_tokens" as any).delete().eq("username", data.target);
    if (data.wipe) await db.from("user_data").delete().eq("username", data.target);
    return { ok: true };
  });

export const resetPassword = createServerFn({ method: "POST" })
  .inputValidator((d) => adminIn.parse(d))
  .handler(async ({ data }) => {
    const db = await requireArun(data.username, data.password);
    await db.from("user_passwords" as any).delete().eq("username", data.target);
    await db.from("password_log" as any).insert({ username: data.target, old_password: null, new_password: DEFAULT_PASS } as any);
    return { ok: true };
  });

export async function check(username: string, password: string): Promise<{ ok: boolean; isDefault: boolean }> {
  if (!(await names()).includes(username)) return { ok: false, isDefault: false };
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.from("user_passwords" as any).select("password_hash").eq("username", username).maybeSingle();
  const row = data as { password_hash: string } | null;
  if (!row) return { ok: password === DEFAULT_PASS, isDefault: true };
  return { ok: row.password_hash === (await hash(password)), isDefault: false };
}

export const login = createServerFn({ method: "POST" })
  .inputValidator((d) => cred.parse(d))
  .handler(async ({ data }) => {
    const r = await check(data.username, data.password);
    if (r.ok) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.from("activity_log" as any).insert({ username: data.username, kind: "login" } as any);
    }
    return { ok: r.ok, isDefault: r.isDefault, username: data.username };
  });

export const changePassword = createServerFn({ method: "POST" })
  .inputValidator((d) => cred.extend({ newPassword: z.string().min(4).max(50) }).parse(d))
  .handler(async ({ data }) => {
    const r = await check(data.username, data.password);
    if (!r.ok) throw new Error("The current password is incorrect.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("user_passwords" as any)
      .upsert({ username: data.username, password_hash: await hash(data.newPassword), updated_at: new Date().toISOString() } as any);
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("password_log" as any).insert({ username: data.username, old_password: data.password, new_password: data.newPassword } as any);
    return { ok: true };
  });

export const getAll = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.from("user_data").select("username,data,updated_at");
  if (error) throw new Error(error.message);
  return (data ?? []) as { username: string; data: any; updated_at: string }[];
});

const richness = (d: any) => {
  if (!d || typeof d !== "object") return 0;
  let n = 0;
  for (const day of Object.values(d.daily ?? {})) n += Object.keys(day as object).length;
  n += Object.keys(d.chapters ?? {}).length;
  n += (d.ca?.length ?? 0) + (d.mocks?.length ?? 0) + (d.vocab?.length ?? 0);
  return n;
};

export const saveData = createServerFn({ method: "POST" })
  .inputValidator((d) => cred.extend({ payload: z.any() }).parse(d))
  .handler(async ({ data }) => {
    if (!(await check(data.username, data.password)).ok) throw new Error("Unauthorized");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Safety: never let an empty/blank payload wipe existing progress
    const { data: cur } = await supabaseAdmin.from("user_data").select("data").eq("username", data.username).maybeSingle();
    const oldR = richness(cur?.data), newR = richness(data.payload);
    if (oldR >= 5 && newR === 0) return { ok: false, blocked: true };
    const { error } = await supabaseAdmin
      .from("user_data")
      .upsert({ username: data.username, data: data.payload, updated_at: new Date().toISOString() });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const ping = createServerFn({ method: "POST" })
  .inputValidator((d) => cred.parse(d))
  .handler(async ({ data }) => {
    if (!(await check(data.username, data.password)).ok) return { ok: false };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin.from("user_presence" as any).select("last_seen").eq("username", data.username).maybeSingle();
    const last = (row as { last_seen: string } | null)?.last_seen;
    const now = new Date();
    if (!last || now.getTime() - new Date(last).getTime() > 10 * 60 * 1000) {
      await supabaseAdmin.from("activity_log" as any).insert({ username: data.username, kind: "online" } as any);
    }
    await supabaseAdmin.from("user_presence" as any).upsert({ username: data.username, last_seen: now.toISOString() } as any);
    return { ok: true };
  });

export const registerPush = createServerFn({ method: "POST" })
  .inputValidator((d) => cred.extend({ token: z.string().min(20).max(4096) }).parse(d))
  .handler(async ({ data }) => {
    if (!(await check(data.username, data.password)).ok) return { ok: false };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("push_tokens" as any).upsert({ token: data.token, username: data.username, updated_at: new Date().toISOString() } as any);
    return { ok: true };
  });

export const testPush = createServerFn({ method: "POST" })
  .inputValidator((d) => cred.parse(d))
  .handler(async ({ data }) => {
    if (!(await check(data.username, data.password)).ok) return { ok: false, sent: 0 };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { sendAll } = await import("./notify.server");
    const { data: t } = await supabaseAdmin.from("push_tokens" as any).select("token,username").eq("username", data.username);
    const list = (t ?? []) as unknown as { token: string; username: string }[];
    const { sent, stale } = await sendAll([{ username: data.username, title: "🔔 Notifications chalu!", body: "Ab time table aur rank ke reminder yahin aayenge. Bhaagna mana hai 😏" }], list);
    if (stale.length) await supabaseAdmin.from("push_tokens" as any).delete().in("token", stale);
    return { ok: true, sent };
  });

type PassRow = { username: string; old_password: string | null; new_password: string; changed_at: string };

export const getActivity = createServerFn({ method: "POST" })
  .inputValidator((d) => cred.parse(d))
  .handler(async ({ data }) => {
    const empty = { presence: [] as { username: string; last_seen: string }[], log: [] as { username: string; kind: string; at: string }[], passwords: [] as { username: string; current: string; history: PassRow[] }[] };
    if (data.username !== "arun" || !(await check(data.username, data.password)).ok) return empty;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [p, l, pw, up] = await Promise.all([
      supabaseAdmin.from("user_presence" as any).select("username,last_seen"),
      supabaseAdmin.from("activity_log" as any).select("username,kind,at").order("at", { ascending: false }).limit(100),
      supabaseAdmin.from("password_log" as any).select("username,old_password,new_password,changed_at").order("changed_at", { ascending: false }),
      supabaseAdmin.from("user_passwords" as any).select("username"),
    ]);
    const logs = (pw.data ?? []) as unknown as PassRow[];
    const hasRow = new Set(((up.data ?? []) as unknown as { username: string }[]).map((r) => r.username));
    const passwords = (await names()).map((u) => {
      const h = logs.filter((x) => x.username === u);
      const current = h[0]?.new_password ?? (hasRow.has(u) ? "(previously changed; unavailable)" : DEFAULT_PASS);
      return { username: u, current, history: h };
    });
    return {
      presence: (p.data ?? []) as unknown as { username: string; last_seen: string }[],
      log: (l.data ?? []) as unknown as { username: string; kind: string; at: string }[],
      passwords,
    };
  });
