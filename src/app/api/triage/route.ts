import { z } from "zod";
import { DIVISION_NAMES } from "@/data/kampala";
import { analyzeReport } from "@/lib/gemini";

export const maxDuration = 30;

const inputSchema = z.object({
  area: z.string().trim().min(2, "Area is too short").max(80),
  division: z.enum(DIVISION_NAMES as [string, ...string[]]),
  landmark: z.string().trim().min(2, "Landmark is too short").max(120),
  depthCm: z.number().int().min(0).max(300),
  hazards: z.array(z.string().trim().min(2).max(60)).max(8).default([]),
  description: z.string().trim().max(900).default(""),
  image: z
    .object({
      mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
      data: z.string().min(100).max(2_800_000),
    })
    .optional(),
});

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 20;

function rateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const current = buckets.get(ip);
  if (!current || current.resetAt <= now) {
    buckets.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, remaining: MAX_PER_WINDOW - 1 };
  }
  if (current.count >= MAX_PER_WINDOW) {
    return { allowed: false, remaining: 0 };
  }
  current.count += 1;
  return { allowed: true, remaining: MAX_PER_WINDOW - current.count };
}

function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip") ?? "local";
}

export async function POST(request: Request) {
  const ip = clientIp(request);
  const limit = rateLimit(ip);
  if (!limit.allowed) {
    return Response.json(
      { error: "Too many triage requests. Try again in a minute." },
      { status: 429, headers: { "Cache-Control": "no-store" } },
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json(
      { error: "Expected a JSON body." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const parsed = inputSchema.safeParse(payload);
  if (!parsed.success) {
    return Response.json(
      {
        error: "Invalid report payload.",
        issues: parsed.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      },
      { status: 422, headers: { "Cache-Control": "no-store" } },
    );
  }

  const input = {
    ...parsed.data,
    division: parsed.data.division as (typeof DIVISION_NAMES)[number],
  };

  const result = await analyzeReport(input).catch(async () => {
    const { edgeTriage } = await import("@/lib/triage");
    return edgeTriage(input, {
      fallbackReason: "The triage service failed — edge fallback used.",
    });
  });

  return Response.json(
    {
      result,
      rateLimit: { remaining: limit.remaining },
    },
    {
      headers: {
        "Cache-Control": "no-store",
        "X-FloodAlert-Engine": result.engine,
      },
    },
  );
}
