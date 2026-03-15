import { NextRequest, NextResponse } from "next/server";
import { evaluateSpeaking } from "@/lib/evaluate";
import twilio from "twilio";

export const maxDuration = 60; // Vercel Pro: up to 60s, Free: 10s

export async function POST(request: NextRequest) {
  const { from, body, mediaUrl, mediaContentType } = await request.json();

  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioNumber = process.env.TWILIO_WHATSAPP_NUMBER || "whatsapp:+14155238886";

    if (!accountSid || !authToken) {
      throw new Error("Twilio credentials not configured");
    }

    const twilioClient = twilio(accountSid, authToken);

    const sendMessage = async (msg: string) => {
      await twilioClient.messages.create({ from: twilioNumber, to: from, body: msg });
    };

    // Determine exam level from message body
    let examLevel: "A2_KEY" | "B1_PRELIMINARY" | "B2_FIRST" | "C1_ADVANCED" | "C2_PROFICIENCY" | "AUTO_DETECT" = "AUTO_DETECT";
    const upperBody = (body || "").toUpperCase();
    if (upperBody.includes("A2") || upperBody.includes("KEY")) examLevel = "A2_KEY";
    else if (upperBody.includes("B1") || upperBody.includes("PET")) examLevel = "B1_PRELIMINARY";
    else if (upperBody.includes("B2") || upperBody.includes("FCE")) examLevel = "B2_FIRST";
    else if (upperBody.includes("C1") || upperBody.includes("CAE")) examLevel = "C1_ADVANCED";
    else if (upperBody.includes("C2") || upperBody.includes("CPE")) examLevel = "C2_PROFICIENCY";

    // Fetch audio from Twilio
    const audioResponse = await fetch(mediaUrl, {
      headers: {
        Authorization: "Basic " + Buffer.from(`${accountSid}:${authToken}`).toString("base64"),
      },
    });

    if (!audioResponse.ok) {
      throw new Error(`Failed to fetch audio from Twilio: ${audioResponse.status}`);
    }

    const audioBuffer = await audioResponse.arrayBuffer();
    const audioBase64 = Buffer.from(audioBuffer).toString("base64");

    // Evaluate
    const result = await evaluateSpeaking(audioBase64, mediaContentType, examLevel);

    // Format results
    const scoreLines = result.criteria
      .map((c) => `${c.criterion}: ${c.score}/${c.maxScore}`)
      .join("\n");

    const goodExamples = result.examples
      .filter((e) => e.quality === "good")
      .slice(0, 3)
      .map((e) => `"${e.transcriptExcerpt}" - ${e.explanation}`)
      .join("\n\n");

    const badExamples = result.examples
      .filter((e) => e.quality === "bad")
      .slice(0, 3)
      .map((e) => `"${e.transcriptExcerpt}" - ${e.explanation}`)
      .join("\n\n");

    const resultMessage =
      `*Speaking Evaluation*\n` +
      `Level: ${result.detectedLevel || result.examLevel}\n` +
      `Overall: ${result.overallScore}/${result.maxOverallScore}\n\n` +
      `*Scores:*\n${scoreLines}\n\n` +
      `*Good moments:*\n${goodExamples}\n\n` +
      `*Areas to improve:*\n${badExamples}\n\n` +
      `${result.generalFeedback}`;

    // WhatsApp has a 1600 char limit per message
    if (resultMessage.length > 1500) {
      // Split into two messages
      const mid = resultMessage.indexOf("*Areas to improve:*");
      if (mid > 0) {
        await sendMessage(resultMessage.substring(0, mid).trim());
        await sendMessage(resultMessage.substring(mid).trim());
      } else {
        await sendMessage(resultMessage.substring(0, 1500));
        await sendMessage(resultMessage.substring(1500));
      }
    } else {
      await sendMessage(resultMessage);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("WhatsApp process error:", error);

    // Try to notify the user of the error
    try {
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      const twilioNumber = process.env.TWILIO_WHATSAPP_NUMBER || "whatsapp:+14155238886";
      if (accountSid && authToken) {
        const twilioClient = twilio(accountSid, authToken);
        await twilioClient.messages.create({
          from: twilioNumber,
          to: from,
          body: `Sorry, I couldn't evaluate your audio. Error: ${error instanceof Error ? error.message : "Unknown error"}. Please try again with a shorter recording.`,
        });
      }
    } catch (sendErr) {
      console.error("Failed to send error message:", sendErr);
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Processing failed" },
      { status: 500 }
    );
  }
}
