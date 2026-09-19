import { NextResponse } from "next/server";
import { z } from "zod";
import { asAppError, LlmError } from "@/lib/errors";
import { filtersSchema, rubricSchema } from "@/lib/schemas";
import { runSearch } from "@/lib/sourcing";

export const runtime = "nodejs";
export const maxDuration = 120;

const bodySchema = z.object({
  filters: filtersSchema,
  rubric: rubricSchema,
});

export async function POST(request: Request) {
  try {
    const body = bodySchema.parse(await request.json());
    const data = await runSearch(body.filters, body.rubric);
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "malformed",
            message: "The filters or rubric are not in a shape we can score.",
            retryable: false,
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
