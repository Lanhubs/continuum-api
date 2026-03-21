import "dotenv/config";
import sql from "../src/config/db";
import * as fs from "fs";
import * as path from "path";

async function setup() {
    console.log("Starting database setup...");
    
    try {
        const sqlPath = path.join(__dirname, "setup_database.sql");
        
        console.log(`Executing ${sqlPath}...`);
        
        // Use sql.file to execute the entire schema file
        await sql.file(sqlPath);
        
        console.log("Database tables established successfully.")
    } catch (error) {
        console.error("Database setup failed:", error);
        process.exit(1);
    } finally {
        process.exit(0);
    }
}

setup();
