import type { Context } from "hono";
import { DocumentRepository } from "../repositories/document";
import { MarkerRepository } from "../repositories/marker";
import type { TrendPoint } from "../models/interpret";

export const HistoryController = {
  /**
   * GET /api/history
   * Lists document history for a user with integrated markers.
   */
  async getHistory(c: Context) {
    const userId = c.get("userId");
    
    try {
      const documents = await DocumentRepository.findByUserId(userId);
      
      const historyWithMarkers = await Promise.all(
        documents.map(async (doc) => {
          const markers = await MarkerRepository.findByDocumentId(doc.id);
          return {
            ...doc,
            markers
          };
        })
      );

      return c.json(historyWithMarkers);
    } catch (error) {
      console.error("History Fetch Error:", error);
      return c.json({ error: "Failed to fetch medical history" }, 500);
    }
  },

  /**
   * GET /api/trends/:markerName
   * Returns historical trend points for a specific marker.
   */
  async getTrends(c: Context) {
    const userId = c.get("userId");

    const markerName = c.req.param('markerName');

    if (!markerName) {
      return c.json({ error: "Missing marker name" }, 400);
    }

    try {
      const records = await MarkerRepository.findTrends(userId, markerName);
      const trends: TrendPoint[] = records.map(r => ({
        date: r.date || "",
        value: r.value
      }));

      return c.json({
        marker_name: markerName,
        trends
      });
    } catch (error) {
      console.error("Trends Fetch Error:", error);
      return c.json({ error: "Failed to fetch trend data" }, 500);
    }
  },

  /**
   * GET /api/prescriptions
   * Lists only prescription history for the user.
   */
  async getPrescriptions(c: Context) {
    const userId = c.get("userId");
    try {
      const prescriptions = await DocumentRepository.findByType(userId, "PRESCRIPTION");
      return c.json(prescriptions);
    } catch (error) {
      console.error("Prescriptions Fetch Error:", error);
      return c.json({ error: "Failed to fetch prescriptions" }, 500);
    }
  }
};
