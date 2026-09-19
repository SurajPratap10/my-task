import { NextResponse } from "next/server";
import { asAppError } from "@/lib/errors";
import { getProvider } from "@/lib/llm";

export const runtime = "nodejs";

export async function GET() {
  try {
    return NextResponse.json({
      ok: true,
      data: {
        configured: getProvider() !== null,
        provider: getProvider(),
      },
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: asAppError(error) }, { status: 500 });
  }
}
