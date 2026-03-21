import { expect, test, describe } from "bun:test";
import type { InterpretationResponse } from "../src/models/interpret";

describe("Interpretation Schema Validation", () => {
  test("Should match the UI-Ready Interface exactly", () => {
    const mockResponse: InterpretationResponse = {
      document_metadata: {
        id: "550e8400-e29b-41d4-a716-446655440000",
        type: 'LAB_RESULT',
        date: "2024-05-12T10:00:00Z",
        summary_message: "3 results slightly out of range, overall stable.",
        overall_stability: 85,
      },
      markers: [
        {
          id: "660e8400-e29b-41d4-a716-446655440011",
          name: "Glucose, Serum",
          value: 105,
          unit: "mg/dL",
          reference_range: "65-99",
          stability_score: 75,
          status_color: 'amber',
          status_label: "Slightly High",
          interpretation: "Your glucose is slightly above the reference range.",
          trend_data: [
            { date: "2024-01-01", value: 90 },
            { date: "2024-02-01", value: 95 },
            { date: "2024-03-01", value: 110 },
            { date: "2024-04-01", value: 105 }
          ],
          smart_swap_advice: {
            dietary: "Swap white bread for whole wheat.",
            lifestyle: "15 min walk after meals."
          }
        }
      ],
      ai_assistant_context: {
        primary_focus: "Carbohydrate metabolism",
        suggested_questions: ["What caused the spike?", "How to lower it?"],
        report_integrity: 98
      }
    };

    expect(mockResponse.document_metadata.id).toBeDefined();
    expect(mockResponse.markers[0].status_color).toBe('amber');
    expect(mockResponse.ai_assistant_context.suggested_questions).toHaveLength(2);
  });
});
