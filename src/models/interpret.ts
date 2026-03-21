/**
 * The core 'UI-Ready' types for continuum's medical document interpretation.
 * These interfaces are designed to map 1:1 to React component props,
 * ensuring the frontend remains focused on rendering 'Panic-Free' UI.
 */

export type DocumentType = 'LAB_RESULT' | 'PRESCRIPTION' | 'RADIOLOGY';
export type StatusColor = 'forest-green' | 'amber' | 'crimson';

export interface DocumentMetadata {
  id: string; // UUID
  type: DocumentType;
  date: string; // ISO 8601
  summary_message: string; // Concise, calming summary for the banner
  overall_stability: number; // 0-100 Integrated Stability Score
  smart_swap_advice?: string; // Nigerian-specific dietary/lifestyle swaps
}

export interface SmartSwapAdvice {
  dietary: string;   // e.g., "Swap refined carbs for ofada rice."
  lifestyle: string; // e.g., "Add 15 mins of brisk walking."
}

export interface MarkerInterpretation {
  id: string; // UUID
  name: string;
  value: number;
  unit: string;
  reference_range: string; // e.g., "70-100"
  
  // UI-Specific Pre-calculated Values
  stability_score: number; // 0-100 Used for 'Stability Meter'
  status_color: StatusColor; // Direct CSS color mapping
  status_label: string; // "Optimal", "High", "Critical"
  
  // AI Interpretation Logic
  interpretation: string; // Non-diagnostic explanation of the value
  trend_data?: TrendPoint[]; // Historical values for Trends
  
  // Smart Swap Guidance
  smart_swap_advice?: SmartSwapAdvice;
}

export interface MarkerRecord extends MarkerInterpretation {
  document_id: string;
  date?: string; // Included during joins
}


export interface TrendPoint {
  date: string;
  value: number;
}

export interface RadiologyInsight {
  findings: string[];
  impressions: string[];
  confidence?: number; // MedGemma 1.5 reliability score
  regions?: {
    label: string;
    box_2d: number[]; // [ymin, xmin, ymax, xmax] normalized to 1000
    confidence?: number;
  }[];
  anatomy_map: {
    region: string;
    description: string;
    coordinates?: { x: number; y: number }; // For visual highlight in React
  };
}


export interface AIAssistantContext {
  primary_focus: string;
  partner_note?: string; // Specialized alert for low-confidence or critical findings
  suggested_questions: string[];
  report_integrity: number; // 0-100 Scanning accuracy confidence
}

export interface InterpretationResponse {
  document_metadata: DocumentMetadata;
  markers: MarkerInterpretation[];
  radiology_insight?: RadiologyInsight;
  ai_assistant_context: AIAssistantContext;
}

