import { NextResponse } from "next/server";

/**
 * Standardized error response format
 */
export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

/**
 * Standardized success response format
 */
export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
}

export type ApiResponse<T = unknown> =
  | ApiSuccessResponse<T>
  | ApiErrorResponse;

/**
 * Error codes for different error types
 */
export const ErrorCodes = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  UNAUTHORIZED: "UNAUTHORIZED",
  NOT_FOUND: "NOT_FOUND",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  BAD_REQUEST: "BAD_REQUEST",
} as const;

/**
 * Creates a standardized error response
 */
export function createErrorResponse(
  code: string,
  message: string,
  status: number = 400,
  details?: unknown,
): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    {
      success: false,
      error: {
        code,
        message,
        ...(details && { details }),
      },
    },
    { status },
  );
}

/**
 * Creates a standardized success response
 */
export function createSuccessResponse<T>(
  data: T,
  status: number = 200,
): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
    },
    { status },
  );
}

/**
 * Wraps an API route handler with error handling
 */
export function withErrorHandler<T>(
  handler: (req: Request | import("next/server").NextRequest) => Promise<NextResponse<T>>,
) {
  return async (
    req: Request | import("next/server").NextRequest,
  ): Promise<NextResponse> => {
    try {
      return await handler(req);
    } catch (error) {
      console.error("Unhandled error in API route:", error);
      return createErrorResponse(
        ErrorCodes.INTERNAL_ERROR,
        "An unexpected error occurred",
        500,
        process.env.NODE_ENV === "development"
          ? error instanceof Error
            ? error.message
            : String(error)
          : undefined,
      );
    }
  };
}

