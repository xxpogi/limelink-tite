"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileDropzone } from "@/components/file-dropzone";
import { UploadProgressList, UploadProgress } from "@/components/upload-progress";
import { UploadOptions } from "@/components/upload-options";
import { ShareLink } from "@/components/share-link";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Upload, Zap, Shield, Globe, RefreshCw, History, Trash2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { uploadDirectly } from "@/lib/gofile-client";
import { formatBytes } from "@/lib/utils";

interface UploadResult {
  files: Array<{ fileName: string; fileId: string; size: number }>;
  shareLink: string;
  shareCode: string;
  hasPassword: boolean;
  expiration: string;
  totalSize: number;
  timestamp: number;
}

type UploadState = "idle" | "uploading" | "complete" | "error";

export default function HomePage() {
  const [files, setFiles] = useState<File[]>([]);
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [uploads, setUploads] = useState<UploadProgress[]>([]);
  const [totalProgress, setTotalProgress] = useState(0);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [hasToken, setHasToken] = useState(false);
  const [password, setPassword] = useState("");
  const [expiration, setExpiration] = useState("never");
  const [server, setServer] = useState<string | null>(null);
  const [history, setHistory] = useState<UploadResult[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Initialize
  useEffect(() => {
    // Load history
    const saved = localStorage.getItem("limelink_history");
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load history");
      }
    }

    // Get server
    fetch("/api/server")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setHasToken(data.data.hasToken);
          setServer(data.data.server);
        }
      })
      .catch(() => toast.error("Failed to connect to upload server"));
  }, []);

  const saveToHistory = (newResult: UploadResult) => {
    const updated = [newResult, ...history].slice(0, 10);
    setHistory(updated);
    localStorage.setItem("limelink_history", JSON.stringify(updated));
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem("limelink_history");
    toast.success("History cleared");
  };

  const handleUpload = useCallback(async () => {
    if (files.length === 0) return;
    if (!server) {
      toast.error("Connecting to server... please wait");
      return;
    }

    setUploadState("uploading");
    setUploads(
      files.map((f) => ({
        fileName: f.name,
        progress: 0,
        status: "pending",
        size: f.size,
      }))
    );

    try {
      const uploadResults = [];
      let parentFolderId: string | undefined;
      let shareCode: string | undefined;

      // Upload files sequentially
      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // Update status to uploading
        setUploads(prev => prev.map((u, idx) =>
          idx === i ? { ...u, status: "uploading" } : u
        ));

        try {
          const result = await uploadDirectly(
            file,
            server,
            undefined, // Token handling handled by API proxy if needed, but here we go direct
            parentFolderId,
            (progress) => {
              setUploads(prev => prev.map((u, idx) =>
                idx === i ? { ...u, progress } : u
              ));

              // Calculate total progress
              const completedFiles = i * 100;
              const currentFile = progress;
              const total = (completedFiles + currentFile) / files.length;
              setTotalProgress(total);
            }
          );

          // Update status to complete
          setUploads(prev => prev.map((u, idx) =>
            idx === i ? { ...u, status: "complete", progress: 100 } : u
          ));

          uploadResults.push({
            fileName: result.fileName,
            fileId: result.fileId,
            size: file.size
          });

          // Store folder ID for next files to group them
          if (!parentFolderId) {
            parentFolderId = result.parentFolder;
            shareCode = result.code;
          }

        } catch (error) {
          console.error(error);
          setUploads(prev => prev.map((u, idx) =>
            idx === i ? { ...u, status: "error", error: "Upload failed" } : u
          ));
          throw error;
        }
      }

      const finalResult: UploadResult = {
        files: uploadResults,
        shareLink: `https://gofile.io/d/${shareCode}`,
        shareCode: shareCode || "",
        hasPassword: !!password,
        expiration: expiration,
        totalSize: files.reduce((acc, f) => acc + f.size, 0),
        timestamp: Date.now()
      };

      setResult(finalResult);
      saveToHistory(finalResult);
      setUploadState("complete");
      toast.success("Files uploaded successfully!");

    } catch (err) {
      setUploadState("error");
      toast.error("Upload failed. Please try again.");
    }
  }, [files, server, password, expiration, history]);

  const handleReset = () => {
    setFiles([]);
    setUploadState("idle");
    setUploads([]);
    setTotalProgress(0);
    setResult(null);
    setPassword("");
    setExpiration("never");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 via-stone-100 to-lime-50 dark:from-stone-950 dark:via-stone-900 dark:to-stone-950 transition-colors duration-500">
      {/* Background Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-lime-400/20 rounded-full blur-[100px] mix-blend-multiply dark:mix-blend-screen animate-pulse duration-[10s]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-emerald-400/10 rounded-full blur-[120px] mix-blend-multiply dark:mix-blend-screen" />
      </div>

      <header className="sticky top-0 z-50 border-b border-white/20 bg-white/60 backdrop-blur-xl dark:border-white/5 dark:bg-black/60 supports-[backdrop-filter]:bg-white/60">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-2 cursor-pointer" onClick={handleReset}>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-lime-400 to-emerald-600 text-white shadow-lg shadow-lime-500/20 ring-1 ring-white/20">
              <Zap className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold tracking-tight text-stone-900 dark:text-white">
              Lime<span className="text-transparent bg-clip-text bg-gradient-to-r from-lime-500 to-emerald-500">Link</span>
            </span>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" onClick={() => setShowHistory(!showHistory)} className="rounded-full">
              <History className="h-5 w-5" />
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-4xl px-4 py-12">
        <AnimatePresence mode="wait">
          {!showHistory ? (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              {uploadState === "idle" && (
                <div className="text-center space-y-4 mb-12">
                  <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-5xl md:text-7xl font-bold tracking-tight text-stone-900 dark:text-white"
                  >
                    Share without <span className="text-transparent bg-clip-text bg-gradient-to-r from-lime-500 to-emerald-500">limits</span>.
                  </motion.h1>
                  <p className="text-lg text-stone-600 dark:text-stone-400 max-w-2xl mx-auto">
                    Secure, high-speed p2p file transfer. No file size limits. No registration.
                  </p>
                </div>
              )}

              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-lime-500 to-emerald-600 rounded-[2rem] blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200" />
                <div className="relative rounded-[1.5rem] border border-white/20 bg-white/80 p-6 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-stone-900/80 dark:shadow-none sm:p-10">

                  {uploadState === "idle" && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
                      <FileDropzone files={files} onFilesChange={setFiles} />

                      <AnimatePresence>
                        {files.length > 0 && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="space-y-6 overflow-hidden"
                          >
                            <UploadOptions
                              hasToken={hasToken}
                              password={password}
                              expiration={expiration}
                              onPasswordChange={setPassword}
                              onExpirationChange={setExpiration}
                            />

                            <Button
                              onClick={handleUpload}
                              size="lg"
                              className="w-full text-lg h-14 rounded-xl bg-gradient-to-r from-lime-500 to-emerald-600 hover:from-lime-400 hover:to-emerald-500 transition-all shadow-xl shadow-lime-500/20"
                            >
                              <Upload className="h-5 w-5 mr-2" />
                              Upload {files.length} file{files.length !== 1 && "s"}
                            </Button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  )}

                  {uploadState === "uploading" && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                      <UploadProgressList uploads={uploads} totalProgress={totalProgress} />
                    </motion.div>
                  )}

                  {uploadState === "complete" && result && (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                      <ShareLink
                        shareLink={result.shareLink}
                        shareCode={result.shareCode}
                        files={result.files}
                        hasPassword={result.hasPassword}
                        expiration={result.expiration}
                        totalSize={result.totalSize}
                      />
                      <Button onClick={handleReset} variant="outline" size="lg" className="w-full mt-6">
                        <RefreshCw className="h-4 w-4 mr-2" /> Send more files
                      </Button>
                    </motion.div>
                  )}
                </div>
              </div>

              {uploadState === "idle" && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 px-4">
                  {[
                    { icon: Globe, title: "Unlimited Size", desc: "Share files of any size directly." },
                    { icon: Shield, title: "Secure & Private", desc: "End-to-end encryption available." },
                    { icon: Zap, title: "Blazing Fast", desc: "Direct peer-to-cloud upload." },
                  ].map((item, i) => (
                    <div key={i} className="flex flex-col items-center text-center p-4 rounded-2xl hover:bg-white/50 dark:hover:bg-white/5 transition-colors">
                      <div className="h-12 w-12 rounded-2xl bg-lime-100 dark:bg-lime-900/30 text-lime-600 dark:text-lime-400 flex items-center justify-center mb-4">
                        <item.icon className="h-6 w-6" />
                      </div>
                      <h3 className="font-semibold text-stone-900 dark:text-white mb-1">{item.title}</h3>
                      <p className="text-sm text-stone-500">{item.desc}</p>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="history"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Recent Uploads</h2>
                <Button variant="destructive" size="sm" onClick={clearHistory} disabled={history.length === 0}>
                  <Trash2 className="h-4 w-4 mr-2" /> Clear
                </Button>
              </div>

              {history.length === 0 ? (
                <div className="text-center py-20 text-stone-500">
                  <History className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>No uploads yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {history.map((item, i) => (
                    <div key={i} className="bg-white dark:bg-stone-900 p-4 rounded-xl shadow-sm border border-stone-200 dark:border-stone-800 flex items-center justify-between">
                      <div>
                        <div className="font-medium text-lime-600 dark:text-lime-400 mb-1">
                          {item.files.length} file{item.files.length > 1 ? 's' : ''} • {formatBytes(item.totalSize)}
                        </div>
                        <div className="text-xs text-stone-500">
                          {new Date(item.timestamp).toLocaleString()}
                        </div>
                      </div>
                      <Button asChild variant="outline" size="sm">
                        <a href={item.shareLink} target="_blank" rel="noreferrer">
                          Open <ExternalLink className="h-3 w-3 ml-2" />
                        </a>
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <Button onClick={() => setShowHistory(false)} className="w-full mt-8">
                Back to Upload
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
