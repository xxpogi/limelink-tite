"use client";

import * as React from "react";
import { Progress } from "@/components/ui/progress";
import { formatBytes } from "@/lib/utils";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

export interface UploadProgress {
  fileName: string;
  progress: number;
  status: "pending" | "uploading" | "complete" | "error";
  error?: string;
  size: number;
}

interface UploadProgressListProps {
  uploads: UploadProgress[];
  totalProgress: number;
}

export function UploadProgressList({ uploads, totalProgress }: UploadProgressListProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-stone-700 dark:text-stone-300">
            Overall Progress
          </span>
          <span className="text-sm font-semibold text-lime-600 dark:text-lime-400">
            {Math.round(totalProgress)}%
          </span>
        </div>
        <Progress value={totalProgress} className="h-4" />
      </div>

      <div className="max-h-80 space-y-3 overflow-y-auto">
        {uploads.map((upload, index) => (
          <div
            key={`${upload.fileName}-${index}`}
            className="rounded-xl bg-stone-50 p-4 dark:bg-stone-900"
          >
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                {upload.status === "pending" && (
                  <div className="h-5 w-5 rounded-full border-2 border-stone-300 dark:border-stone-600" />
                )}
                {upload.status === "uploading" && (
                  <Loader2 className="h-5 w-5 animate-spin text-lime-500" />
                )}
                {upload.status === "complete" && (
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                )}
                {upload.status === "error" && (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-medium text-stone-900 dark:text-stone-100">
                    {upload.fileName}
                  </p>
                  <span className="flex-shrink-0 text-xs text-stone-500">
                    {formatBytes(upload.size)}
                  </span>
                </div>

                {upload.status === "uploading" && (
                  <Progress value={upload.progress} className="mt-2 h-1.5" />
                )}

                {upload.status === "error" && upload.error && (
                  <p className="mt-1 text-xs text-red-500">{upload.error}</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
