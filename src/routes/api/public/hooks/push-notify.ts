import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

// Called by the managed scheduler at 5, 7 and 9 PM (IST): reminds everyone to update tasks & syllabus.
export const Route = createFileRoute("/api/public/hooks/push-notify")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authFailure = await authenticateCronRequest(request);
        if (authFailure) return authFailure;
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { buildMessages, sendAll } = await import("@/lib/notify.server");
        const { data: tokens } = await supabaseAdmin.from("push_tokens" as any).select("token,username");
        const list = (tokens ?? []) as unknown as { token: string; username: string }[];
        if (!list.length) return Response.json({ sent: 0, reason: "no devices" });

        const [{ data: users }, { data: rows }] = await Promise.all([
          supabaseAdmin.from("app_users" as any).select("username"),
          supabaseAdmin.from("user_data").select("username,data"),
        ]);
        let names = ((users ?? []) as unknown as { username: string }[]).map((r) => r.username);
        if (!names.length) names = ["arun", "ali", "naveen", "devansh"];

        const msgs = buildMessages(names, (rows ?? []) as { username: string; data: unknown }[]);
        if (!msgs.length) return Response.json({ sent: 0 });
        const { sent, stale } = await sendAll(msgs, list);
        if (stale.length) await supabaseAdmin.from("push_tokens" as any).delete().in("token", stale);
        return Response.json({ sent, removed: stale.length });
      },
    },
  },
});
