"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

function EditContent() {
  const searchParams = useSearchParams();
  const code = searchParams.get("code") || "";
  const router = useRouter();
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!code) {
      setLoading(false);
      return;
    }

    fetch(`/api/texts/${code}`)
      .then(async (res) => {
        if (!res.ok) return;
        const data = await res.json();
        if (data.text) {
          const decoded = atob(data.text);
          const bytes = Uint8Array.from(decoded, (c) => c.charCodeAt(0));
          setText(new TextDecoder().decode(bytes));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [code]);

  const handleSave = async () => {
    if (!text.trim()) {
      setError("Text cannot be empty");
      return;
    }

    setSaving(true);
    setError("");

    try {
      // Encode text as base64 (handle UTF-8)
      const encoded = btoa(
        String.fromCharCode(...new TextEncoder().encode(text))
      );

      const res = await fetch(`/api/texts/${code}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: encoded }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to save");
        return;
      }

      router.push(`/view?code=${code}`);
    } catch {
      setError("Server unreachable");
    } finally {
      setSaving(false);
    }
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
        </div>

        {/* Code + Lock */}
        <div className="flex items-center gap-3 mb-6">
          <h1 className="text-lg font-semibold">
            Code: <span className="text-accent">{code}</span>
          </h1>

          <Link
            href={`/view?code=${code}`}
            title="Lock and view"
            className="p-1.5 border border-border hover:bg-code-bg transition-colors"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-accent"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 5-5 5 5 0 0 1 5 5v1" />
            </svg>
          </Link>
        </div>

        {/* Editor */}
        {loading ? (
          <div className="w-full flex-1 min-h-[300px] border border-border p-6 text-sm text-muted">
            Loading...
          </div>
        ) : (
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Start typing your text here..."
            className="w-full flex-1 min-h-[300px] border border-border p-6 text-sm font-mono
                       leading-relaxed resize-none
                       focus:outline-none focus:border-accent bg-white
                       placeholder:text-border"
            autoFocus
          />
        )}

        {/* Save + Error */}
        <div className="flex items-center justify-end gap-4 mt-4">
          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="border border-accent text-accent px-6 py-2 text-sm
                       hover:bg-accent hover:text-white transition-colors
                       disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function EditPage() {
  return (
    <Suspense>
      <EditContent />
    </Suspense>
  );
}
