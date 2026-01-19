"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Check, ExternalLink, QrCode, Download, Lock, Clock } from "lucide-react";
import { formatBytes } from "@/lib/utils";

interface ShareLinkProps {
  shareLink: string;
  shareCode: string;
  files: Array<{
    fileName: string;
    size: number;
  }>;
  hasPassword: boolean;
  expiration: string;
  totalSize: number;
}

export function ShareLink({
  shareLink,
  shareCode,
  files,
  hasPassword,
  expiration,
  totalSize,
}: ShareLinkProps) {
  const [copied, setCopied] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [showQR, setShowQR] = useState(false);

  useEffect(() => {
    QRCode.toDataURL(shareLink, {
      width: 256,
      margin: 2,
      color: {
        dark: "#0a0a0a",
        light: "#ffffff",
      },
    }).then(setQrCode);
  }, [shareLink]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = shareLink;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
          <Check className="h-8 w-8" />
        </div>
        <h2 className="text-2xl font-bold text-stone-900 dark:text-stone-100">
          Upload Complete!
        </h2>
        <p className="mt-1 text-stone-600 dark:text-stone-400">
          Your files are ready to share
        </p>
      </div>

      <div className="rounded-2xl bg-stone-50 p-6 dark:bg-stone-900">
        <div className="flex flex-col gap-3 sm:flex-row">
          <Input
            readOnly
            value={shareLink}
            className="flex-1 bg-white font-mono text-sm dark:bg-stone-800"
          />
          <div className="flex gap-2">
            <Button onClick={handleCopy} variant="secondary" className="flex-1 sm:flex-none">
              {copied ? (
                <>
                  <Check className="h-4 w-4" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy
                </>
              )}
            </Button>
            <Button asChild variant="default" className="flex-1 sm:flex-none">
              <a href={shareLink} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
                Open
              </a>
            </Button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-stone-600 dark:text-stone-400">
          <span className="flex items-center gap-1.5">
            <Download className="h-4 w-4" />
            {files.length} file{files.length !== 1 && "s"}
          </span>
          <span className="h-1 w-1 rounded-full bg-stone-400" />
          <span>{formatBytes(totalSize)}</span>
          {hasPassword && (
            <>
              <span className="h-1 w-1 rounded-full bg-stone-400" />
              <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                <Lock className="h-4 w-4" />
                Password protected
              </span>
            </>
          )}
          {expiration !== "never" && (
            <>
              <span className="h-1 w-1 rounded-full bg-stone-400" />
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                Expires in {expiration} day{expiration !== "1" && "s"}
              </span>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-col items-center gap-4">
        <Button
          variant="outline"
          onClick={() => setShowQR(!showQR)}
          className="gap-2"
        >
          <QrCode className="h-4 w-4" />
          {showQR ? "Hide" : "Show"} QR Code
        </Button>

        {showQR && qrCode && (
          <div className="overflow-hidden rounded-2xl bg-white p-4 shadow-lg dark:bg-stone-800">
            <img
              src={qrCode}
              alt="Share QR Code"
              className="h-48 w-48"
            />
            <p className="mt-2 text-center text-xs text-stone-500 dark:text-stone-400">
              Scan to download
            </p>
          </div>
        )}
      </div>

      {files.length > 1 && (
        <div className="rounded-xl bg-stone-50 p-4 dark:bg-stone-900">
          <h3 className="mb-3 text-sm font-semibold text-stone-700 dark:text-stone-300">
            Uploaded Files
          </h3>
          <div className="max-h-40 space-y-2 overflow-y-auto">
            {files.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm dark:bg-stone-800"
              >
                <span className="truncate text-stone-900 dark:text-stone-100">
                  {file.fileName}
                </span>
                <span className="ml-2 flex-shrink-0 text-stone-500">
                  {formatBytes(file.size)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
