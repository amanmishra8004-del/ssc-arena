import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { check } from "./data.functions";

export type QQ = { q: string; options: string[]; answer: number; explain?: string };
const cred = z.object({ username: z.string().toLowerCase().trim(), password: z.string() });

async function db(username: string, password: string, admin = false) {
  if (!(await check(username, password)).ok) throw new Error("Please sign in again.");
  if (admin && username !== "arun") throw new Error("Only the administrator can manage quizzes.");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

const clean = (s: unknown) => String(s ?? "")
  .replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<br\s*\/?>/gi, " ").replace(/<[^>]+>/g, " ")
  .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
  .replace(/\s+/g, " ").replace(/\s+([?.,])/g, "$1").trim();

// Converts a JS array/object literal (unquoted keys, single quotes, trailing commas) into JSON text.
function jsToJson(src: string) {
  let out = "", i = 0;
  while (i < src.length) {
    const c = src[i]!;
    if (c === '"' || c === "'" || c === "`") {
      let j = i + 1, s = "";
      while (j < src.length && src[j] !== c) { if (src[j] === "\\") { s += src[j]! + src[j + 1]!; j += 2; } else { s += src[j]; j++; } }
      if (c !== '"') s = s.replace(/\\'/g, "'").replace(/(?<!\\)"/g, '\\"').replace(/\n/g, "\\n");
      out += `"${s}"`; i = j + 1; continue;
    }
    if (c === "/" && src[i + 1] === "/") { while (i < src.length && src[i] !== "\n") i++; continue; }
    if (/[A-Za-z_$]/.test(c)) {
      const m = /^[A-Za-z_$][\w$]*/.exec(src.slice(i))![0];
      const rest = src.slice(i + m.length).match(/^\s*(.)/)?.[1];
      out += rest === ":" ? `"${m}"` : m; i += m.length; continue;
    }
    out += c; i++;
  }
  return out.replace(/,(\s*[\]}])/g, "$1");
}

