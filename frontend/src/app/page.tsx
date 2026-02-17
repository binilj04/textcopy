"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleEnter = () => {
    const trimmed = code.trim();
    if (trimmed) {
      router.push(`/view?code=${trimmed}`);
    }
  };

  const handleNew = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/texts", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create");
        return;
      }
      router.push(`/edit?code=${data.code}`);
    } catch {
      setError("Server unreachable");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleEnter();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <h1 className="text-xl font-bold mb-8">textcopy</h1>

        <div className="flex items-center gap-3 mb-4">
          <label htmlFor="code-input" className="text-sm text-muted whitespace-nowrap">
            Enter Code :
          </label>
          <input
            id="code-input"
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Affe42"
            maxLength={20}
            className="flex-1 border border-border px-3 py-2 text-sm font-mono tracking-wider
                       focus:outline-none focus:border-accent bg-white
                       min-w-0"
            autoFocus
          />
          <button
            onClick={handleEnter}
            className="border border-border px-4 py-2 text-sm hover:bg-code-bg
                       active:bg-border-light transition-colors cursor-pointer"
          >
            Enter
          </button>
        </div>

        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-border-light" />
          <span className="text-sm text-muted">Or</span>
          <div className="flex-1 h-px bg-border-light" />
        </div>

        <button
          onClick={handleNew}
          disabled={loading}
          className="border border-accent text-accent px-5 py-2 text-sm
                     hover:bg-accent hover:text-white transition-colors
                     disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {loading ? "Creating..." : "New"}
        </button>

        {error && (
          <p className="mt-4 text-sm text-red-500">{error}</p>
        )}
      </div>
    </div>
  );
}
