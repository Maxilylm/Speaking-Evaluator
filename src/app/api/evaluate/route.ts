import { NextRequest, NextResponse } from "next/server";
import { evaluateSpeaking } from "@/lib/evaluate";
import { ExamLevel } from "@/lib/cambridge-rubric";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get("audio") as File | null;
    const examLevel = (formData.get("examLevel") as ExamLevel) || "AUTO_DETECT";

    if (!audioFile) {
      return NextResponse.json({ error: "No audio file provided" }, { status: 400 });
    }

    const bytes = await audioFile.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");

    // Map common audio MIME types
    let mediaType: "audio/webm" | "audio/mp4" | "audio/mpeg" | "audio/wav" | "audio/ogg" = "audio/mpeg";
    const mime = audioFile.type;
    if (mime.includes("webm")) mediaType = "audio/webm";
    else if (mime.includes("mp4") || mime.includes("m4a")) mediaType = "audio/mp4";
    else if (mime.includes("wav")) mediaType = "audio/wav";
    else if (mime.includes("ogg")) mediaType = "audio/ogg";

    const result = await evaluateSpeaking(base64, mediaType, examLevel);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Evaluation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Evaluation failed" },
      { status: 500 }
    );
  }
}
