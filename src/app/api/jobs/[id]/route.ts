import { NextResponse } from "next/server";

import type { UpdateJobResponse } from "@/lib/types/job";
import {
  DuplicateJobUrlError,
  JobRowNotFoundError,
  updateJob,
} from "@/lib/storage/jobs-repository";
import { updateJobRequestSchema } from "@/lib/validation/job";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PUT(request: Request, context: RouteContext) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json<UpdateJobResponse>(
      {
        error: {
          code: "validation_error",
          message: "Invalid update request body.",
        },
        success: false,
        warnings: [],
      },
      { status: 400 },
    );
  }

  const parsedRequest = updateJobRequestSchema.safeParse(body);

  if (!parsedRequest.success) {
    return NextResponse.json<UpdateJobResponse>(
      {
        error: {
          code: "validation_error",
          message: "The update request did not match the required job schema.",
        },
        success: false,
        warnings: [],
      },
      { status: 400 },
    );
  }

  try {
    const { id } = await context.params;
    const result = await updateJob(id, parsedRequest.data);

    return NextResponse.json<UpdateJobResponse>({
      job: result.job,
      message: result.warnings.length
        ? "Job updated in Excel with a probable duplicate warning."
        : "Job updated in Excel.",
      success: true,
      warnings: result.warnings,
    });
  } catch (error) {
    if (error instanceof DuplicateJobUrlError) {
      return NextResponse.json<UpdateJobResponse>(
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

    if (error instanceof JobRowNotFoundError) {
      return NextResponse.json<UpdateJobResponse>(
        {
          error: {
            code: "not_found",
            message: "The requested job row was not found.",
          },
          success: false,
          warnings: [],
        },
        { status: 404 },
      );
    }

    return NextResponse.json<UpdateJobResponse>(
      {
        error: {
          code: "unexpected_error",
          message: "The job could not be updated. Try again.",
        },
        success: false,
        warnings: [],
      },
      { status: 500 },
    );
  }
}
