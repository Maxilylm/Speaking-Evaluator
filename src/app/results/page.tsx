"use client";

import { useState, useEffect } from "react";
import { EvaluationResult } from "@/lib/cambridge-rubric";
import AudioPlayer from "@/components/AudioPlayer";

function ScoreBar({
  score,
  maxScore,
}: {
  score: number;
  maxScore: number;
}) {
  const pct = (score / maxScore) * 100;
  const color =
    pct >= 80
      ? "bg-green-500"
      : pct >= 60
        ? "bg-yellow-500"
        : pct >= 40
          ? "bg-orange-500"
          : "bg-red-500";

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 bg-gray-200 rounded-full h-3">
        <div
          className={`${color} h-3 rounded-full transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="font-bold text-sm w-12 text-right">
        {score}/{maxScore}
      </span>
    </div>
  );
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function ResultsPage() {
  const [result, setResult] = useState<EvaluationResult | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [seekTo, setSeekTo] = useState<number | null>(null);
  const [filter, setFilter] = useState<"all" | "good" | "bad">("all");

  useEffect(() => {
    const stored = sessionStorage.getItem("evaluationResult");
    const audio = sessionStorage.getItem("audioData");

    if (stored) setResult(JSON.parse(stored));
    if (audio) setAudioUrl(audio);

    if (!stored) window.location.href = "/";
  }, []);

  if (!result) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const filteredExamples =
    filter === "all"
      ? result.examples
      : result.examples.filter((e) => e.quality === filter);

  const overallPct = (result.overallScore / result.maxOverallScore) * 100;

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Evaluation Results</h1>
          <p className="text-gray-500">
            {result.examLevel}
            {result.detectedLevel
              ? ` - Detected Level: ${result.detectedLevel}`
              : ""}
          </p>
        </div>
        <a
          href="/"
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm transition-colors"
        >
          New Evaluation
        </a>
      </div>

      {/* Audio Player */}
      {audioUrl && (
        <div className="mb-8">
          <AudioPlayer audioUrl={audioUrl} seekTo={seekTo} />
        </div>
      )}

      {/* Overall Score */}
      <div className="bg-white rounded-xl border p-6 mb-6">
        <div className="flex items-center gap-6">
          <div
            className={`w-24 h-24 rounded-full flex items-center justify-center text-white text-2xl font-bold ${
              overallPct >= 80
                ? "bg-green-500"
                : overallPct >= 60
                  ? "bg-yellow-500"
                  : overallPct >= 40
                    ? "bg-orange-500"
                    : "bg-red-500"
            }`}
          >
            {Math.round(overallPct)}%
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold mb-1">Overall Score</h2>
            <p className="text-gray-600 text-lg">
              {result.overallScore} / {result.maxOverallScore}
            </p>
          </div>
        </div>
      </div>

      {/* Criteria Scores */}
      <div className="bg-white rounded-xl border p-6 mb-6">
        <h2 className="text-xl font-bold mb-4">Criteria Breakdown</h2>
        <div className="space-y-4">
          {result.criteria.map((c) => (
            <div key={c.criterion}>
              <div className="flex justify-between mb-1">
                <span className="font-medium">{c.criterion}</span>
              </div>
              <ScoreBar score={c.score} maxScore={c.maxScore} />
              <p className="text-sm text-gray-600 mt-1">{c.feedback}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Examples with Audio Navigation */}
      <div className="bg-white rounded-xl border p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Key Moments</h2>
          <div className="flex gap-2">
            {(["all", "good", "bad"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded-full text-sm transition-colors ${
                  filter === f
                    ? f === "good"
                      ? "bg-green-100 text-green-700"
                      : f === "bad"
                        ? "bg-red-100 text-red-700"
                        : "bg-blue-100 text-blue-700"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {f === "all" ? "All" : f === "good" ? "Good" : "Needs Work"}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {filteredExamples.map((example, i) => (
            <button
              key={i}
              onClick={() => setSeekTo(example.timestamp)}
              className={`w-full text-left p-4 rounded-lg border transition-all hover:shadow-md ${
                example.quality === "good"
                  ? "border-green-200 bg-green-50 hover:border-green-400"
                  : "border-red-200 bg-red-50 hover:border-red-400"
              }`}
            >
              <div className="flex items-start gap-3">
                <span
                  className={`mt-0.5 text-lg ${
                    example.quality === "good"
                      ? "text-green-500"
                      : "text-red-500"
                  }`}
                >
                  {example.quality === "good" ? "\u2713" : "\u2717"}
                </span>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm text-gray-800">
                      {example.criterion}
                    </span>
                    <span className="text-xs text-gray-400">
                      {formatTime(example.timestamp)}
                      {example.endTimestamp
                        ? ` - ${formatTime(example.endTimestamp)}`
                        : ""}
                    </span>
                  </div>
                  <p className="text-sm italic text-gray-700 mb-1">
                    &quot;{example.transcriptExcerpt}&quot;
                  </p>
                  <p className="text-sm text-gray-600">
                    {example.explanation}
                  </p>
                </div>
                <span className="text-blue-500 text-xs whitespace-nowrap mt-1">
                  Play &#9654;
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* General Feedback */}
      <div className="bg-white rounded-xl border p-6 mb-6">
        <h2 className="text-xl font-bold mb-3">General Feedback</h2>
        <p className="text-gray-700 leading-relaxed">
          {result.generalFeedback}
        </p>
      </div>

      {/* Transcript */}
      <details className="bg-white rounded-xl border p-6">
        <summary className="text-xl font-bold cursor-pointer">
          Full Transcript
        </summary>
        <p className="mt-4 text-gray-700 whitespace-pre-wrap leading-relaxed">
          {result.transcript}
        </p>
      </details>
    </main>
  );
}
