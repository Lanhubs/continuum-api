import { GoogleGenAI } from "@google/genai";
import type { DocumentRecord } from "../repositories/document";
import { MarkerRecord } from "../models/interpret";

const GEN_AI_KEY = process.env.GEMINI_API_KEY || "";

export interface ChatMessage {
  role: "user" | "model";
  parts: { text: string }[];
}

export const ChatService = {
  /**
   * Build a system prompt grounded in the user's medical history.
   * This is the "Active Context" panel bridging the UI to the AI.
   */
  buildSystemContext(
    documents: DocumentRecord[],
    recentMarkers: MarkerRecord[],
  ): string {
    const docSummaries = documents
      .slice(0, 5)
      .map(
        (d) =>
          `- [${d.type}] ${new Date(d.date).toLocaleDateString()}: ${d.summary_message} (Stability: ${d.overall_stability}%)`,
      )
      .join("\n");

    const markerSummaries = recentMarkers
      .slice(0, 10)
      .map(
        (m) =>
          `  - ${m.name}: ${m.value} ${m.unit} — ${m.status_label} (${m.interpretation})`,
      )
      .join("\n");

    return `
          You are "Stride AI Partner", a private, compassionate health companion for Nigerian patients using the continuum Medical Partner app.

          PATIENT RECENT HISTORY:
          ${docSummaries || "No records uploaded yet."}

          KEY MARKERS:
          ${markerSummaries || "No markers available."}

          CRITICAL GUARDRAILS:
          1. NEVER diagnose any condition. Your role is to explain, not prescribe.
          2. Use calm, simplistic and reassuring language — avoid alarmist terms.
          3. When referencing results, say "based on your recent report" not "your diagnosis is".
          4. Suggest Nigerian-specific diet swaps (e.g. ofada rice, unripe plantain) when relevant.
          5. DEEP RESEARCH (RABBIT HOLE): You are encouraged to go down the "rabbit hole" for the user. If they ask about a complex or emerging marker (e.g. Cystatin-C, Lp(a), or specific genetic markers), use your vast internal medical knowledge to explain it deeply but simply.
          6. CROSS-REFERENCING: Connect the dots between different markers (e.g. how high blood sugar affects kidney markers) to provide a holistic view of their health status.
          7. SUGGEST DEEP DIVES: If the user seems curious about a specific value, offer to explain the science behind it in a plain-English "Deep Dive".
          8. When the user asks about something not in their history, say: "I don't see that in your records yet — but I can explain what it means generally if you like, or you can upload a report for me to verify."
          9. Keep responses structured, concise, and incredibly easy for a non-medical person to grasp.

    `.trim();
  },

  /**
   * Send a message and get a streaming or non-streaming response, with full conversation history.
   */
  async sendMessage(
    history: ChatMessage[],
    userMessage: string,
    systemContext: string,
    imageBuffer?: Buffer,
    mimeType: string = "image/jpeg",
  ): Promise<string> {
    const client = new GoogleGenAI({ apiKey: GEN_AI_KEY });

    const userParts: any[] = [{ text: userMessage || "Analyze this image." }];

    if (imageBuffer) {
      userParts.push({
        inlineData: {
          data: imageBuffer.toString("base64"),
          mimeType: mimeType,
        },
      });
    }

    const contents = [
      // Prepend the grounding context as the first user turn
      {
        role: "user" as const,
        parts: [{ text: systemContext }],
      },
      {
        role: "model" as const,
        parts: [
          {
            text: "Understood. I'm ready to help based on this patient's records.",
          },
        ],
      },
      // Include conversation history
      ...history,
      // Add the new user message
      {
        role: "user" as const,
        parts: userParts,
      },
    ];

    const response = await client.models.generateContent({
      model: "gemini-2.5-flash",
      contents,
    });

    return response.text || "";
  },
};