// Reads quiz pages that define `const questions = [{q:"..", o:[..], a:2, e:".."}]` in a script.
function extractJsLiteral(html: string): QQ[] {
  const m = /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*\[\s*\{/.exec(html);
  if (!m) return [];
  const name = m[1]!;
  let i = html.indexOf("[", m.index), depth = 0, end = -1, q: string | null = null;
  for (let k = i; k < html.length; k++) {
    const c = html[k]!;
    if (q) { if (c === "\\") k++; else if (c === q) q = null; continue; }
    if (c === '"' || c === "'" || c === "`") q = c; else if (c === "[" || c === "{") depth++; else if (c === "]" || c === "}") { depth--; if (depth === 0) { end = k; break; } }
  }
  if (end < 0) return [];
  let arr: Record<string, unknown>[];
  try { arr = JSON.parse(jsToJson(html.slice(i, end + 1))); } catch { return []; }
  if (!Array.isArray(arr)) return [];
  // Apply later corrections like questions[2].a=2; questions[2].e="...";
  const re = new RegExp(`${name.replace(/\$/g, "\\$")}\\[(\\d+)\\]\\.(\\w+)\\s*=\\s*("(?:[^"\\\\]|\\\\.)*"|'(?:[^'\\\\]|\\\\.)*'|-?\\d+)`, "g");
  for (const o of html.slice(end).matchAll(re)) {
    const row = arr[Number(o[1])]; if (!row) continue;
    const v = o[3]!; row[o[2]!] = /^-?\d+$/.test(v) ? Number(v) : v.slice(1, -1).replace(/\\(["'\\])/g, "$1");
  }
  return arr.map((x) => {
    const optsRaw = x["o"] ?? x["options"] ?? x["opts"] ?? x["choices"];
    const opts = Array.isArray(optsRaw) ? optsRaw.map(clean) : [1, 2, 3, 4, 5, 6].map((n) => clean(x[`option_${n}`])).filter(Boolean);
    const raw = Number(x["a"] ?? x["answer"] ?? x["ans"] ?? x["correct"]);
    const answer = Array.isArray(optsRaw) ? raw : raw - 1;
    return { q: clean(x["q"] ?? x["question"]), options: opts, answer: Math.max(0, Math.min(opts.length - 1, Number.isFinite(answer) ? answer : 0)), explain: clean(x["e"] ?? x["explain"] ?? x["explanation"] ?? x["solution"] ?? "").slice(0, 400) };
  }).filter((x) => x.q && x.options.length >= 2);
}

// Direct read of quiz pages that embed questions as JSON (e.g. {"question", "option_1".., "answer": "2"}). Exact and free.
function extractJson(html: string): QQ[] {
  const start = html.indexOf('"question"');
  if (start < 0) return extractJsLiteral(html);
  let i = html.lastIndexOf("[", start);
  while (i >= 0) {
    let depth = 0, inStr = false, end = -1;
    for (let k = i; k < html.length; k++) {
      const c = html[k];
      if (inStr) { if (c === "\\") k++; else if (c === '"') inStr = false; continue; }
      if (c === '"') inStr = true; else if (c === "[" || c === "{") depth++; else if (c === "]" || c === "}") { depth--; if (depth === 0) { end = k; break; } }
    }
    if (end > start) {
      try {
        const arr = JSON.parse(html.slice(i, end + 1));
        if (Array.isArray(arr) && arr.some((x) => x && typeof x === "object" && "question" in x)) {
          return arr.filter((x) => x && x.question).map((x) => {
            const opts: string[] = Array.isArray(x.options) ? x.options.map(clean) : [1, 2, 3, 4, 5, 6].map((n) => clean(x[`option_${n}`])).filter(Boolean);
            const raw = Number(x.answer ?? x.correct ?? x.correct_option);
            const answer = Array.isArray(x.options) ? raw : raw - 1;
            return { q: clean(x.question), options: opts, answer: Math.max(0, Math.min(opts.length - 1, Number.isFinite(answer) ? answer : 0)), explain: clean(x.solution_text ?? x.explanation ?? "").slice(0, 400) };
          }).filter((x) => x.q && x.options.length >= 2);
        }
      } catch { /* try an outer bracket */ }
    }
    i = html.lastIndexOf("[", i - 1);
    if (start - i > 5000) break;
  }
  return extractJsLiteral(html);
}

function htmlToText(html: string) {
  // Many quiz pages keep questions inside <script> data (JSON with \uXXXX escapes): keep and decode it.
  const decode = (s: string) => s.replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16))).replace(/\\"/g, '"').replace(/\\\//g, "/").replace(/\\n/g, "\n");
  return html
    .replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, (_, js: string) => (/question|option|answer/i.test(js) ? `\n${decode(js)}\n` : " "))
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<(input|option)[^>]*?(checked|selected|data-correct|correct)[^>]*>/gi, " [MARKED-CORRECT] ")
    .replace(/<(br|\/p|\/div|\/li|\/tr|\/h\d)[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n").trim();
}

async function ai(system: string, user: string) {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("Quiz reading is unavailable.");
  const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "fetch" },
    body: JSON.stringify({
      model: "openai/gpt-6-astra", stream: true, store: false,
      reasoning: { effort: "low", summary: "auto" }, include: ["reasoning.encrypted_content"],
      input: [{ role: "system", content: system }, { role: "user", content: user }],
    }),
  });
  if (!res.ok || !res.body) {
    console.error(`Quiz AI failed [${res.status}]: ${await res.text().catch(() => "")}`);
    throw new Error(res.status === 402 ? "AI credits are exhausted." : res.status === 429 ? "Service is busy. Please try again later." : `AI error ${res.status}`);
  }
  const reader = res.body.getReader(); const dec = new TextDecoder();
  let buf = "", text = "";
  for (;;) {
    const { done, value } = await reader.read(); if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split("\n"); buf = lines.pop() ?? "";
    for (const l of lines) {
      if (!l.startsWith("data:")) continue;
      try { const ev = JSON.parse(l.slice(5).trim()); if (ev.type === "response.output_text.delta") text += ev.delta; } catch { /* skip */ }
    }
  }
  return text;
}

