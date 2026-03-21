import sql from "../config/db";
import type { MarkerRecord } from "../models/interpret";


export const MarkerRepository = {
  async createMany(markers: Omit<MarkerRecord, "id">[]): Promise<MarkerRecord[]> {
    const results = await Promise.all(
      markers.map(m => sql`
        INSERT INTO markers (document_id, name, value, unit, reference_range, stability_score, status_color, status_label, interpretation, trend_data, smart_swap_advice)
        VALUES (${m.document_id}, ${m.name}, ${m.value}, ${m.unit}, ${m.reference_range}, ${m.stability_score}, ${m.status_color}, ${m.status_label}, ${m.interpretation}, ${JSON.stringify(m.trend_data)}, ${JSON.stringify(m.smart_swap_advice)})
        RETURNING *
      `)
    );
    return results.flat() as MarkerRecord[];
  },

  async findByDocumentId(documentId: string): Promise<MarkerRecord[]> {
    const results = await sql`SELECT * FROM markers WHERE document_id = ${documentId}`;
    return results as MarkerRecord[];
  },

  async findByNameAndUserId(name: string, userId: string, limit: number = 5): Promise<MarkerRecord[]> {
    const results = await sql`
      SELECT m.* FROM markers m
      JOIN documents d ON m.document_id = d.id
      WHERE m.name = ${name} AND d.user_id = ${userId}
      ORDER BY d.date DESC
      LIMIT ${limit}
    `;
    return results as MarkerRecord[];
  },

  async findLatestByName(userId: string, markerNames: string[]): Promise<MarkerRecord[]> {
    if (markerNames.length === 0) return [];
    
    const results = await sql`
      WITH RankedMarkers AS (
        SELECT m.*, d.date,
        ROW_NUMBER() OVER(PARTITION BY m.name ORDER BY d.date DESC) as rn
        FROM markers m
        JOIN documents d ON m.document_id = d.id
        WHERE d.user_id = ${userId} AND m.name = ANY(${markerNames})
      )
      SELECT * FROM RankedMarkers WHERE rn = 1
    `;
    return results as MarkerRecord[];
  },

  async findTrends(userId: string, markerName: string, limit: number = 7): Promise<MarkerRecord[]> {
    const results = await sql`
      SELECT m.*, d.date
      FROM markers m
      JOIN documents d ON m.document_id = d.id
      WHERE d.user_id = ${userId} AND m.name = ${markerName}
      ORDER BY d.date ASC
      LIMIT ${limit}
    `;
    return results as MarkerRecord[];
  }
};


