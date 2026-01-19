"use client";

import * as React from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronDown, Lock, Clock, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface UploadOptionsProps {
  hasToken: boolean;
  password: string;
  expiration: string;
  onPasswordChange: (password: string) => void;
  onExpirationChange: (expiration: string) => void;
  disabled?: boolean;
}

const EXPIRATION_OPTIONS = [
  { value: "never", label: "Never" },
  { value: "1", label: "1 day" },
  { value: "7", label: "7 days" },
  { value: "30", label: "30 days" },
  { value: "90", label: "90 days" },
];

export function UploadOptions({
  hasToken,
  password,
  expiration,
  onPasswordChange,
  onExpirationChange,
  disabled = false,
}: UploadOptionsProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!hasToken) {
    return (
      <div className="rounded-xl bg-stone-100 p-4 dark:bg-stone-800">
        <div className="flex items-start gap-3">
          <Info className="mt-0.5 h-5 w-5 flex-shrink-0 text-stone-500" />
          <div className="text-sm text-stone-600 dark:text-stone-400">
            <p className="font-medium text-stone-900 dark:text-stone-100">
              Want password protection & expiration?
            </p>
            <p className="mt-1">
              Add your free GoFile API token to enable these features.{" "}
              <a
                href="https://gofile.io/myProfile"
                target="_blank"
                rel="noopener noreferrer"
                className="text-lime-600 hover:underline dark:text-lime-400"
              >
                Get your token
              </a>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border-2 border-stone-200 dark:border-stone-700">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-stone-50 dark:hover:bg-stone-800 disabled:opacity-50"
      >
        <span className="font-medium text-stone-900 dark:text-stone-100">
          Upload Options
        </span>
        <ChevronDown
          className={cn(
            "h-5 w-5 text-stone-500 transition-transform duration-200",
            isOpen && "rotate-180"
          )}
        />
      </button>

      <div
        className={cn(
          "grid transition-all duration-300 ease-out",
          isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        )}
      >
        <div className="overflow-hidden">
          <div className="space-y-4 border-t border-stone-200 p-4 dark:border-stone-700">
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-stone-700 dark:text-stone-300">
                <Lock className="h-4 w-4" />
                Password Protection
              </label>
              <Input
                type="password"
                placeholder="Enter password (min 4 characters)"
                value={password}
                onChange={(e) => onPasswordChange(e.target.value)}
                disabled={disabled}
                minLength={4}
                maxLength={32}
              />
              <p className="text-xs text-stone-500">
                Recipients will need this password to download files
              </p>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-stone-700 dark:text-stone-300">
                <Clock className="h-4 w-4" />
                Link Expiration
              </label>
              <div className="flex flex-wrap gap-2">
                {EXPIRATION_OPTIONS.map((option) => (
                  <Button
                    key={option.value}
                    type="button"
                    variant={expiration === option.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => onExpirationChange(option.value)}
                    disabled={disabled}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
