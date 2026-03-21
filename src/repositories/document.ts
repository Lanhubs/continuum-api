import sql  from "../config/db";
import type { DocumentMetadata } from "../models/interpret";

export interface DocumentRecord extends DocumentMetadata {
  user_id: string;
  raw_image_url: string;
  enhanced_image_url?: string;
  raw_text?: string;
  smart_swap_advice?: string;
}

export const DocumentRepository = {
  async create(doc: Omit<DocumentRecord, "id">): Promise<DocumentRecord> {
    const [result] = await sql`
      INSERT INTO documents (user_id, type, date, summary_message, overall_stability, raw_image_url, enhanced_image_url, raw_text, smart_swap_advice)
      VALUES (${doc.user_id}, ${doc.type}, ${doc.date}, ${doc.summary_message}, ${doc.overall_stability}, ${doc.raw_image_url}, ${doc.enhanced_image_url}, ${doc.raw_text}, ${doc.smart_swap_advice})
      RETURNING *
    `;
    return result as DocumentRecord;
  },

  async findById(id: string): Promise<DocumentRecord | null> {
    const [result] = await sql`
      SELECT id, user_id, type, date, summary_message, overall_stability, raw_image_url, enhanced_image_url, raw_text, smart_swap_advice, created_at
      FROM documents WHERE id = ${id}
    `;
    return (result as DocumentRecord) || null;
  },

  async findByUserId(userId: string): Promise<DocumentRecord[]> {
    const results = await sql`
      SELECT id, user_id, type, date, summary_message, overall_stability, raw_image_url, enhanced_image_url, raw_text, smart_swap_advice, created_at
      FROM documents WHERE user_id = ${userId} ORDER BY date DESC
    `;
    return results as DocumentRecord[];
  },

  async findByType(userId: string, type: string): Promise<DocumentRecord[]> {
    const results = await sql`
      SELECT id, user_id, type, date, summary_message, overall_stability, raw_image_url, enhanced_image_url, raw_text, smart_swap_advice, created_at
      FROM documents WHERE user_id = ${userId} AND type = ${type} ORDER BY date DESC
    `;
    return results as DocumentRecord[];
  }
};
