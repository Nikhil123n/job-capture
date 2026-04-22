import { NextRequest, NextResponse } from "next/server";

import { extractJob } from "@/lib/extraction/extract-job";
import type { ApiErrorResponse } from "@/lib/types/job";
import { extractJobRequestSchema } from "@/lib/validation/job";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json<ApiErrorResponse>(
      {
        error: {
          code: "validation_error",
          message: "Invalid extraction request body.",
        },
        warnings: [],
      },
      { status: 400 },
    );
  }

  const parsedRequest = extractJobRequestSchema.safeParse(body);

  if (!parsedRequest.success) {
    return NextResponse.json<ApiErrorResponse>(
      {
        error: {
          code: "validation_error",
          message: "Invalid extraction request.",
        },
        warnings: [],
      },
      { status: 400 },
    );
  }

  const extractionResult = await extractJob(parsedRequest.data);

  return NextResponse.json(extractionResult);
}
