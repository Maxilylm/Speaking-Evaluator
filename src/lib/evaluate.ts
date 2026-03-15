import Anthropic from "@anthropic-ai/sdk";
import { EXAM_LEVELS, ExamLevel, EvaluationResult } from "./cambridge-rubric";

const anthropic = new Anthropic();

export async function evaluateSpeaking(
  audioBase64: string,
  mediaType: "audio/webm" | "audio/mp4" | "audio/mpeg" | "audio/wav" | "audio/ogg",
  examLevel: ExamLevel
): Promise<EvaluationResult> {
  const exam = EXAM_LEVELS[examLevel];

  const levelInstruction =
    examLevel === "AUTO_DETECT"
      ? `First, determine the speaker's approximate CEFR level (A1-C2) based on their performance. Then evaluate according to the Cambridge Speaking assessment criteria for that level.`
      : `Evaluate this speaking performance according to the Cambridge ${exam.name} (${exam.level}) speaking assessment criteria.`;

  const prompt = `You are an expert Cambridge English Speaking examiner. ${levelInstruction}

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
  "generalFeedback": "Overall assessment and advice",
  "transcript": "Full transcript of the speech"
}

Rules for examples:
- Include 4-8 examples total, mix of "good" and "bad"
- Timestamps should be approximate seconds from start
- Each example should reference a specific criterion
- Transcript excerpts should be the actual words spoken in that moment
- For "bad" examples, explain what was wrong and how to improve

Provide the full transcript of everything said. Be precise with timestamps.`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "document",
            source: {
              type: "base64",
              media_type: mediaType as "application/pdf",
              data: audioBase64,
            },
          } as Anthropic.DocumentBlockParam,
          {
            type: "text",
            text: prompt,
          },
        ],
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

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
    transcript: parsed.transcript,
  };
}
