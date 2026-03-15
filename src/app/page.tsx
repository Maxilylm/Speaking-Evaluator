"use client";

import { useState, useRef } from "react";
import { EXAM_LEVELS, ExamLevel } from "@/lib/cambridge-rubric";

export default function Home() {
  const [examLevel, setExamLevel] = useState<ExamLevel>("AUTO_DETECT");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!audioFile) return;

    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("audio", audioFile);
      formData.append("examLevel", examLevel);

      const response = await fetch("/api/evaluate", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Evaluation failed");
      }

      const result = await response.json();

      // Store result and audio in sessionStorage, navigate to results
      const reader = new FileReader();
      reader.onload = () => {
        sessionStorage.setItem("evaluationResult", JSON.stringify(result));
        sessionStorage.setItem("audioData", reader.result as string);
        sessionStorage.setItem("audioType", audioFile.type);
        window.location.href = "/results";
      };
      reader.readAsDataURL(audioFile);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="max-w-2xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold mb-2">Speaking Evaluator</h1>
        <p className="text-gray-600 text-lg">
          Upload your speaking audio for instant Cambridge English assessment
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Exam Level Selection */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Select Exam / Level
          </label>
          <select
            value={examLevel}
            onChange={(e) => setExamLevel(e.target.value as ExamLevel)}
            className="w-full p-3 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {Object.entries(EXAM_LEVELS).map(([key, exam]) => (
              <option key={key} value={key}>
                {exam.name} {exam.level !== "auto" ? `(${exam.level})` : ""}
              </option>
            ))}
          </select>
        </div>

        {/* Audio Upload */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Upload Audio
          </label>
          <div
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              audioFile
                ? "border-green-400 bg-green-50"
                : "border-gray-300 hover:border-blue-400 hover:bg-blue-50"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              onChange={(e) => setAudioFile(e.target.files?.[0] || null)}
              className="hidden"
            />
            {audioFile ? (
              <div>
                <p className="text-green-700 font-medium">{audioFile.name}</p>
                <p className="text-sm text-gray-500 mt-1">
                  {(audioFile.size / (1024 * 1024)).toFixed(1)} MB
                </p>
                <p className="text-sm text-gray-400 mt-2">
                  Click to change file
                </p>
              </div>
            ) : (
              <div>
                <svg
                  className="mx-auto h-12 w-12 text-gray-400 mb-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                  />
                </svg>
                <p className="text-gray-600">
                  Click to upload audio file
                </p>
                <p className="text-sm text-gray-400 mt-1">
                  MP3, WAV, M4A, OGG, WebM
                </p>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={!audioFile || isLoading}
          className="w-full py-3 px-6 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <svg
                className="animate-spin h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Analyzing your speaking...
            </span>
          ) : (
            "Evaluate Speaking"
          )}
        </button>
      </form>

      {/* WhatsApp Section */}
      <div className="mt-12 p-6 bg-green-50 border border-green-200 rounded-lg">
        <div className="flex items-center gap-3 mb-3">
          <svg className="h-8 w-8 text-green-600" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
          <h2 className="text-xl font-bold text-green-800">
            Or use WhatsApp
          </h2>
        </div>
        <p className="text-green-700 mb-4">
          Send a voice note directly via WhatsApp for instant evaluation!
        </p>
        <ol className="text-sm text-green-700 space-y-2 list-decimal list-inside mb-4">
          <li>
            Send <span className="font-mono font-bold bg-green-100 px-1.5 py-0.5 rounded">join mouse-next</span> to{" "}
            <span className="font-bold">+1 415 523 8886</span> on WhatsApp
          </li>
          <li>Send a voice note (optionally type a level like &quot;B2&quot; or &quot;FCE&quot;)</li>
          <li>Get your Cambridge evaluation back instantly</li>
        </ol>
        <a
          href="https://wa.me/14155238886?text=join%20mouse-next"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-5 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
          Open WhatsApp
        </a>
      </div>
    </main>
  );
}
