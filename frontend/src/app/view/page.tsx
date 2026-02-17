"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function ViewContent() {
  const searchParams = useSearchParams();
  const code = searchParams.get("code") || "";
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!code) {
      setError("No code provided");
      setLoading(false);
      return;
    }

    fetch(`/api/texts/${code}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Not found");
          return;
        }
        // Decode base64 to display as plain text
        const decoded = atob(data.text);
        // Handle UTF-8 by decoding the bytes
        const bytes = Uint8Array.from(decoded, (c) => c.charCodeAt(0));
        setText(new TextDecoder().decode(bytes));
      })
      .catch(() => setError("Server unreachable"))
      .finally(() => setLoading(false));
  }, [code]);

  const handleShare = () => {
    const url = `${window.location.origin}/view?code=${code}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="min-h-screen flex flex-col px-4 py-8 sm:py-12">
      <div className="w-full max-w-2xl mx-auto flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Link
            href="/"
            className="text-sm text-muted hover:text-foreground transition-colors"
          >
            &larr; textcopy
          </Link>
          <Link
            href={`/edit?code=${code}`}
            title="Unlock to edit"
            className="p-1.5 border border-border hover:bg-code-bg transition-colors"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-muted"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </Link>
        </div>

        {/* Code + Share */}
        <div className="flex items-center gap-3 mb-6">
          <h1 className="text-lg font-semibold">
            Code: <span className="text-accent">{code}</span>
          </h1>

          <button
            onClick={handleShare}
            title="Copy share link"
            className="p-1.5 border border-border hover:bg-code-bg transition-colors cursor-pointer"
          >
            {copied ? (
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
            )}
          </button>
        </div>

        {/* Text content */}
        <div className="relative border border-border flex-1 min-h-[300px]">
          {loading ? (
            <p className="p-6 text-sm text-muted">Loading...</p>
          ) : error ? (
            <p className="p-6 text-sm text-red-500">{error}</p>
          ) : (
            <>
              <button
                onClick={handleCopyText}
                title="Copy text"
                className="absolute top-3 right-3 p-1.5 text-muted hover:text-foreground
                           border border-border-light hover:bg-code-bg transition-colors cursor-pointer"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
              </button>
              <pre className="p-6 pr-12 text-sm leading-relaxed whitespace-pre-wrap break-words font-mono">
                {text}
              </pre>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ViewPage() {
  return (
    <Suspense>
      <ViewContent />
    </Suspense>
  );
}
