import sql from "../src/config/db";
import { readFileSync } from "fs";
import { join } from "path";

async function runMigration() {
  try {
    console.log("Reading migration file...");
    const filePath = join(__dirname, "expand_document_types.sql");
    const query = readFileSync(filePath, "utf8");

    console.log("Executing migration...");
    await sql.file(filePath);
    
    console.log("Migration successful: Document types expanded.");
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

runMigration();
