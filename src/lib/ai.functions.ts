import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const vocabHelp = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ word: z.string().trim().min(1).max(60) }).parse(d))
  .handler(async ({ data }) => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("Vocabulary assistance is unavailable.");
    const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "fetch" },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        stream: true,
        store: false,
        reasoning: { effort: "low", summary: "auto" },
        include: ["reasoning.encrypted_content"],
        input: [
          { role: "system", content: "You help Indian SSC exam students memorise English vocabulary. Reply ONLY with a JSON object: {\"meaning\": short English meaning + Hindi meaning in brackets, \"trick\": a catchy Hinglish memory trick (sound-alike/story, max 30 words), \"example\": one simple English example sentence}. No markdown." },
          { role: "user", content: data.word },
        ],
      }),
    });
    if (!res.ok || !res.body) {
      if (res.status === 429) throw new Error("Too many requests. Please try again later.");
      if (res.status === 402) throw new Error("AI credits are exhausted.");
      throw new Error(`AI error ${res.status}`);
    }
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = "", text = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";
      for (const l of lines) {
        if (!l.startsWith("data:")) continue;
        const p = l.slice(5).trim();
        if (!p || p === "[DONE]") continue;
        try {
          const ev = JSON.parse(p);
          if (ev.type === "response.output_text.delta") text += ev.delta;
          if (ev.type === "error" || ev.type === "response.failed") throw new Error("No response received.");
        } catch (e) { if (e instanceof Error && e.message.startsWith("AI")) throw e; }
      }
    }
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) throw new Error("No response received. Please try again.");
    const j = JSON.parse(m[0]);
    return { meaning: String(j.meaning ?? ""), trick: String(j.trick ?? ""), example: String(j.example ?? "") };
  });
