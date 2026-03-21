import type { RadiologyInsight } from "../models/interpret";
import { cv } from "opencv-wasm";
import { Jimp } from "jimp";

const MEDGEMMA_API_URL = process.env.MEDGEMMA_API_URL || "https://api.medgemma.ai/v1/interpret"; 
const MEDGEMMA_API_KEY = process.env.MEDGEMMA_API_KEY || "";

export const MedGemmaService = {
  async initOpenCV() {
    return new Promise((resolve) => {
      if ((cv as any).Mat) {
        resolve(true);
      } else {
        (cv as any).onRuntimeInitialized = () => resolve(true);
      }
    });
  },

  async preprocess(imageBuffer: Buffer): Promise<Buffer> {
    await this.initOpenCV();

    const jimpImage = await Jimp.read(imageBuffer);
    const src = cv.matFromImageData(jimpImage.bitmap);
    let gray = new cv.Mat();
    
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

    let clahe = new cv.Mat();
    try {
      cv.equalizeHist(gray, clahe);
    } catch (e) {
      gray.copyTo(clahe);
    }

    let filtered = new cv.Mat();
    cv.bilateralFilter(clahe, filtered, 9, 75, 75, cv.BORDER_DEFAULT);

    let outRgba = new cv.Mat();
    cv.cvtColor(filtered, outRgba, cv.COLOR_GRAY2RGBA);

    const outJimp = new Jimp({
      width: outRgba.cols,
      height: outRgba.rows,
      data: Buffer.from(outRgba.data)
    });

    const resultBuffer = await outJimp.getBuffer('image/jpeg');

    src.delete();
    gray.delete();
    clahe.delete();
    filtered.delete();
    outRgba.delete();

    return resultBuffer;
  },

  async analyzeScan(imageBuffer: Buffer, mimeType: string = 'image/jpeg'): Promise<RadiologyInsight> {
    const systemInstruction = `
      You are a specialized Radiologist Assistant. 
      Analyze the provided image. Only report findings visible in the scan. 
      If no abnormalities are found, state 'No significant findings.' 
      Do not speculate on patient history not provided. 
      Return results in a structured JSON: { findings: string[], confidence: number, regions: {label: string, box_2d: number[]}[] }.
    `.trim();

    try {
      const mockResult: RadiologyInsight = {
        findings: ["No significant findings."],
        confidence: 0.92,
        impressions: ["Normal study."], 
        regions: [
          {
            label: "Left Lung",
            box_2d: [200, 150, 800, 450],
            confidence: 0.95
          },
          {
            label: "Right Lung",
            box_2d: [200, 550, 800, 850],
            confidence: 0.94
          }
        ],
        anatomy_map: {
          region: "Chest",
          description: "Clear and healthy lungs",
          coordinates: { x: 500, y: 500 }
        }
      };

      return mockResult;
    } catch (error) {
      console.error("[MedGemma Error]:", error);
      throw new Error("MedGemma inference failed");
    }
  }
};
