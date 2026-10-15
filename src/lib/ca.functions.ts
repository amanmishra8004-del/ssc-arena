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

// Admin uploads (or replaces) one day or month pack. Supports:
// 1. JSON array: [{"category": "...", "title": "...", "fact": "...", "trick": "..."}]
// 2. Markdown category blocks: "## National" followed by items
// 3. Pipe-delimited rows: "Category | Title | Fact | Trick"
export const uploadDailyCA = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        username: z.string().toLowerCase().trim(),
        password: z.string(),
        day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        text: z.string().min(3).max(200000),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    if (data.username !== "arun" || !(await check(data.username, data.password)).ok)
      throw new Error("Only the administrator can upload current affairs.");
    const day = data.day ?? istDay();
    let items: CADaily[] = [];

    // Try parsing as JSON first
    const trimmed = data.text.trim();
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed) && parsed.length > 0) {
          items = parsed.slice(0, 200).map((p: any, i: number) => ({
            id: `${day}-${i}`,
            category: String(p.category || "General").slice(0, 40),
            title: String(p.title || p.fact || "Important Update").slice(0, 140),
            fact: String(p.fact || p.title || "").slice(0, 800),
            trick: String(p.trick || "").slice(0, 300),
          }));
        }
      } catch {}
    }

    // Fallback: Parse line-by-line with category header detection
    if (!items.length) {
      let currentCategory = "General";
      const lines = data.text.split("\n").map((l) => l.trim()).filter(Boolean);
      for (const line of lines) {
        if (items.length >= 200) break;
        // Check for markdown headers like "# National" or "## Sports" or "[Economy]"
        const headerMatch = line.match(/^#{1,4}\s*(.+)$/) || line.match(/^\[([A-Za-z\s&]+)\]$/);
        if (headerMatch) {
          currentCategory = headerMatch[1].trim();
          continue;
        }

        // Strip leading list bullet if present (-, *, 1., etc.)
        const cleanLine = line.replace(/^[\*\-\•\d+\.]\s*/, "").trim();
        if (!cleanLine) continue;

        if (cleanLine.includes("|")) {
          const parts = cleanLine.split("|").map((p) => p.trim());
          const [cat, title, fact, trick] = parts.length >= 3 ? parts : [currentCategory, "", parts[0] ?? "", parts[1] ?? ""];
          const f = fact || title || cleanLine;
          items.push({
            id: `${day}-${items.length}`,
            category: (cat || currentCategory).slice(0, 40),
            title: (title || f.split(" ").slice(0, 10).join(" ")).slice(0, 140),
            fact: f.slice(0, 800),
            trick: (trick ?? "").slice(0, 300),
          });
        } else {
          // Regular sentence or fact line
          const colonSplit = cleanLine.split(":");
          const title = colonSplit.length > 1 ? colonSplit[0].trim() : cleanLine.split(" ").slice(0, 10).join(" ");
          const fact = colonSplit.length > 1 ? colonSplit.slice(1).join(":").trim() : cleanLine;
          items.push({
            id: `${day}-${items.length}`,
            category: currentCategory.slice(0, 40),
            title: title.slice(0, 140),
            fact: fact.slice(0, 800),
            trick: "",
          });
        }
      }
    }

    if (!items.length) throw new Error("Could not parse any current affairs items from the input.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("ca_daily" as any).upsert({ day, items } as any, { onConflict: "day" });
    return { day, count: items.length };
  });
