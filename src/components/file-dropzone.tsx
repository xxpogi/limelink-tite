"use client";

import * as React from "react";
import { useState, useCallback } from "react";
import { Upload, X, FileIcon, AlertTriangle } from "lucide-react";
import { cn, formatBytes } from "@/lib/utils";

interface FileDropzoneProps {
  files: File[];
  onFilesChange: (files: File[]) => void;
  disabled?: boolean;
  maxFiles?: number;
}

export function FileDropzone({
  files,
  onFilesChange,
  disabled = false,
  maxFiles = 20,
}: FileDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragging(true);
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled) return;

    const droppedFiles = Array.from(e.dataTransfer.files);
    const newFiles = [...files, ...droppedFiles].slice(0, maxFiles);
    onFilesChange(newFiles);
  }, [disabled, files, maxFiles, onFilesChange]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled || !e.target.files) return;

    const selectedFiles = Array.from(e.target.files);
    const newFiles = [...files, ...selectedFiles].slice(0, maxFiles);
    onFilesChange(newFiles);
    e.target.value = "";
  }, [disabled, files, maxFiles, onFilesChange]);

  const removeFile = useCallback((index: number) => {
    const newFiles = files.filter((_, i) => i !== index);
    onFilesChange(newFiles);
  }, [files, onFilesChange]);

  const totalSize = files.reduce((acc, file) => acc + file.size, 0);
  const hasLargeFile = files.some(f => f.size > 10 * 1024 * 1024 * 1024);

  return (
    <div className="space-y-4">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-12 transition-all duration-300 cursor-pointer",
          isDragging
            ? "border-lime-500 bg-lime-500/10 scale-102"
            : "border-stone-300 hover:border-lime-400 hover:bg-lime-500/5 dark:border-stone-700 dark:hover:border-lime-500",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <input
          type="file"
          multiple
          onChange={handleFileSelect}
          disabled={disabled}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
          aria-label="File upload"
        />

        <div className={cn(
          "flex flex-col items-center gap-4 transition-transform duration-300",
          isDragging && "scale-110"
        )}>
          <div className={cn(
            "flex h-20 w-20 items-center justify-center rounded-full transition-all duration-300",
            isDragging
              ? "bg-lime-500 text-stone-900"
              : "bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400"
          )}>
            <Upload className="h-10 w-10" />
          </div>

          <div className="text-center">
            <p className="text-lg font-semibold text-stone-900 dark:text-stone-100">
              {isDragging ? "Drop files here" : "Drag & drop files"}
            </p>
            <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
              or click to browse • No size limit • Up to {maxFiles} files
            </p>
          </div>
        </div>
      </div>

      {hasLargeFile && (
        <div className="flex items-center gap-3 rounded-xl bg-amber-50 p-4 text-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          <p className="text-sm">
            Large files detected (10GB+). Upload may take a while depending on your connection.
          </p>
        </div>
      )}

      {files.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm text-stone-600 dark:text-stone-400">
            <span>{files.length} file{files.length !== 1 && "s"} selected</span>
            <span>{formatBytes(totalSize)}</span>
          </div>

          <div className="max-h-64 space-y-2 overflow-y-auto rounded-xl bg-stone-50 p-3 dark:bg-stone-900">
            {files.map((file, index) => (
              <div
                key={`${file.name}-${index}`}
                className="group flex items-center gap-3 rounded-lg bg-white p-3 shadow-sm transition-all hover:shadow-md dark:bg-stone-800"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-lime-100 text-lime-600 dark:bg-lime-900/30 dark:text-lime-400">
                  <FileIcon className="h-5 w-5" />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-stone-900 dark:text-stone-100">
                    {file.name}
                  </p>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    {formatBytes(file.size)}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  disabled={disabled}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-stone-400 opacity-0 transition-all hover:bg-red-100 hover:text-red-500 group-hover:opacity-100 dark:hover:bg-red-900/30 disabled:opacity-50"
                  aria-label={`Remove ${file.name}`}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
