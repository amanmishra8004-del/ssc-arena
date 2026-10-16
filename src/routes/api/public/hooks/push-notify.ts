import { createFileRoute } from "@tanstack/react-router";

async function verifyCronAuth(request: Request): Promise<boolean> {
  const envSecret = process.env["LOVABLE_CRON_SECRET"];
  const authHeader = request.headers.get("authorization") ?? "";
  const match = /^Bearer ([^\s,]+)$/.exec(authHeader);
  const token = match?.[1];

  const url = new URL(request.url);
  const querySecret = url.searchParams.get("secret");
  const provided = token || querySecret;

  if (envSecret && provided === envSecret) return true;

  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("app_secrets" as any)
      .select("value")
      .eq("name", "push_cron")
      .maybeSingle();
    const dbSecret = (data as { value: string } | null)?.value;
    if (dbSecret && provided === dbSecret) return true;
  } catch (e) {
    console.warn("Could not check app_secrets for push_cron:", e);
  }

  // If no secret has ever been set up, allow the cron request to prevent silent outage
  return !envSecret;
}

async function handlePushNotify(request: Request) {
  const isAuthorized = await verifyCronAuth(request);
  if (!isAuthorized) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { buildMessages, sendAll } = await import("@/lib/notify.server");

  const { data: tokens } = await supabaseAdmin.from("push_tokens" as any).select("token,username");
  const list = (tokens ?? []) as unknown as { token: string; username: string }[];
  if (!list.length) return Response.json({ ok: true, sent: 0, reason: "no registered devices in push_tokens" });

  const [{ data: users }, { data: rows }] = await Promise.all([
    supabaseAdmin.from("app_users" as any).select("username"),
    supabaseAdmin.from("user_data").select("username,data"),
  ]);
  let names = ((users ?? []) as unknown as { username: string }[]).map((r) => r.username);
  if (!names.length) names = ["arun", "ali", "naveen", "devansh"];

  const msgs = buildMessages(names, (rows ?? []) as { username: string; data: unknown }[]);
  if (!msgs.length) return Response.json({ ok: true, sent: 0, reason: "no messages scheduled for current time window" });

  const res = await sendAll(msgs, list);
  if (res.stale?.length) {
    await supabaseAdmin.from("push_tokens" as any).delete().in("token", res.stale);
  }
  return Response.json({ ok: true, sent: res.sent, removed: res.stale?.length ?? 0, msgs: msgs.length });
}

// Called by the scheduler: reminds players about timetable slots and rank updates.
export const Route = createFileRoute("/api/public/hooks/push-notify")({
  server: {
    handlers: {
      GET: async ({ request }) => handlePushNotify(request),
      POST: async ({ request }) => handlePushNotify(request),
    },
  },
});
