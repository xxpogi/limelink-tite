import { NextRequest } from "next/server";
import { z } from "zod";
import {
  validateRequest,
  secureSuccessResponse,
  secureErrorResponse,
  isAllowedMimeType,
  sanitizeInput,
} from "@/lib/security";
import {
  getUploadServer,
  uploadToGoFile,
  updateFolderSettings,
  getAccountRootFolder,
  createFolder,
} from "@/lib/gofile";
import { sanitizeFilename, generateId } from "@/lib/utils";

// Request validation schema
const uploadRequestSchema = z.object({
  password: z.string().min(4).max(32).optional(),
  expiration: z.enum(["never", "1", "7", "30", "90"]).default("never"),
  description: z.string().max(500).optional(),
});

export async function POST(request: NextRequest) {
  // Validate request (rate limiting, CORS)
  const validation = validateRequest(request);
  if (!validation.valid) {
    return validation.response!;
  }

  try {
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];
    const optionsRaw = formData.get("options");

    // Validate files exist
    if (!files || files.length === 0) {
      return secureErrorResponse("No files provided", "NO_FILES", 400);
    }

    // Validate file count (max 20 files per upload)
    if (files.length > 20) {
      return secureErrorResponse(
        "Maximum 20 files per upload",
        "TOO_MANY_FILES",
        400
      );
    }

    // Parse and validate options
    let options: z.infer<typeof uploadRequestSchema> = { expiration: "never" };
    if (optionsRaw) {
      try {
        const parsed = JSON.parse(optionsRaw as string);
        options = uploadRequestSchema.parse(parsed);
      } catch {
        return secureErrorResponse("Invalid options format", "INVALID_OPTIONS", 400);
      }
    }

    // Validate each file
    for (const file of files) {
      // Check file size (warn for >10GB but allow)
      if (file.size > 10 * 1024 * 1024 * 1024) {
        console.warn(`Large file detected: ${file.name} (${file.size} bytes)`);
      }

      // Check for empty files
      if (file.size === 0) {
        return secureErrorResponse(
          `Empty file not allowed: ${sanitizeInput(file.name)}`,
          "EMPTY_FILE",
          400
        );
      }

      // Validate MIME type
      if (!isAllowedMimeType(file.type || "application/octet-stream")) {
        return secureErrorResponse(
          `File type not allowed: ${sanitizeInput(file.type)}`,
          "INVALID_FILE_TYPE",
          400
        );
      }

      // Sanitize filename
      const sanitizedName = sanitizeFilename(file.name);
      if (sanitizedName !== file.name) {
        console.warn(`Filename sanitized: ${file.name} -> ${sanitizedName}`);
      }
    }

    // Get upload server
    const server = await getUploadServer();
    const token = process.env.GOFILE_TOKEN;
    const accountId = process.env.GOFILE_ACCOUNT_ID;

    let folderId: string | undefined;
    let folderCode: string | undefined;

    // If we have a token, create a folder for this upload session
    if (token) {
      try {
        const rootFolder = await getAccountRootFolder(token);
        if (rootFolder) {
          const folderName = `LimeLink_${generateId()}_${Date.now()}`;
          const newFolderId = await createFolder(rootFolder, folderName, token);
          if (newFolderId) {
            folderId = newFolderId;
          }
        }
      } catch (error) {
        console.error("Error creating folder:", error);
        // Continue without folder - files will go to root
      }
    }

    // Upload all files
    const uploadResults = [];
    let lastParentFolder: string | undefined;

    for (const file of files) {
      try {
        const result = await uploadToGoFile(
          file,
          server,
          token,
          folderId || lastParentFolder
        );

        // Extract code from parentFolderCode or downloadPage
        // The API returns 'parentFolderCode' which is the shareable code for the folder
        const fileCode = result.data.parentFolderCode || result.data.code;

        uploadResults.push({
          fileName: sanitizeFilename(file.name),
          fileId: result.data.fileId,
          downloadPage: result.data.downloadPage,
          code: fileCode,
          size: file.size,
        });

        // Use the parent folder from first upload for subsequent files (guest mode)
        if (!folderId && !lastParentFolder) {
          lastParentFolder = result.data.parentFolder;
          folderCode = fileCode;
        }
      } catch (error) {
        console.error(`Error uploading ${file.name}:`, error);
        return secureErrorResponse(
          `Failed to upload: ${sanitizeInput(file.name)}`,
          "UPLOAD_FAILED",
          500
        );
      }
    }

    // Apply folder settings if we have a token and folder
    const targetFolderId = folderId || lastParentFolder;
    if (token && targetFolderId) {
      const hasSettings = options.password ||
                         (options.expiration && options.expiration !== "never") ||
                         options.description;

      if (hasSettings) {
        await updateFolderSettings(targetFolderId, token, {
          password: options.password,
          expiration: options.expiration,
          description: options.description,
          public: true,
        });
      }
    }

    // Determine the share link
    const shareCode = folderCode || uploadResults[0]?.code;
    const shareLink = `https://gofile.io/d/${shareCode}`;

    return secureSuccessResponse({
      files: uploadResults,
      shareLink,
      shareCode,
      folderId: targetFolderId,
      hasPassword: !!options.password,
      expiration: options.expiration,
      totalFiles: files.length,
      totalSize: files.reduce((acc, f) => acc + f.size, 0),
    });
  } catch (error) {
    console.error("Upload error:", error);
    return secureErrorResponse(
      "An unexpected error occurred during upload",
      "INTERNAL_ERROR",
      500
    );
  }
}

// Handle preflight requests
export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin") || "";

  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
    },
  });
}
