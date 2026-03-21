import type { 
  InterpretationResponse, 
  DocumentMetadata, 
  MarkerInterpretation, 
  RadiologyInsight, 
  SmartSwapAdvice, 
  AIAssistantContext 
} from "../models/interpret";

export const TypeGuards = {
  isInterpretationResponse(obj: any): obj is InterpretationResponse {
    return (
      obj &&
      typeof obj === 'object' &&
      this.isDocumentMetadata(obj.document_metadata) &&
      Array.isArray(obj.markers) &&
      obj.markers.every((m: any) => this.isMarkerInterpretation(m)) &&
      this.isAIAssistantContext(obj.ai_assistant_context) &&
      (obj.radiology_insight === undefined || this.isRadiologyInsight(obj.radiology_insight))
    );
  },

  isDocumentMetadata(obj: any): obj is DocumentMetadata {
    return (
      obj &&
      typeof obj === 'object' &&
      typeof obj.type === 'string' &&
      typeof obj.date === 'string' &&
      typeof obj.summary_message === 'string' &&
      typeof obj.overall_stability === 'number'
    );
  },

  isMarkerInterpretation(obj: any): obj is MarkerInterpretation {
    return (
      obj &&
      typeof obj === 'object' &&
      typeof obj.name === 'string' &&
      typeof obj.value === 'number' &&
      typeof obj.unit === 'string' &&
      typeof obj.stability_score === 'number' &&
      ['forest-green', 'amber', 'crimson'].includes(obj.status_color)
    );
  },

  isRadiologyInsight(obj: any): obj is RadiologyInsight {
    return (
      obj &&
      typeof obj === 'object' &&
      Array.isArray(obj.findings) &&
      Array.isArray(obj.impressions) &&
      typeof obj.anatomy_map === 'object'
    );
  },

  isAIAssistantContext(obj: any): obj is AIAssistantContext {
    return (
      obj &&
      typeof obj === 'object' &&
      typeof obj.primary_focus === 'string' &&
      Array.isArray(obj.suggested_questions)
    );
  }
};
