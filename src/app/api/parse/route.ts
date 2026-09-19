import { NextResponse } from "next/server";
import { z } from "zod";
import { asAppError, LlmError } from "@/lib/errors";
import { parseQuery } from "@/lib/sourcing";

export const runtime = "nodejs";
export const maxDuration = 60;

const bodySchema = z.object({
  query: z.string().trim().min(8).max(500),
});

export async function POST(request: Request) {
  try {
    const body = bodySchema.parse(await request.json());
    const data = await parseQuery(body.query);
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "malformed",
            message: "Type a real search — a role, some constraints, a city.",
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
