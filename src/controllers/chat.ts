import type { Context } from "hono";
import { ChatService, type ChatMessage } from "../services/chat";
import { DocumentRepository } from "../repositories/document";
import { MarkerRepository } from "../repositories/marker";
import { VisionService } from "../services/vision";

const sessions = new Map<string, ChatMessage[]>();

export const ChatController = {
  async chat(c: Context) {
    const body = await c.req.parseBody();
    const message = (body['message'] as string) || "";
    const session_id = body['session_id'] as string | undefined;
    const image = body['image'] as File | undefined;
    const type = body['type'] as string | undefined;

    if (!message.trim() && !image) return c.json({ error: "Message or image is required" }, 400);

    const userId = c.get("userId");
    const sessionId = session_id || crypto.randomUUID();
    const history = sessions.get(sessionId) || [];

    const [documents, recentMarkers] = await Promise.all([
      DocumentRepository.findByUserId(userId),
      MarkerRepository.findLatestByName(userId, [
        "Glucose", "HbA1c", "Cholesterol", "Creatinine",
        "Haemoglobin", "Blood Pressure", "BMI",
      ]),
    ]);

    const systemContext = ChatService.buildSystemContext(documents, recentMarkers);
    let enhancedImageBuffer: Buffer | undefined;
    let mimeType: string | undefined;

    if (image) {
      try {
        const buffer = Buffer.from(await image.arrayBuffer());
        if (image.type === 'application/pdf') {
          enhancedImageBuffer = buffer;
          mimeType = 'application/pdf';
        } else {
          try {
            enhancedImageBuffer = (await VisionService.enhanceImage(buffer)) as any;
            mimeType = 'image/jpeg';
          } catch (opencvError) {
            enhancedImageBuffer = buffer;
            mimeType = image.type || 'image/jpeg';
          }
        }
      } catch (e) {
        console.error("Image processing error:", e);
      }
    }

    let reply: string;
    let discoveryNotice = "";

    if (image && enhancedImageBuffer) {
      try {
        const result = await VisionService.interpretDocument(enhancedImageBuffer, (type as any) || "AUTO", userId, mimeType);
        
        if (result.document_metadata.overall_stability > 50) {
          const doc = await DocumentRepository.create({
            user_id: userId,
            type: result.document_metadata.type,
            date: result.document_metadata.date,
            summary_message: result.document_metadata.summary_message,
            overall_stability: result.document_metadata.overall_stability,
            smart_swap_advice: result.document_metadata.smart_swap_advice,
            raw_image_url: `chat_auto_${Date.now()}`, 
          });

          if (result.markers.length > 0) {
            await MarkerRepository.createMany(
              result.markers.map((m) => ({ ...m, document_id: doc.id }))
            );
          }
          
          let classificationLabel = "[LAB REPORT DETECTED]";
          if (result.document_metadata.type === "PRESCRIPTION") classificationLabel = "[PRESCRIPTION DETECTED]";
          if (result.document_metadata.type === "RADIOLOGY") classificationLabel = "[RADIOLOGY SCAN DETECTED]";

          discoveryNotice = `(SYSTEM NOTE: ${classificationLabel}. You just detected and automatically saved a ${result.document_metadata.type} to the user's health records. Summary: ${result.document_metadata.summary_message}. Acknowledge this to the user in a helpful, friendly way.)`;
        }
      } catch (discoveryError) {
        console.warn("Passive discovery skipped or failed:", discoveryError);
      }
    }

    try {
      const finalMessage = discoveryNotice ? `${message}\n\n${discoveryNotice}` : message;
      reply = await ChatService.sendMessage(history, finalMessage, systemContext, enhancedImageBuffer, mimeType);
    } catch (error) {
      console.error("Chat Error:", error);
      return c.json({ error: "Failed to generate response" }, 500);
    }

    history.push({ role: "user", parts: [{ text: message + (image ? ` [Attached: ${image.name}]` : "") }] });
    history.push({ role: "model", parts: [{ text: reply }] });
    sessions.set(sessionId, history);

    return c.json({ reply, session_id: sessionId });
  },

  async getRecentDocuments(c: Context) {
    const limit = parseInt(c.req.query("limit") || "5");
    const userId = c.get("userId");

    try {
      const documents = await DocumentRepository.findByUserId(userId);
      return c.json(documents.slice(0, limit).map((d) => ({
        id: d.id,
        type: d.type,
        date: d.date,
        summary_message: d.summary_message,
        overall_stability: d.overall_stability,
      })));
    } catch (error) {
      console.error("Recent Docs Error:", error);
      return c.json({ error: "Failed to fetch recent documents" }, 500);
    }
  },
};

