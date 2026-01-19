import { NextRequest } from "next/server";
import { validateRequest, secureSuccessResponse, secureErrorResponse } from "@/lib/security";
import { getUploadServer } from "@/lib/gofile";

export async function GET(request: NextRequest) {
  // Validate request (rate limiting, CORS)
  const validation = validateRequest(request);
  if (!validation.valid) {
    return validation.response!;
  }

  try {
    const server = await getUploadServer();

    return secureSuccessResponse({
      server,
      hasToken: !!process.env.GOFILE_TOKEN,
    });
  } catch (error) {
    console.error("Error getting server:", error);
    return secureErrorResponse(
      "Failed to get upload server",
      "SERVER_ERROR",
      500
    );
  }
}
