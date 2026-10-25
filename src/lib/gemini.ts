import { z } from "zod";
import { CITY, DIVISION_NAMES } from "@/data/kampala";
import { edgeTriage, hazardLabel } from "@/lib/triage";
import type { TriageInput, TriageResult } from "@/lib/types";

const geminiResultSchema = z.object({
  severity: z.enum(["low", "moderate", "severe", "critical"]),
  confidence: z.number().min(0).max(1),
  headline: z.string().min(4).max(120),
  summary: z.string().min(20).max(700),
  hazards: z.array(z.string().min(2).max(60)).max(8),
  actions: z.array(z.string().min(8).max(220)).min(2).max(5),
  alertEn: z.string().min(20).max(360),
  alertLg: z.string().min(20).max(360),
  escalate: z.boolean(),
});

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    severity: {
      type: "STRING",
      enum: ["low", "moderate", "severe", "critical"],
    },
    confidence: { type: "NUMBER" },
    headline: { type: "STRING" },
    summary: { type: "STRING" },
    hazards: { type: "ARRAY", items: { type: "STRING" } },
    actions: { type: "ARRAY", items: { type: "STRING" } },
    alertEn: { type: "STRING" },
    alertLg: { type: "STRING" },
    escalate: { type: "BOOLEAN" },
  },
  required: [
    "severity",
    "confidence",
    "headline",
    "summary",
    "hazards",
    "actions",
    "alertEn",
    "alertLg",
    "escalate",
  ],
  propertyOrdering: [
    "severity",
    "confidence",
    "headline",
    "summary",
    "hazards",
    "actions",
    "alertEn",
    "alertLg",
    "escalate",
  ],
};

const SYSTEM_PROMPT = `You are FloodAlert, a flood triage assistant for Kampala, Uganda. You support community reporters and the KCCA emergency desk. You are not the emergency service, and you never claim that help has been dispatched.

Severity rubric:
- critical: immediate life safety risk — people trapped or stranded, a downed power line, water depth >= 60 cm, hospital access cut, or a vulnerable person in danger.
- severe: water depth >= 30 cm, fast-moving water, an open drain or sewage affecting homes or a main route, or a school route blocked.
- moderate: water depth 10–29 cm or a localized hazard with no immediate danger.
- low: water below 10 cm and no meaningful hazard.

Rules:
- Be factual, calm and concise. Never invent details that are not in the report or visible in the photo.
- If the photo is unclear or conflicts with the text, say so in the summary and lower confidence.
- Keep the summary to two or three sentences for a busy responder.
- Give 3–5 imperative safety actions for residents. Mention KCCA on ${CITY.kcca} when escalation is needed. Mention UEDCL on ${CITY.uedcl} for downed power lines.
- alertEn is an SMS-ready alert, at most 320 characters, including the area, depth, one action, and emergency 999.
- alertLg is a faithful, simple Luganda translation of alertEn. Keep place names unchanged. Do not add new hazards.
- Do not identify people in photos. Do not include names or phone numbers.
- No emojis, hashtags or markdown.`;

function buildPrompt(input: TriageInput): string {
  const hazards =
    input.hazards.length > 0
      ? input.hazards.map(hazardLabel).join(", ")
      : "none selected";

  return `Analyse this flood report for Kampala.

Area: ${input.area}
Division: ${input.division}
Landmark: ${input.landmark}
Reporter depth estimate: ${input.depthCm} cm
Hazards selected: ${hazards}
Description: ${input.description || "(no description)"}

An attached photo, if present, is a ground-level report from the reporter. Use it only for visible flood indicators (water depth relative to people, vehicles, steps or walls; colour/turbidity; debris; fast flow). Do not infer location from the image.

Return the JSON object described by the schema.`;
}

function readText(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const candidates = (data as { candidates?: unknown[] }).candidates;
  if (!Array.isArray(candidates) || candidates.length === 0) return null;
  const content = (candidates[0] as { content?: { parts?: unknown[] } })
    .content;
  if (!content?.parts) return null;
  const text = content.parts
    .map((part) =>
      part &&
      typeof part === "object" &&
      typeof (part as { text?: unknown }).text === "string"
        ? (part as { text: string }).text
        : "",
    )
    .join("");
  return text.trim() || null;
}

export async function geminiTriage(
  input: TriageInput,
): Promise<TriageResult> {
  const apiKey =
    process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY ?? "";
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const model = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
  const startedAt = Date.now();
  const parts: Array<Record<string, unknown>> = [
    { text: buildPrompt(input) },
  ];

  if (input.image?.data) {
    parts.push({
      inlineData: {
        mimeType: input.image.mimeType,
        data: input.image.data,
      },
    });
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(16_000),
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: "user", parts }],
        generationConfig: {
          temperature: 0.15,
          topP: 0.9,
          maxOutputTokens: 1_100,
          responseMimeType: "application/json",
          responseSchema: RESPONSE_SCHEMA,
          thinkingConfig: { thinkingBudget: 0 },
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_ONLY_HIGH",
          },
        ],
      }),
    },
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Gemini ${response.status}: ${body.slice(0, 240)}`,
    );
  }

  const data = (await response.json()) as unknown;
  const text = readText(data);
  if (!text) throw new Error("Gemini returned no text");

  let parsed: z.infer<typeof geminiResultSchema>;
  try {
    parsed = geminiResultSchema.parse(JSON.parse(text));
  } catch (error) {
    throw new Error(
      `Gemini returned an invalid triage object: ${
        error instanceof Error ? error.message : "unknown parse error"
      }`,
    );
  }

  return {
    engine: "gemini",
    model,
    severity: parsed.severity,
    confidence: Math.round(parsed.confidence * 100) / 100,
    headline: parsed.headline.trim(),
    summary: parsed.summary.trim(),
    hazards: parsed.hazards.map((hazard) => hazard.trim()).slice(0, 8),
    actions: parsed.actions.map((action) => action.trim()).slice(0, 5),
    alertEn: parsed.alertEn.trim(),
    alertLg: parsed.alertLg.trim(),
    escalate: parsed.escalate,
    latencyMs: Date.now() - startedAt,
  };
}

/**
 * Tries Gemini first, then always returns a usable triage result from the
 * deterministic edge model. The UI is told which engine answered.
 */
export async function analyzeReport(
  input: TriageInput,
): Promise<TriageResult> {
  const apiKey =
    process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY ?? "";
  if (!apiKey) {
    return edgeTriage(input, {
      fallbackReason:
        "GEMINI_API_KEY is not configured — the on-device edge model answered.",
    });
  }

  try {
    return await geminiTriage(input);
  } catch (error) {
    console.warn(
      "[FloodAlert] Gemini triage failed, using edge fallback",
      error instanceof Error ? error.message : error,
    );
    return edgeTriage(input, {
      fallbackReason:
        "Gemini was unavailable — the on-device edge model answered instead.",
    });
  }
}

export const TRIAGE_DIVISIONS = DIVISION_NAMES;
