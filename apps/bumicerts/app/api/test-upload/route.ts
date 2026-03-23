// TEMP: test route — remove after confirming proxyClientMaxBodySize works in prod build.
import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const text = await request.text();
    return NextResponse.json({ received: text.length, ok: true });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
