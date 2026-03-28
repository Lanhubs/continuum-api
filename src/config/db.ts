import { SQL } from "bun";
import "dotenv/config";

const sql: SQL = new SQL(process.env.DB_URL!);

export default sql;
