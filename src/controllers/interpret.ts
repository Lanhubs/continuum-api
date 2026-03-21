import type { Context } from "hono";
import { VisionService } from "../services/vision";
import { MedGemmaService } from "../services/medgemma";
import { DocumentRepository } from "../repositories/document";
import { MarkerRepository } from "../repositories/marker";
import { v4 as uuidv4 } from "uuid";
import type { InterpretationResponse, AIAssistantContext, DocumentType } from "../models/interpret";

const scanStatus = new Map<string, { progress: number; status: string; result?: any }>();

export const InterpretController = {
  async interpretLab(c: Context) {
    return this.processInterpretation(c, "LAB_RESULT");
  },

  async interpretPrescription(c: Context) {
    return this.processInterpretation(c, "PRESCRIPTION");
  },

  async processInterpretation(c: Context, forcedType?: string) {
    const body = await c.req.parseBody();
    const image = body["file"] as File;
    const type = (forcedType || ((body["type"] as string) || "LAB_RESULT")) as DocumentType;

    if (!image) return c.json({ error: "No image file provided" }, 400);

    const userId = c.get("userId");
    const scanId = uuidv4();
    scanStatus.set(scanId, { progress: 10, status: "Enhancing" });

    (async () => {
      try {
        const arrayBuffer = await image.arrayBuffer();
        const buffer = Buffer.from(new Uint8Array(arrayBuffer));
        let enhancedBuffer = buffer;
        let mimeType = image.type || "image/jpeg";

        if (image.type !== "application/pdf") {
          try {
            enhancedBuffer = type === 'RADIOLOGY' 
              ? (await MedGemmaService.preprocess(buffer)) as any 
              : (await VisionService.enhanceImage(buffer)) as any;
            mimeType = 'image/jpeg';
          } catch (opencvError) {
            console.error("Enhancement failed:", opencvError);
          }
        }

        scanStatus.set(scanId, { progress: 40, status: "Interpreting" });

        let result: InterpretationResponse;
        if (type === 'RADIOLOGY') {
          const radiologyResult = await MedGemmaService.analyzeScan(enhancedBuffer, mimeType);
          
          const assistantContext: AIAssistantContext = {
            primary_focus: radiologyResult.findings[0] || "Analysis complete",
            suggested_questions: ["What does this mean for my health?", "Should I see a specialist?"],
            report_integrity: Math.round((radiologyResult.confidence || 0.9) * 100)
          };

          if ((radiologyResult.confidence || 0) < 0.85) {
            assistantContext.partner_note = "The scan is slightly unclear for a definitive read. Please consult your physician for a secondary review.";
          }

          result = {
            document_metadata: {
              id: uuidv4(),
              type: 'RADIOLOGY',
              date: new Date().toISOString(),
              summary_message: radiologyResult.findings[0] || "Radiology scan processed.",
              overall_stability: Math.round((radiologyResult.confidence || 0.9) * 100)
            },
            markers: [], 
            radiology_insight: radiologyResult,
            ai_assistant_context: assistantContext
          };

        } else {
          result = await VisionService.interpretDocument(enhancedBuffer, type, userId, mimeType);
        }

        scanStatus.set(scanId, { progress: 80, status: "Finalizing" });

        const doc = await DocumentRepository.create({
          user_id: userId,
          type: result.document_metadata.type,
          date: result.document_metadata.date,
          summary_message: result.document_metadata.summary_message,
          overall_stability: result.document_metadata.overall_stability,
          smart_swap_advice: result.document_metadata.smart_swap_advice,
          raw_image_url: "raw_store_url",
          raw_text: type === 'RADIOLOGY' ? JSON.stringify(result.radiology_insight) : undefined,
        });

        if (result.markers && result.markers.length > 0) {
          await MarkerRepository.createMany(result.markers.map((m) => ({ ...m, document_id: doc.id })));
        }

        scanStatus.set(scanId, { progress: 100, status: "Ready", result });
      } catch (error) {
        console.error("Scan Process Error:", error);
        scanStatus.set(scanId, {
          progress: 0,
          status: "Error",
          result: { error: error instanceof Error ? error.message : "Failed" },
        });
      }
    })();

    return c.json({ scan_id: scanId, status: "Scanning" }, 202);
  },

  async interpret(c: Context) {
    return this.processInterpretation(c);
  },

  async getStatus(c: Context) {
    const id = c.req.param("id");
    if (!id) return c.json({ error: "Missing scan ID" }, 400);
    const status = scanStatus.get(id);
    if (!status) return c.json({ error: "Invalid scan ID" }, 404);
    return c.json(status);
  },
};
