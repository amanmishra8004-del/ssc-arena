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

const hindiRegex = /[\u0900-\u097F\uA8E0-\uA8FF]/;

export function decodeHtml(html: unknown): string {
  return String(html ?? "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
}

export function cleanText(raw: unknown): string {
  if (!raw) return "";
  return decodeHtml(raw)
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim();
}

export const cleanEnglish = cleanText;

export function cleanOptionText(raw: unknown): string {
  let s = cleanText(raw);
  // Do NOT strip if it's a person's initials like "B. N. Rao" or "B. R. Ambedkar"
  if (/^[A-Z]\.\s+[A-Z]\./.test(s)) {
    return s;
  }
  s = s.replace(/^(?:\([A-Da-d1-4]\)|[A-Da-d1-4][.):]|\bOption\s*[1-4A-Da-d][:.-]?)\s+/i, "").trim();
  return s;
}

function stripTags(html: unknown): string {
  return cleanText(
    String(html ?? "")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|li|tr|h\d|td)>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
  );
}

// 1. JSON in Script / HTML
export function extractJson(html: string): QQ[] {
  const jsonArrRegex = /\[\s*\{\s*["'][A-Za-z0-9_]+["']\s*:/g;
  let match: RegExpExecArray | null;
  while ((match = jsonArrRegex.exec(html)) !== null) {
    const start = match.index;
    let depth = 0, inStr = false, escape = false, quoteChar: string | null = null;
    let end = -1;
    for (let k = start; k < html.length; k++) {
      const c = html[k]!;
      if (inStr) {
        if (escape) escape = false;
        else if (c === "\\") escape = true;
        else if (c === quoteChar) inStr = false;
        continue;
      }
      if (c === '"' || c === "'") { inStr = true; quoteChar = c; continue; }
      if (c === "[" || c === "{") depth++;
      else if (c === "]" || c === "}") {
        depth--;
        if (depth === 0) { end = k; break; }
      }
    }
    if (end > start) {
      try {
        const jsonStr = html.slice(start, end + 1);
        let parsed: unknown;
        try {
          parsed = JSON.parse(jsonStr);
        } catch {
          parsed = JSON.parse(jsonStr.replace(/'/g, '"'));
        }
        if (Array.isArray(parsed) && parsed.length > 0) {
          const sample = parsed[0] as Record<string, unknown> | null;
          const hasQ = sample && (sample.q || sample.question || sample.question_text || sample.questionText || sample.title);
          if (hasQ) {
            const result: QQ[] = [];
            for (const rawItem of parsed) {
              const item = rawItem as Record<string, unknown>;
              const qRaw = item.q || item.question || item.question_text || item.questionText || item.title;
              const q = cleanEnglish(stripTags(qRaw));
              if (!q) continue;

              let opts: string[] = [];
              if (Array.isArray(item.options)) opts = item.options.map((o) => cleanOptionText(stripTags(o)));
              else if (Array.isArray(item.opts)) opts = item.opts.map((o) => cleanOptionText(stripTags(o)));
              else if (Array.isArray(item.choices)) opts = item.choices.map((o) => cleanOptionText(stripTags(o)));
              else {
                for (let n = 1; n <= 6; n++) {
                  const val = item[`option_${n}`] ?? item[`option${n}`] ?? item[`opt_${n}`] ?? item[`opt${n}`] ?? item[`choice_${n}`];
                  if (val != null) opts.push(cleanOptionText(stripTags(val)));
                }
              }
              opts = opts.filter(Boolean);
              if (opts.length < 2) continue;

              let ansIdx = 0;
              const ansRaw = item.answer ?? item.ans ?? item.correct ?? item.correct_option ?? item.correctOption ?? item.right_answer;
              if (typeof ansRaw === "number") {
                ansIdx = Array.isArray(item.options) ? ansRaw : ansRaw - 1;
              } else if (typeof ansRaw === "string") {
                const upper = ansRaw.trim().toUpperCase();
                if (/^[A-D]$/.test(upper)) ansIdx = upper.charCodeAt(0) - 65;
                else if (/^[1-6]$/.test(upper)) ansIdx = Number(upper) - 1;
                else {
                  const matched = opts.findIndex((o) => o.toLowerCase() === ansRaw.trim().toLowerCase());
                  if (matched >= 0) ansIdx = matched;
                }
              }
              ansIdx = Math.max(0, Math.min(opts.length - 1, Number.isFinite(ansIdx) ? ansIdx : 0));

              const explainRaw = item.explain ?? item.explanation ?? item.solution ?? item.solution_text ?? "";
              const explain = cleanEnglish(stripTags(explainRaw)).slice(0, 500);

              result.push({ q, options: opts, answer: ansIdx, explain });
            }
            if (result.length > 0) return result;
          }
        }
      } catch {}
    }
  }
  return [];
}

// 2. TCS iON / SSC / Exam portal table or container parser
export function extractFromExamContainers(html: string): QQ[] {
  const questions: QQ[] = [];
  const blockRegex = /<(?:table|div)[^>]*class=["'][^"']*(?:questionPnl|menu-tbl|question-block|question-container|test-question|q-item|que\b)[^"']*["'][^>]*>([\s\S]*?)<\/(?:table|div)>/gi;
  let blockMatch: RegExpExecArray | null;

  while ((blockMatch = blockRegex.exec(html)) !== null) {
    const block = blockMatch[1]!;

    let qText = "";
    const qRowMatch = /<td[^>]*>\s*Q\.?\s*\d+[^<]*<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/i.exec(block)
      || /<(?:td|div|p|span)[^>]*class=["'][^"']*(?:question-text|qtext|q-title|questionTitle|que-text)[^"']*["'][^>]*>([\s\S]*?)<\/(?:td|div|p|span)>/i.exec(block)
      || /Q\.?\s*\d+[:.)\s]?\s*([^<]+)/i.exec(block);

    if (qRowMatch && qRowMatch[1]) {
      qText = cleanEnglish(stripTags(qRowMatch[1]));
    } else {
      const lines = stripTags(block).split("\n").map((l) => l.trim()).filter(Boolean);
      const firstNonOpt = lines.find((l) => !/^Option\s*\d/i.test(l));
      if (firstNonOpt) qText = cleanEnglish(firstNonOpt);
    }
    qText = qText.replace(/^(?:Q(?:uestion)?\.?\s*\d+[:.)\s]*|\d+[:.)\s]+)/i, "").trim();
    if (!qText) continue;

    const options: string[] = [];
    let correctIdx = -1;

    const rowRegex = /<tr([^>]*)>([\s\S]*?)<\/tr>/gi;
    let rowMatch: RegExpExecArray | null;
    while ((rowMatch = rowRegex.exec(block)) !== null) {
      const trAttrs = rowMatch[1]!;
      const trContent = rowMatch[2]!;
      if (/Option\s*\d/i.test(trContent) || /rightAns/i.test(trAttrs)) {
        const isCorrect = /rightAns|right_ans|correct/i.test(trAttrs) || /rightAns|right_ans|tick\.png/i.test(trContent);
        const tds = [...trContent.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((m) => m[1]);
        const textTd = tds.length > 1 ? tds[tds.length - 1] : tds[0];
        if (textTd) {
          const optText = cleanOptionText(stripTags(textTd));
          if (optText && !/^Option\s*\d$/i.test(optText)) {
            if (isCorrect) correctIdx = options.length;
            options.push(optText);
          }
        }
      }
    }

    if (options.length < 2) {
      const optRegex = /<(?:li|div|label)[^>]*class=["'][^"']*(?:opt|choice|radio)[^"']*["'][^>]*>([\s\S]*?)<\/(?:li|div|label)>/gi;
      let optMatch: RegExpExecArray | null;
      while ((optMatch = optRegex.exec(block)) !== null) {
        const optHtml = optMatch[0];
        const isCorrect = /correct|right|is-correct|text-success|data-correct=["']true["']/i.test(optHtml);
        const optText = cleanOptionText(stripTags(optMatch[1]));
        if (optText) {
          if (isCorrect) correctIdx = options.length;
          options.push(optText);
        }
      }
    }

    let explain = "";
    const expMatch = /<(?:div|p|span)[^>]*class=["'][^"']*(?:explanation|solution|sol)[^"']*["'][^>]*>([\s\S]*?)<\/(?:div|p|span)>/i.exec(block);
    if (expMatch && expMatch[1]) explain = cleanEnglish(stripTags(expMatch[1])).slice(0, 500);

    if (options.length >= 2) {
      questions.push({
        q: qText,
        options,
        answer: Math.max(0, correctIdx),
        explain,
      });
    }
  }

  return questions;
}

// 3. Radio inputs parser (common in web forms and saved online mock tests)
export function extractFromRadioInputs(html: string): QQ[] {
  const radioRegex = /<input[^>]*type=["']radio["'][^>]*>/gi;
  if (!radioRegex.test(html)) return [];

  const nameRegex = /<input[^>]*name=["']([^"']+)["'][^>]*type=["']radio["'][^>]*>|<input[^>]*type=["']radio["'][^>]*name=["']([^"']+)["'][^>]*>/gi;
  const groups = new Map<string, Array<{ index: number; fullTag: string }>>();
  let m: RegExpExecArray | null;
  while ((m = nameRegex.exec(html)) !== null) {
    const groupName = m[1] || m[2];
    if (!groupName) continue;
    if (!groups.has(groupName)) groups.set(groupName, []);
    groups.get(groupName)!.push({ index: m.index, fullTag: m[0] });
  }

  const questions: QQ[] = [];
  let prevEnd = 0;

  for (const [, inputs] of groups) {
    if (inputs.length < 2) continue;
    const firstInputIdx = inputs[0]!.index;

    const beforeHtml = html.slice(prevEnd, firstInputIdx);
    const pMatches = [...beforeHtml.matchAll(/<(?:p|div|h\d|td|legend|label)[^>]*>([\s\S]*?)<\/(?:p|div|h\d|td|legend|label)>/gi)];
    const qRaw = pMatches.length > 0 ? pMatches[pMatches.length - 1]![1] : beforeHtml.slice(-500);
    const q = cleanEnglish(stripTags(qRaw)).replace(/^(?:Q(?:uestion)?\.?\s*\d+[:.)\s]*|\d+[:.)\s]+)/i, "").trim();

    const options: string[] = [];
    let correctIdx = -1;

    for (let i = 0; i < inputs.length; i++) {
      const input = inputs[i]!;
      const isCorrect = /checked|data-correct|rightAns|correct/i.test(input.fullTag);
      const afterStart = input.index + input.fullTag.length;
      const nextInputIdx = i < inputs.length - 1 ? inputs[i + 1]!.index : html.indexOf("</form>", afterStart);
      const sliceEnd = nextInputIdx > afterStart ? nextInputIdx : afterStart + 300;
      const optHtml = html.slice(afterStart, sliceEnd);

      const idMatch = /id=["']([^"']+)["']/i.exec(input.fullTag);
      let optText = "";
      if (idMatch && idMatch[1]) {
        const forRegex = new RegExp(`<label[^>]*for=["']${idMatch[1]}["'][^>]*>([\\s\\S]*?)<\\/label>`, "i");
        const forMatch = forRegex.exec(html);
        if (forMatch && forMatch[1]) optText = cleanOptionText(stripTags(forMatch[1]));
      }

      if (!optText) {
        const cut = optHtml.split(/<br\s*\/?>|<\/label>|<\/p>|<\/div>|<\/li>/i)[0];
        optText = cleanOptionText(stripTags(cut));
      }

      if (optText) {
        if (isCorrect) correctIdx = options.length;
        options.push(optText);
      }
    }

    prevEnd = inputs[inputs.length - 1]!.index;

    if (q && options.length >= 2) {
      questions.push({
        q,
        options,
        answer: Math.max(0, correctIdx),
        explain: "",
      });
    }
  }

  return questions;
}

// 4. Fallback: Full Text / HTML Heuristic Parser
export function extractFromText(html: string): QQ[] {
  const text = String(html ?? "")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<(?:input|option|tr|li|div)[^>]*?(?:rightAns|right_ans|is-correct|data-correct|checked|selected)[^>]*>/gi, " [CORRECT-MARK] ")
    .replace(/<img[^>]*?(?:tick|correct|right)[^>]*>/gi, " [CORRECT-MARK] ")
    .replace(/<(?:[a-z0-9]+)[^>]*?(?:color:\s*(?:green|#00[89a-f]|#0[89a-f]0)|color=["']green["'])[^>]*>/gi, " [CORRECT-MARK] ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|tr|h\d|td|article|section)>/gi, "\n")
    .replace(/<[^>]+>/g, " ");

  const decoded = decodeHtml(text);
  const rawLines = decoded.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  const qBlocks: string[][] = [];
  let currentBlock: string[] = [];

  const isQStart = (l: string) => /^(?:Q(?:uestion)?\.?\s*\d+[:.)\s]|\(?\s*\d+\s*\)\s+|\d+[:.)]\s+)/i.test(l);

  for (const line of rawLines) {
    if (isQStart(line) && currentBlock.length > 0) {
      const hasOpts = currentBlock.some((l) => /^(?:\[CORRECT-MARK\]\s*)?(?:\(?\s*[A-Da-d1-4]\s*[.):]|\bOption\s*[1-4A-Da-d]\b)/i.test(l));
      if (hasOpts) {
        qBlocks.push(currentBlock);
        currentBlock = [line];
        continue;
      }
    }
    currentBlock.push(line);
  }
  if (currentBlock.length > 0) qBlocks.push(currentBlock);

  const parsedQuestions: QQ[] = [];

  for (const block of qBlocks) {
    const qLines: string[] = [];
    const options: string[] = [];
    let ansIdx = -1;
    const explainLines: string[] = [];
    let state: "q" | "opts" | "exp" = "q";

    for (const rawLine of block) {
      const line = rawLine.trim();

      const ansMatch = /(?:(?:Ans(?:wer)?|Correct(?:\s+Option|\s+Answer)?|Right(?:\s+Option|\s+Answer)?)\s*(?:is\s*)?[:.-]?\s*\(?\s*([A-Da-d1-4])|Option\s*\(?\s*([A-Da-d1-4])\s*\)?\s*(?:is\s*correct|is\s*the\s*correct)|(?:^|\s)Key\s*[:.-]\s*([A-Da-d1-4]))/i.exec(line);
      if (ansMatch) {
        const val = (ansMatch[1] || ansMatch[2] || ansMatch[3])!.toUpperCase();
        if (/^[A-D]$/.test(val)) ansIdx = val.charCodeAt(0) - 65;
        else if (/^[1-4]$/.test(val)) ansIdx = Number(val) - 1;
        state = "exp";
        continue;
      }

      if (/^(?:Explanation|Solution|Sol|Detail)\s*[:.-]/i.test(line)) {
        state = "exp";
        explainLines.push(line.replace(/^(?:Explanation|Solution|Sol|Detail)\s*[:.-]?\s*/i, ""));
        continue;
      }

      if (state === "exp") {
        explainLines.push(line);
        continue;
      }

      const isCorrectMarked = /\[CORRECT-MARK\]|^\s*[*✓✔]/i.test(line);
      const cleanLine = line.replace(/\[CORRECT-MARK\]|^\s*[*✓✔]\s*/gi, "").trim();

      const optMatch = /^(?:\(?\s*([A-Da-d1-4])\s*[.):]|\bOption\s*([1-4A-Da-d])\s*[:.-]?)\s*(.*)/i.exec(cleanLine);
      if (optMatch) {
        state = "opts";
        const optText = cleanOptionText(optMatch[3] || cleanLine);
        if (optText) {
          if (isCorrectMarked) ansIdx = options.length;
          options.push(optText);
        }
        continue;
      }

      if (state === "opts") {
        if (options.length > 0 && !isQStart(cleanLine)) {
          options[options.length - 1] += " " + cleanOptionText(cleanLine);
        }
      } else {
        qLines.push(cleanLine);
      }
    }

    const q = cleanEnglish(qLines.join("\n")).replace(/^(?:Q(?:uestion)?\.?\s*\d+[:.)\s]*|\d+[:.)\s]+)/i, "").trim();
    if (q && options.length >= 2) {
      parsedQuestions.push({
        q,
        options,
        answer: Math.max(0, ansIdx >= 0 ? ansIdx : 0),
        explain: cleanEnglish(explainLines.join(" ")).slice(0, 500),
      });
    }
  }

  return parsedQuestions;
}

// Master parser that runs through all strategies
export function parseQuizHtml(html: string): QQ[] {
  // 1. Try embedded JSON / script literal
  const jsonQs = extractJson(html);
  if (jsonQs.length > 0) return jsonQs;

  // 2. Try exam containers (TCS iON / SSC / Testbook / portal markup)
  const domQs = extractFromExamContainers(html);
  if (domQs.length > 0) return domQs;

  // 3. Try radio input groups
  const radioQs = extractFromRadioInputs(html);
  if (radioQs.length > 0) return radioQs;

  // 4. Try text heuristic parsing
  const textQs = extractFromText(html);
  if (textQs.length > 0) return textQs;

  return [];
}

export const createQuiz = createServerFn({ method: "POST" })
  .inputValidator((d) => cred.extend({ html: z.string().min(20).max(5_000_000), title: z.string().trim().min(1).max(120), chapter: z.string().max(200).nullable(), day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable() }).parse(d))
  .handler(async ({ data }) => {
    const sb = await db(data.username, data.password, true);
    const qs: QQ[] = parseQuizHtml(data.html);
    if (!qs.length) {
      throw new Error("No questions could be read from this file. Please verify that the HTML file contains questions with options.");
    }
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
      quizzes: (qz ?? []).map(({ hidden, ...q }) => ({ ...q, questions: q.questions as unknown as QQ[], expired: Boolean(hidden) })),
      attempts: at ?? [],
    };
  });

export const submitQuiz = createServerFn({ method: "POST" })
  .inputValidator((d) => cred.extend({ quizId: z.string().uuid(), answers: z.array(z.number().int()) }).parse(d))
  .handler(async ({ data }) => {
    const sb = await db(data.username, data.password);
    const { data: q } = await sb.from("quizzes").select("id,chapter,title,questions").eq("id", data.quizId).maybeSingle();
    if (!q) throw new Error("This quiz no longer exists.");
    const qs = q.questions as unknown as QQ[];
    const score = qs.reduce((a, x, i) => a + (data.answers[i] === x.answer ? 1 : 0), 0);
    const { error } = await sb.from("quiz_attempts").insert({ quiz_id: data.quizId, username: data.username, score, total: qs.length, answers: data.answers });
    if (error) throw new Error(error.message);

    if (q.chapter && !q.chapter.startsWith("test:")) {
      try {
        const { data: uRow } = await sb.from("user_data").select("payload").eq("username", data.username).maybeSingle();
        if (uRow && uRow.payload) {
          const payload = typeof uRow.payload === "string" ? JSON.parse(uRow.payload) : uRow.payload;
          payload.chapters = payload.chapters ?? {};
          payload.chapters[q.chapter] = {
            ...(payload.chapters[q.chapter] ?? {}),
            quiz: `${score}/${qs.length}`,
          };
          await sb.from("user_data").upsert(
            { username: data.username, payload, updated_at: new Date().toISOString() },
            { onConflict: "username" }
          );
        }
      } catch (err) {
        console.error("Could not sync quiz mark to chapter:", err);
      }
    }

    return { score, total: qs.length };
  });

export const deleteQuiz = createServerFn({ method: "POST" })
  .inputValidator((d) => cred.extend({ quizId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const sb = await db(data.username, data.password, true);
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
