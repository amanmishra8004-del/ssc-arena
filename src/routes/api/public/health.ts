import { createFileRoute } from "@tanstack/react-router";

// Public health-check & keep-alive endpoint.
// Ping this endpoint every few hours (via cron-job.org / UptimeRobot)
// to prevent Supabase Free Tier database from pausing and keep the server warm 24/7.
export const Route = createFileRoute("/api/public/health")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          // Lightweight ping that performs a HEAD query to keep Supabase active
          const { count, error } = await supabaseAdmin
            .from("user_data")
            .select("username", { count: "exact", head: true });

          if (error) {
            return Response.json(
              { status: "degraded", error: error.message || error.details || error.code || "db error", code: error.code, timestamp: new Date().toISOString() },
              { status: 500 },
            );
          }

          return Response.json({
            status: "ok",
            database: "connected",
            active_users: count,
            timestamp: new Date().toISOString(),
          });
        } catch (err: any) {
          return Response.json(
            { status: "error", message: err?.message ?? "unknown error", timestamp: new Date().toISOString() },
            { status: 500 },
          );
        }
      },
    },
  },
});
