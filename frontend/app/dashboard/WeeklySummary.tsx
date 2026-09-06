"use client";
import React, {useState, useEffect} from "react";
import { useSyncContext } from "./SyncContext";

type WeeklySummaryProps = {
  userId: string;
};

export default function WeeklySummary({ userId }: WeeklySummaryProps) {
  const { syncSignal } = useSyncContext();
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const [generateError, setGenerateError] = useState(false);

  // whenever a sync completes elsewhere on the page, the previously
  // generated summary is stale, so drop it and show the generate button again
  useEffect(() => {
    if (syncSignal > 0) {
      setSummary(null);
      setGenerateError(false);
    }
  }, [syncSignal]);

  useEffect(() => {
    async function fetchSummary() {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/weeklySummary/${userId}`,
        );
        const json = await response.json();
        setSummary(json.summary);
      } catch (err) {
        setFetchError(true);
      }
    }
    fetchSummary();
  }, [userId]);

  async function handleGenerate() {
    setLoading(true);
    setGenerateError(false);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/weeklySummary/${userId}/generate`,
        { method: "POST" },
      );
      const json = await response.json();
      setSummary(json.summary);
    } catch (err) {
      setGenerateError(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="border text-white border-white/20 p-6 rounded-2xl bg-white/10 backdrop-blur-md shadow-lg">
      <h1 className="font-bold text-xl mb-4">Weekly Summary</h1>

      {fetchError ? (
        <span>Couldn&apos;t load your weekly summary.</span>
      ) : summary ? (
        <p>{summary}</p>
      ) : (
        <div className="flex flex-col items-center gap-2">
          <span className="text-sm text-white/70">
            Best generated toward the end of the week, once your runs are logged.
          </span>
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="border border-white/20 rounded-xl px-4 py-2 cursor-pointer transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Generating..." : "Generate Summary"}
          </button>
          {generateError && (
            <span className="text-red-400">Failed to generate. Try again.</span>
          )}
        </div>
      )}
    </div>
  );
}
