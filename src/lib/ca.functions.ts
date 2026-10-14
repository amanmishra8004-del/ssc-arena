import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { CADaily } from "./ca.server";
import { check } from "./data.functions";

// India date (UTC+5:30), offset days back
const istDay = (back = 0) => new Date(Date.now() + 330 * 60000 - back * 86400000).toISOString().slice(0, 10);

// Returns the last 7 days of shared news packs. Packs are uploaded manually by the admin.
export const getDailyCA = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ username: z.string().min(1).max(30) }).parse(d))
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const today = istDay();
    const days = Array.from({ length: 7 }, (_, i) => istDay(i));
    const { data } = await supabaseAdmin.from("ca_daily" as any).select("day,items").in("day", days).order("day", { ascending: false });
    return { today, days: (data ?? []) as unknown as { day: string; items: CADaily[] }[], error: null as string | null };
  });

// Admin uploads (or replaces) one day's pack. One news point per line:
// "Category | Title | Fact | Trick" — only the fact text is required.
export const uploadDailyCA = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        username: z.string().toLowerCase().trim(),
        password: z.string(),
        day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        text: z.string().min(3).max(20000),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    if (data.username !== "arun" || !(await check(data.username, data.password)).ok)
      throw new Error("Only the administrator can upload current affairs.");
    const day = data.day ?? istDay();
    const lines = data.text.split("\n").map((l) => l.trim()).filter(Boolean).slice(0, 30);
    if (!lines.length) throw new Error("Please enter at least one news point.");
    const items: CADaily[] = lines.map((line, i) => {
      const parts = line.split("|").map((p) => p.trim());
      const [category, title, fact, trick] = parts.length >= 3 ? parts : ["General", "", parts[0] ?? "", parts[1] ?? ""];
      const f = fact || title || line;
      return {
        id: `${day}-${i}`,
        category: (category || "General").slice(0, 30),
        title: (title || f.split(" ").slice(0, 8).join(" ")).slice(0, 120),
        fact: f.slice(0, 600),
        trick: (trick ?? "").slice(0, 200),
      };
    });
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("ca_daily" as any).upsert({ day, items } as any, { onConflict: "day" });
    return { day, count: items.length };
  });
