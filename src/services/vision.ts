import {GoogleGenAI} from '@google/genai';
import { cv } from "opencv-wasm";
import {Jimp} from "jimp";
import Tesseract from "tesseract.js";
import type { InterpretationResponse } from "../models/interpret";
import { TypeGuards } from "../utils/guards";
import { MarkerRepository } from "../repositories/marker";

const GEN_AI_KEY = process.env.GEMINI_API_KEY!;

export const VisionService = {
  async initOpenCV() {
    return new Promise((resolve) => {
      if ((cv as any).Mat) {
        resolve(true);
      } else {
        (cv as any).onRuntimeInitialized = () => resolve(true);
      }
    });
  },

  async enhanceImage(imageBuffer: Buffer): Promise<Buffer> {
    await this.initOpenCV();

    const jimpImage = await Jimp.read(imageBuffer);
    const src = cv.matFromImageData(jimpImage.bitmap);
    let gray = new cv.Mat();
    
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

    let thresholded = new cv.Mat();
    cv.adaptiveThreshold(gray, thresholded, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY, 11, 2);

    let contours = new cv.MatVector();
    let hierarchy = new cv.Mat();
    cv.findContours(thresholded, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

    let maxArea = 0;
    let maxContourIndex = -1;
    for (let i = 0; i < contours.size(); ++i) {
      let area = cv.contourArea(contours.get(i));
      if (area > maxArea) {
        maxArea = area;
        maxContourIndex = i;
      }
    }

    let deskewed = gray.clone();
    if (maxContourIndex !== -1) {
      let rect = cv.minAreaRect(contours.get(maxContourIndex));
      let angle = rect.angle;
      if (angle < -45) angle = 90 + angle;

      const center = new cv.Point(src.cols / 2, src.rows / 2);
      const M = cv.getRotationMatrix2D(center, angle, 1.0);
      cv.warpAffine(gray, deskewed, M, new cv.Size(src.cols, src.rows), cv.INTER_CUBIC, cv.BORDER_REPLICATE);
      M.delete();
    }

    let outRgba = new cv.Mat();
    cv.cvtColor(deskewed, outRgba, cv.COLOR_GRAY2RGBA);

    const outJimp = new Jimp({
      width: outRgba.cols,
      height: outRgba.rows,
      data: Buffer.from(outRgba.data)
    });

    const resultBuffer = await outJimp.getBuffer('image/jpeg' );

    src.delete();
    gray.delete();
    thresholded.delete();
    contours.delete();
    hierarchy.delete();
    deskewed.delete();
    outRgba.delete();

    return resultBuffer;
  },

  async performRawOCR(imageBuffer: Buffer): Promise<string> {
    try {
      const { data: { text } } = await Tesseract.recognize(imageBuffer, 'eng');
      return text;
    } catch (error) {
      console.warn("[OCR] Tesseract failed:", error);
      return "";
    }
  },

  async interpretDocument(imageBuffer: Buffer, type: string, userId?: string, mimeType: string = 'image/jpeg'): Promise<InterpretationResponse> {
    const client = new GoogleGenAI({ apiKey: GEN_AI_KEY });
    const rawOCR = await this.performRawOCR(imageBuffer);

    let historicalContext = "";
    if (userId) {
      const commonMarkers = ["Glucose", "HbA1c", "Cholesterol", "Creatinine"];
      const history = await MarkerRepository.findLatestByName(userId, commonMarkers);
      if (history.length > 0) {
        historicalContext = "\nHISTORICAL CONTEXT (Past Results):\n" + 
          history.map(h => `- ${h.name}: ${h.value} ${h.unit} (Date: ${h.date})`).join("\n");
      }
    }

    const prompt = `
      Act as a Lead Medical Interpreter for "continuum," a medical partner app for Nigerian patients.
      Interpret the provided image and return a JSON response strictly following the continuum UI-Ready format.
      
      ${historicalContext}

      RAW OCR SCAN:
      \`\`\`
      ${rawOCR || "No readable text."}
      \`\`\`

      Identify the type of document from the following options:
      - LAB_RESULT | PRESCRIPTION | RADIOLOGY | CONSULTATION_NOTE | VACCINATION_RECORD | DISCHARGE_SUMMARY

      Initial Hint: This is likely a ${type}.

      GUIARDRAILS:
      1. DO NOT diagnose.
      2. Interpret values in plain English.
      3. ANTI-HALLUCINATION: If unsure, set value to "UNREADABLE".
      4. SMART SWAPS: Provide Nigerian-specific dietary staples.
      
      The Grandma Test: Translate all technical terms into very simple English.
          
      JSON SCHEMA:
      {
        "document_metadata": { "type": "...", "date": "...", "summary_message": "...", "overall_stability": 0-100 },
        "markers": [ { "name": "...", "value": 0, "unit": "...", "reference_range": "...", "stability_score": 0, "status_color": "...", "status_label": "...", "interpretation": "...", "smart_swap_advice": { "dietary": "...", "lifestyle": "..." } } ],
        "radiology_insight": { "findings": [], "impressions": [], "anatomy_map": { "region": "...", "description": "..." } },
        "ai_assistant_context": { "primary_focus": "...", "suggested_questions": [], "report_integrity": 0-100 }
      }
    `;

    const response = await client.models.generateContent({
      model: "gemini-2.5-flash", 
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            {
              inlineData: {
                data: imageBuffer.toString("base64"),
                mimeType: mimeType
              }
            }
          ]
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            document_metadata: {
              type: "object",
              properties: {
                type: { 
                  type: "string", 
                  enum: ["LAB_RESULT", "PRESCRIPTION", "RADIOLOGY", "CONSULTATION_NOTE", "VACCINATION_RECORD", "DISCHARGE_SUMMARY"] 
                },
                date: { type: "string" },
                summary_message: { type: "string" },
                overall_stability: { type: "number" }
              },
              required: ["type", "date", "summary_message", "overall_stability"]
            },
            markers: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  value: { type: "number" },
                  unit: { type: "string" },
                  reference_range: { type: "string" },
                  stability_score: { type: "number" },
                  status_color: { 
                    type: "string", 
                    enum: ["forest-green", "amber", "crimson"] 
                  },
                  status_label: { type: "string" },
                  interpretation: { type: "string" },
                  smart_swap_advice: {
                    type: "object",
                    properties: {
                      dietary: { type: "string" },
                      lifestyle: { type: "string" }
                    },
                    required: ["dietary", "lifestyle"]
                  }
                },
                required: ["name", "value", "unit", "reference_range", "stability_score", "status_color", "status_label", "interpretation"]
              }
            },
            radiology_insight: {
              type: "object",
              properties: {
                findings: { type: "array", items: { type: "string" } },
                impressions: { type: "array", items: { type: "string" } },
                anatomy_map: {
                  type: "object",
                  properties: {
                    region: { type: "string" },
                    description: { type: "string" }
                  },
                  required: ["region", "description"]
                }
              },
              required: ["findings", "impressions", "anatomy_map"]
            },
            ai_assistant_context: {
              type: "object",
              properties: {
                primary_focus: { type: "string" },
                suggested_questions: { type: "array", items: { type: "string" } },
                report_integrity: { type: "number" }
              },
              required: ["primary_focus", "suggested_questions", "report_integrity"]
            }
          },
          required: ["document_metadata", "markers", "ai_assistant_context"]
        }
      }
    });

    let resultText = response.text || "";
    if (resultText.startsWith("```json")) {
      resultText = resultText.replace(/^```json\n/, "").replace(/\n```$/, "");
    } else if (resultText.startsWith("```")) {
      resultText = resultText.replace(/^```\n/, "").replace(/\n```$/, "");
    }
    
    const parsed = JSON.parse(resultText);

    if (!TypeGuards.isInterpretationResponse(parsed)) {
      throw new Error("AI response failed Type Integrity check");
    }

    return parsed;
  }
};
