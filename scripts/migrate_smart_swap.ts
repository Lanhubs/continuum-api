import sql from "../src/config/db";
import * as path from "path";

async function runMigration() {
    console.log(" Running smart_swap_advice migration...");
    try {
        const sqlPath = path.join(__dirname, "add_smart_swap_column.sql");
        await sql.file(sqlPath);
        console.log(" Column added successfully (or already existed).");
    } catch (error) {
        console.error("Migration failed:", error);
    } finally {
        process.exit();
    }
}

runMigration();
