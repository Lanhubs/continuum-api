import Tesseract from 'tesseract.js';
import fs from 'fs';
import path from 'path';

async function testOCR() {
  console.log("Testing Tesseract.js Performance...");
  
  // We'll try to find any image in the uploads directory or use a dummy path
  const uploadDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadDir)) {
    console.error("No uploads directory found. Please upload a file first via the chat.");
    process.exit(1);
  }

  const files = fs.readdirSync(uploadDir).filter(f => f.endsWith('.jpg') || f.endsWith('.png') || f.endsWith('.jpeg'));
  if (files.length === 0) {
    console.warn("No images found in uploads directory to test. Using a blank test.");
    return;
  }

  const targetFile = path.join(uploadDir, files[0]);
  console.log(`Processing file: ${targetFile}`);

  try {
    const { data: { text, confidence } } = await Tesseract.recognize(targetFile, 'eng', {
      logger: m => console.log(`[Tesseract] ${m.status}: ${Math.round(m.progress * 100)}%`)
    });

    console.log("\n--- OCR RESULT ---");
    console.log(`Confidence: ${confidence}%`);
    console.log("Text Output:");
    console.log(text || "[No text detected]");
    console.log("------------------\n");
    
    console.log("Tesseract integration is working successfully!");
  } catch (error) {
    console.error("Tesseract failed:", error);
  }
}

testOCR();
