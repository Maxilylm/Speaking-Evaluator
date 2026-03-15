import { NextRequest, NextResponse } from "next/server";

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

    // Fire off background processing - don't await it
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `https://${request.headers.get("host")}`;
    fetch(`${baseUrl}/api/whatsapp/process`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ from, body, mediaUrl, mediaContentType }),
    }).catch((err) => console.error("Failed to trigger background process:", err));

    // Return TwiML immediately so Twilio doesn't timeout
    return twimlResponse("Analyzing your speaking... I'll send your results in a moment!");
  } catch (error) {
    console.error("WhatsApp webhook error:", error);
    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?><Response><Message>Sorry, something went wrong. Please try again.</Message></Response>`,
      { headers: { "Content-Type": "text/xml" } }
    );
  }
}
