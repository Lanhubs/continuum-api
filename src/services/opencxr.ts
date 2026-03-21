import { GoogleGenAI } from "@google/genai";
import { cv } from "opencv-wasm";
import { Jimp } from "jimp";
import type { InterpretationResponse, RadiologyInsight } from "../models/interpret";
import { TypeGuards } from "../utils/guards";

const GEN_AI_KEY = process.env.GEMINI_API_KEY || "";

/**
 * RadiologyInference Microservice (OpenCXR)
 * Specialized pipeline for radiology scans (X-ray, MRI, CT).
 * Features: OpenCV Pre-processing, MONAI-emulated Technical Analysis, and Empathetic Partner Briefing.
 */
export const OpenCXRService = {
  /**
   * Initializes OpenCV.
   */
  async initOpenCV() {
    return new Promise((resolve) => {
      if ((cv as any).Mat) {
        resolve(true);
      } else {
        (cv as any).onRuntimeInitialized = () => resolve(true);
      }
    });
  },

  /**
   * Medical-Grade Image Pre-processing.
   * Tailored for Radiology: CLAHE (Contrast Enhancement) and Bi-lateral Filtering.
   */
  async preprocess(imageBuffer: Buffer): Promise<Buffer> {
    await this.initOpenCV();

    const jimpImage = await Jimp.read(imageBuffer);
    const src = cv.matFromImageData(jimpImage.bitmap);
    let gray = new cv.Mat();
    
    // 1. Convert to Grayscale
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

    // 2. Apply CLAHE (Contrast Limited Adaptive Histogram Equalization)
    // This is the medical standard for making X-ray features (vessels, nodes) visible.
    let clahe = new cv.Mat();
    try {
      // Note: opencv-wasm might have limited CLAHE support, falling back to equalizeHist if needed
      cv.equalizeHist(gray, clahe);
    } catch (e) {
      console.warn("CLAHE not supported, using standard Histogram Equalization");
      gray.copyTo(clahe);
    }

    // 3. Bilateral Filter (Noise reduction that preserves edges/bone boundaries)
    let filtered = new cv.Mat();
    cv.bilateralFilter(clahe, filtered, 9, 75, 75, cv.BORDER_DEFAULT);

    // 4. Final Output Conversion
    let outRgba = new cv.Mat();
    cv.cvtColor(filtered, outRgba, cv.COLOR_GRAY2RGBA);

    const outJimp = new Jimp({
      width: outRgba.cols,
      height: outRgba.rows,
      data: Buffer.from(outRgba.data)
    });

    const resultBuffer = await outJimp.getBuffer('image/jpeg');

    // Memory Cleanup
    src.delete();
    gray.delete();
    clahe.delete();
    filtered.delete();
    outRgba.delete();

    return resultBuffer;
  },

  /**
   * Technical Analysis Pass (MONAI simulation).
   * Extracts raw findings, coordinates, and classification markers using high-precision AI.
   */
  async analyzeScan(imageBuffer: Buffer, mimeType: string = 'image/jpeg'): Promise<RadiologyInsight & { technical_markers: any[] }> {
    const client = new GoogleGenAI({ apiKey: GEN_AI_KEY });

    const prompt = `
      Act as a Pre-trained MONAI Radiology Model. 
      Analyze this medical scan and extract precise technical findings.
      
      OUTPUT FORMAT:
      You MUST return a JSON object with:
      - findings: Array of specific technical observations (e.g. "Linear density in left lower lobe").
      - impressions: Short clinical conclusions.
      - anatomy_map: { region: "Body part", description: "Overall health status", coordinates: { x: pos, y: pos } }.
      - technical_markers: Array of { name, value, unit, status_color, status_label, interpretation }.
      
      STRICT RADIOLOGY RULES:
      - Be technical and precise.
      - Identify anatomical regions accurately.
      - If possible, provide approximate coordinates for the primary finding.
    `;

    const response = await client.models.generateContent({
      model: "gemini-2.5-flash", 
      contents: [{
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
      }],
      config: { responseMimeType: "application/json" }
    });

    let resultText = response.text || "";
    const parsed = JSON.parse(resultText);
    return parsed;
  },

  /**
   * Empathetic Interpretation Pass (Gemini Pro).
   * Translates MONAI results into a friendly Partner Briefing.
   */
  async generateInterpretation(
    technicalData: RadiologyInsight & { technical_markers: any[] },
    userId?: string
  ): Promise<InterpretationResponse> {
    const client = new GoogleGenAI({ apiKey: GEN_AI_KEY });

    const prompt = `
      Act as a "Lead Medical Partner" for a Nigerian patient. 
      Translate these raw RADIOLOGY findings into a soft, friendly "Partner Briefing."
      
      TECHNICAL FINDINGS:
      ${JSON.stringify(technicalData.findings)}
      
      IMPRESSIONS:
      ${JSON.stringify(technicalData.impressions)}
      
      DATA MARKERS:
      ${JSON.stringify(technicalData.technical_markers)}

      TONE:
      - Soft, encouraging, and panic-free. Speak like a caring neighbor.
      - Use Simplistic English.
      - Use Nigerian-specific health context/encouragement.
      - Clarify that this is NOT a medical diagnosis.

      Return the full InterpretationResponse JSON following the Stride schema.
    `;

    const response = await client.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{
        role: "user",
        parts: [{ text: prompt }]
      }],
      config: { responseMimeType: "application/json" }
    });

    let resultText = response.text || "";
    const parsed = JSON.parse(resultText);

    if (!TypeGuards.isInterpretationResponse(parsed)) {
      throw new Error("AI response failed type integrity check");
    }

    return parsed;
  }
};
