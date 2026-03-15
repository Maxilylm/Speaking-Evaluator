import Groq from "groq-sdk";
import { EXAM_LEVELS, ExamLevel, EvaluationResult } from "./cambridge-rubric";

function getGroq() {
  return new Groq({ apiKey: process.env.GROQ_API_KEY });
}

/**
 * Transcribe audio using Groq Whisper (free).
 * Accepts a Buffer of the audio file.
 */
async function transcribeAudio(
  audioBuffer: Buffer,
  fileName: string
): Promise<{ text: string; segments: { start: number; end: number; text: string }[] }> {
  const file = new File([new Uint8Array(audioBuffer)], fileName, { type: "audio/mpeg" });

  const transcription = await getGroq().audio.transcriptions.create({
    file,
    model: "whisper-large-v3",
    response_format: "verbose_json",
    timestamp_granularities: ["segment"],
  });

  return {
    text: transcription.text,
    segments: ((transcription as unknown as { segments?: { start: number; end: number; text: string }[] }).segments ?? []).map((s) => ({
      start: s.start,
      end: s.end,
      text: s.text,
    })),
  };
}

/**
 * Evaluate a transcript using Groq Llama (free).
 */
async function evaluateTranscript(
  transcript: string,
  segments: { start: number; end: number; text: string }[],
  examLevel: ExamLevel
): Promise<EvaluationResult> {
  const exam = EXAM_LEVELS[examLevel];

  const levelInstruction =
    examLevel === "AUTO_DETECT"
      ? `First, determine the speaker's approximate CEFR level (A1-C2) based on their performance. Then evaluate according to the Cambridge Speaking assessment criteria for that level.`
      : `Evaluate this speaking performance according to the Cambridge ${exam.name} (${exam.level}) speaking assessment criteria.`;

  const segmentText = segments
    .map((s) => `[${s.start.toFixed(1)}s - ${s.end.toFixed(1)}s] ${s.text}`)
    .join("\n");

  const prompt = `You are an expert Cambridge English Speaking examiner. ${levelInstruction}

Here is the timestamped transcript of the speaker:

${segmentText}

Criteria to assess (each scored 0-${exam.maxScore}):
${exam.criteria.map((c) => `- ${c}`).join("\n")}

IMPORTANT: You must respond with ONLY valid JSON (no markdown, no code fences). Use this exact structure:
{
  "detectedLevel": "B2",
  "overallScore": 15,
  "maxOverallScore": 20,
  "criteria": [
    {
      "criterion": "Grammar and Vocabulary",
      "score": 4,
      "maxScore": 5,
      "feedback": "Detailed feedback here"
    }
  ],
  "examples": [
    {
      "timestamp": 12.5,
      "endTimestamp": 18.0,
      "transcriptExcerpt": "exact words spoken",
      "criterion": "Grammar and Vocabulary",
      "quality": "good",
      "explanation": "Why this is a good/bad example"
    }
  ],
  "generalFeedback": "Overall assessment and advice"
}

Rules for examples:
- Include 4-8 examples total, mix of "good" and "bad"
- Use the timestamps from the transcript segments above
- Each example should reference a specific criterion
- Transcript excerpts should be the actual words spoken in that moment
- For "bad" examples, explain what was wrong and how to improve`;

  const response = await getGroq().chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.3,
    max_tokens: 4096,
  });

  const text = response.choices[0]?.message?.content || "";

  // Parse the JSON response, stripping any markdown fences if present
  let jsonStr = text.trim();
  if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  const parsed = JSON.parse(jsonStr);

  return {
    examLevel: examLevel === "AUTO_DETECT" ? "Auto-detected" : exam.name,
    detectedLevel: parsed.detectedLevel,
    overallScore: parsed.overallScore,
    maxOverallScore: parsed.maxOverallScore || exam.criteria.length * exam.maxScore,
    criteria: parsed.criteria,
    examples: parsed.examples,
    generalFeedback: parsed.generalFeedback,
    transcript,
  };
}

/**
 * Main entry point: transcribe audio with Whisper, then evaluate with Llama.
 */
export async function evaluateSpeaking(
  audioBase64: string,
  _mediaType: string,
  examLevel: ExamLevel
): Promise<EvaluationResult> {
  const audioBuffer = Buffer.from(audioBase64, "base64");

  // Step 1: Transcribe with Whisper (free on Groq)
  const { text, segments } = await transcribeAudio(audioBuffer, "audio.mp3");

  if (!text || text.trim().length === 0) {
    throw new Error("Could not transcribe any speech from the audio. Please check the recording.");
  }

  // Step 2: Evaluate with Llama 3.3 70B (free on Groq)
  const result = await evaluateTranscript(text, segments, examLevel);

  return result;
}
