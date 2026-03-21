import { SQL } from "bun";
import "dotenv/config";

const DB_URL = (process.env.DATABASE_URL || "postgres://postgres:Habeeb2001$$@localhost:5432/continuum")
  .replace("[pwd]", process.env.DB_PWD || "");

async function test() {
    console.log("Testing connection to:", DB_URL.replace(/:[^:@]+@/, ":****@")); // Mask password
    try {
        const sql = new SQL(DB_URL);
        const result = await sql`SELECT 1 as connected`;
        console.log("Result:", result);
    } catch (e) {
        console.error("Connection failed:", e);
    } finally {
        process.exit(0);
    }
}

test();
