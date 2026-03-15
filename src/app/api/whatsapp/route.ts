import { NextRequest, NextResponse } from "next/server";
import { evaluateSpeaking } from "@/lib/evaluate";
import twilio from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioNumber = process.env.TWILIO_WHATSAPP_NUMBER || "whatsapp:+14155238886";

function getTwilioClient() {
  if (!accountSid || !authToken) {
    throw new Error("Twilio credentials not configured");
  }
  return twilio(accountSid, authToken);
}

async function sendWhatsAppMessage(to: string, body: string) {
  const client = getTwilioClient();
  await client.messages.create({
    from: twilioNumber,
    to,
    body,
  });
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const from = formData.get("From") as string;
    const numMedia = parseInt(formData.get("NumMedia") as string) || 0;
    const body = (formData.get("Body") as string) || "";

    // Respond with TwiML
    const twimlResponse = (msg: string) =>
      new NextResponse(
        `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${msg}</Message></Response>`,
        { headers: { "Content-Type": "text/xml" } }
      );

    if (numMedia === 0) {
      return twimlResponse(
        "👋 Welcome to Speaking Evaluator!\n\n" +
          "Send me a voice note or audio file of your speaking practice, and I'll evaluate it using Cambridge English criteria.\n\n" +
          "You can also specify a level:\n" +
          "• A2 KEY\n• B1 PET\n• B2 FCE\n• C1 CAE\n• C2 CPE\n\n" +
          "Just send the level name before or with your audio!"
      );
    }

    // Get the audio media
    const mediaUrl = formData.get("MediaUrl0") as string;
    const mediaContentType = formData.get("MediaContentType0") as string;

    if (!mediaContentType?.startsWith("audio/")) {
      return twimlResponse("Please send an audio file or voice note. I can only evaluate spoken English.");
    }

    // Determine exam level from message body
    let examLevel: "A2_KEY" | "B1_PRELIMINARY" | "B2_FIRST" | "C1_ADVANCED" | "C2_PROFICIENCY" | "AUTO_DETECT" = "AUTO_DETECT";
    const upperBody = body.toUpperCase();
    if (upperBody.includes("A2") || upperBody.includes("KEY")) examLevel = "A2_KEY";
    else if (upperBody.includes("B1") || upperBody.includes("PET")) examLevel = "B1_PRELIMINARY";
    else if (upperBody.includes("B2") || upperBody.includes("FCE")) examLevel = "B2_FIRST";
    else if (upperBody.includes("C1") || upperBody.includes("CAE")) examLevel = "C1_ADVANCED";
    else if (upperBody.includes("C2") || upperBody.includes("CPE")) examLevel = "C2_PROFICIENCY";

    // Send acknowledgment
    // (TwiML response is immediate, then we process async)

    // Fetch the audio from Twilio
    const audioResponse = await fetch(mediaUrl, {
      headers: {
        Authorization: "Basic " + Buffer.from(`${accountSid}:${authToken}`).toString("base64"),
      },
    });
    const audioBuffer = await audioResponse.arrayBuffer();
    const audioBase64 = Buffer.from(audioBuffer).toString("base64");

    let mediaType: "audio/webm" | "audio/mp4" | "audio/mpeg" | "audio/wav" | "audio/ogg" = "audio/ogg";
    if (mediaContentType.includes("mp4") || mediaContentType.includes("m4a")) mediaType = "audio/mp4";
    else if (mediaContentType.includes("mpeg") || mediaContentType.includes("mp3")) mediaType = "audio/mpeg";
    else if (mediaContentType.includes("webm")) mediaType = "audio/webm";
    else if (mediaContentType.includes("wav")) mediaType = "audio/wav";

    // Evaluate
    const result = await evaluateSpeaking(audioBase64, mediaType, examLevel);

    // Format results for WhatsApp
    const scoreLines = result.criteria
      .map((c) => `• ${c.criterion}: ${c.score}/${c.maxScore}`)
      .join("\n");

    const goodExamples = result.examples
      .filter((e) => e.quality === "good")
      .slice(0, 3)
      .map((e) => `✅ "${e.transcriptExcerpt}" - ${e.explanation}`)
      .join("\n");

    const badExamples = result.examples
      .filter((e) => e.quality === "bad")
      .slice(0, 3)
      .map((e) => `❌ "${e.transcriptExcerpt}" - ${e.explanation}`)
      .join("\n");

    const resultMessage =
      `📊 *Speaking Evaluation*\n` +
      `Level: ${result.detectedLevel || result.examLevel}\n` +
      `Overall: ${result.overallScore}/${result.maxOverallScore}\n\n` +
      `*Scores:*\n${scoreLines}\n\n` +
      `*Good moments:*\n${goodExamples}\n\n` +
      `*Areas to improve:*\n${badExamples}\n\n` +
      `${result.generalFeedback}\n\n` +
      `📱 For a detailed view with audio playback, visit the web app!`;

    // Send the result as a follow-up message
    await sendWhatsAppMessage(from, resultMessage);

    return twimlResponse("🎧 Analyzing your speaking... I'll send your results shortly!");
  } catch (error) {
    console.error("WhatsApp webhook error:", error);
    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?><Response><Message>Sorry, something went wrong processing your audio. Please try again.</Message></Response>`,
      { headers: { "Content-Type": "text/xml" } }
    );
  }
}
