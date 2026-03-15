import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { evaluateSpeaking } from "@/lib/evaluate";
import twilio from "twilio";

export const maxDuration = 60;

async function processAndReply(
  from: string,
  body: string,
  mediaUrl: string,
  mediaContentType: string
) {
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioNumber = process.env.TWILIO_WHATSAPP_NUMBER || "whatsapp:+14155238886";

    if (!accountSid || !authToken) {
      console.error("Twilio credentials not configured");
      return;
    }

    const twilioClient = twilio(accountSid, authToken);
    const sendMessage = async (msg: string) => {
      await twilioClient.messages.create({ from: twilioNumber, to: from, body: msg });
    };

    // Determine exam level
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
      await sendMessage(`Failed to download your audio (${audioResponse.status}). Please try again.`);
      return;
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
      (goodExamples ? `*Good moments:*\n${goodExamples}\n\n` : "") +
      (badExamples ? `*Areas to improve:*\n${badExamples}\n\n` : "") +
      `${result.generalFeedback}`;

    if (resultMessage.length > 1500) {
      const mid = resultMessage.indexOf("*Areas to improve:*");
      if (mid > 0) {
        await sendMessage(resultMessage.substring(0, mid).trim());
        await sendMessage(resultMessage.substring(mid).trim());
      } else {
        await sendMessage(resultMessage.substring(0, 1500));
        if (resultMessage.length > 1500) {
          await sendMessage(resultMessage.substring(1500));
        }
      }
    } else {
      await sendMessage(resultMessage);
    }
  } catch (error) {
    console.error("WhatsApp process error:", error);
    try {
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      const twilioNumber = process.env.TWILIO_WHATSAPP_NUMBER || "whatsapp:+14155238886";
      if (accountSid && authToken) {
        const twilioClient = twilio(accountSid, authToken);
        await twilioClient.messages.create({
          from: twilioNumber,
          to: from,
          body: `Sorry, evaluation failed: ${error instanceof Error ? error.message : "Unknown error"}. Try a shorter recording.`,
        });
      }
    } catch (sendErr) {
      console.error("Failed to send error message:", sendErr);
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const from = formData.get("From") as string;
    const numMedia = parseInt(formData.get("NumMedia") as string) || 0;
    const body = (formData.get("Body") as string) || "";

    const twimlResponse = (msg: string) =>
      new NextResponse(
        `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${msg}</Message></Response>`,
        { headers: { "Content-Type": "text/xml" } }
      );

    if (numMedia === 0) {
      return twimlResponse(
        "Welcome to Speaking Evaluator!\n\n" +
          "Send me a voice note or audio file and I'll evaluate it using Cambridge English criteria.\n\n" +
          "You can also specify a level:\n" +
          "A2 KEY / B1 PET / B2 FCE / C1 CAE / C2 CPE\n\n" +
          "Just type the level with your audio!"
      );
    }

    const mediaUrl = formData.get("MediaUrl0") as string;
    const mediaContentType = formData.get("MediaContentType0") as string;

    if (!mediaContentType?.startsWith("audio/")) {
      return twimlResponse("Please send an audio file or voice note. I can only evaluate spoken English.");
    }

    // Use after() to continue processing after sending the TwiML response
    // This keeps the serverless function alive on Vercel
    after(processAndReply(from, body, mediaUrl, mediaContentType));

    return twimlResponse("Analyzing your speaking... I'll send your results in a moment!");
  } catch (error) {
    console.error("WhatsApp webhook error:", error);
    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?><Response><Message>Sorry, something went wrong. Please try again.</Message></Response>`,
      { headers: { "Content-Type": "text/xml" } }
    );
  }
}
