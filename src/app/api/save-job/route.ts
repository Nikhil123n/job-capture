import { NextResponse } from "next/server";

import type { SaveJobResponse } from "@/lib/types/job";
import { DuplicateJobUrlError, appendJob } from "@/lib/storage/jobs-repository";
import { saveJobRequestSchema } from "@/lib/validation/job";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json<SaveJobResponse>(
      {
        error: {
          code: "validation_error",
          message: "Invalid save request body.",
        },
        success: false,
        warnings: [],
      },
      { status: 400 },
    );
  }

  const parsedRequest = saveJobRequestSchema.safeParse(body);

  if (!parsedRequest.success) {
    return NextResponse.json<SaveJobResponse>(
      {
        error: {
          code: "validation_error",
          message: "The save request did not match the required job schema.",
        },
        success: false,
        warnings: [],
      },
      { status: 400 },
    );
  }

  try {
    const result = await appendJob(parsedRequest.data);

    return NextResponse.json<SaveJobResponse>({
      job: result.job,
      message: result.warnings.length
        ? "Job saved to Excel with a probable duplicate warning."
        : "Job saved to Excel.",
      success: true,
      warnings: result.warnings,
    });
  } catch (error) {
    if (error instanceof DuplicateJobUrlError) {
      return NextResponse.json<SaveJobResponse>(
        {
          error: {
            code: "duplicate_url",
            message: "A job with the same URL already exists.",
          },
          success: false,
          warnings: [],
        },
        { status: 409 },
      );
    }

    return NextResponse.json<SaveJobResponse>(
      {
        error: {
          code: "unexpected_error",
          message: "The job could not be saved. Try again.",
        },
        success: false,
        warnings: [],
      },
      { status: 500 },
    );
  }
}
