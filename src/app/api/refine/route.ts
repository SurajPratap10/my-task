import { NextResponse } from "next/server";
import { z } from "zod";
import { asAppError, LlmError } from "@/lib/errors";
import { filtersSchema, rubricSchema } from "@/lib/schemas";
import { refineSpec, runSearch } from "@/lib/sourcing";

export const runtime = "nodejs";
export const maxDuration = 120;

const bodySchema = z.object({
  query: z.string().min(8).max(500),
  filters: filtersSchema,
  rubric: rubricSchema,
  shown: z
    .array(
      z.object({
        number: z.number().int().min(1).max(8),
        id: z.string(),
        name: z.string(),
        title: z.string(),
        years: z.number(),
        location: z.string(),
        company: z.string(),
        company_type: z.string(),
        skills: z.array(z.string()),
        score: z.number(),
      }),
    )
    .max(8),
  votes: z.record(z.string(), z.enum(["yes", "no"])),
  message: z.string().max(800),
});

export async function POST(request: Request) {
  try {
    const body = bodySchema.parse(await request.json());
    if (!body.message.trim() && Object.keys(body.votes).length === 0) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "malformed",
            message: "Mark a profile or say what to change before refining.",
            retryable: false,
          },
        },
        { status: 400 },
      );
    }
    const refined = await refineSpec(body);
    const search = await runSearch(refined.filters, refined.rubric);
    return NextResponse.json({
      ok: true,
      data: { ...refined, search },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "malformed",
            message: "Feedback could not be read. Try a shorter note.",
            retryable: true,
          },
        },
        { status: 400 },
      );
    }
    const payload = asAppError(error);
    const status = error instanceof LlmError && error.code === "config" ? 503 : 502;
    return NextResponse.json({ ok: false, error: payload }, { status });
  }
}