export const createQuiz = createServerFn({ method: "POST" })
  .inputValidator((d) => cred.extend({ html: z.string().min(20).max(3_000_000), title: z.string().trim().min(1).max(120), chapter: z.string().max(200).nullable(), day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable() }).parse(d))
  .handler(async ({ data }) => {
    const sb = await db(data.username, data.password, true);
    let qs: QQ[] = extractJson(data.html);
    if (!qs.length && data.chapter?.startsWith("test:")) throw new Error("No questions could be read from this file. Please check the file format.");
    if (!qs.length) {
      const text = htmlToText(data.html).slice(0, 120_000);
      const out = await ai(
        `You extract multiple-choice questions from a quiz page (converted from HTML to text). Extract EVERY question exactly as written with its 4 options (if more or fewer, keep them as given, 2-6 options). Use the correct answer given in the file (answer keys, "Correct answer", "Ans", [MARKED-CORRECT] markers, solutions). Only if no answer is given anywhere for a question, work it out yourself. Keep the original language. If a short solution/explanation exists, include it (max 40 words).
Reply ONLY JSON: {"questions":[{"q": string, "options": string[], "answer": 0-based index, "explain": string}]}. No markdown.`,
        text,
      );
      const m = out.match(/\{[\s\S]*\}/);
      if (!m) throw new Error("No questions were found in this file.");
      qs = ((JSON.parse(m[0]).questions ?? []) as QQ[])
        .filter((x) => x?.q && Array.isArray(x.options) && x.options.length >= 2)
        .map((x) => ({ q: String(x.q), options: x.options.map(String), answer: Math.max(0, Math.min(x.options.length - 1, Number(x.answer) || 0)), explain: x.explain ? String(x.explain) : "" }));
    }
    if (!qs.length) throw new Error("No questions were found in this file.");
    const { data: row, error } = await sb.from("quizzes").insert({ title: data.title, chapter: data.chapter, day: data.day, questions: qs }).select("id").single();
    if (error) throw new Error(error.message);
    return { id: row.id, count: qs.length };
  });

export const listQuizzes = createServerFn({ method: "POST" })
  .inputValidator((d) => cred.parse(d))
  .handler(async ({ data }) => {
    const sb = await db(data.username, data.password);
    const [{ data: qz }, { data: at }] = await Promise.all([
      sb.from("quizzes").select("id,title,chapter,day,questions,created_at,hidden").order("created_at", { ascending: false }),
      sb.from("quiz_attempts").select("quiz_id,username,score,total,answers,at").order("at", { ascending: true }),
    ]);
    return {
      quizzes: (qz ?? []).map(({ hidden, ...q }) => ({ ...q, questions: q.questions as unknown as QQ[], expired: hidden || Date.now() - new Date(q.created_at).getTime() > (q.chapter?.startsWith("test:") ? 2 : 7) * 86400000 })),
      attempts: at ?? [],
    };
  });

export const submitQuiz = createServerFn({ method: "POST" })
  .inputValidator((d) => cred.extend({ quizId: z.string().uuid(), answers: z.array(z.number().int()) }).parse(d))
  .handler(async ({ data }) => {
    const sb = await db(data.username, data.password);
    const { data: q } = await sb.from("quizzes").select("questions").eq("id", data.quizId).maybeSingle();
    if (!q) throw new Error("This quiz no longer exists.");
    const qs = q.questions as unknown as QQ[];
    const score = qs.reduce((a, x, i) => a + (data.answers[i] === x.answer ? 1 : 0), 0);
    const { error } = await sb.from("quiz_attempts").insert({ quiz_id: data.quizId, username: data.username, score, total: qs.length, answers: data.answers });
    if (error) throw new Error(error.message);
    return { score, total: qs.length };
  });

export const deleteQuiz = createServerFn({ method: "POST" })
  .inputValidator((d) => cred.extend({ quizId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const sb = await db(data.username, data.password, true);
    // Hard delete: remove attempts first, then the quiz — gone from the cloud instantly.
    await sb.from("quiz_attempts").delete().eq("quiz_id", data.quizId);
    const { error } = await sb.from("quizzes").delete().eq("id", data.quizId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteResults = createServerFn({ method: "POST" })
  .inputValidator((d) => cred.extend({ quizId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const sb = await db(data.username, data.password, true);
    const { error } = await sb.from("quiz_attempts").delete().eq("quiz_id", data.quizId);
    if (error) throw new Error(error.message);
    await sb.from("quizzes").delete().eq("id", data.quizId);
    return { ok: true };
  });
