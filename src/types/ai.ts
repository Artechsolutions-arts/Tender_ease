export interface TenderValidationResult {
  validationScore: number;
  riskLevel: "Low" | "Medium" | "High";
  complianceStatus: "Compliant" | "Partial" | "Non-Compliant";
  issues: Array<{ category: string; severity: "Low" | "Medium" | "High"; description: string }>;
  recommendations: string[];
  summary: string;
}

export interface BidAnalysisResult {
  overallRisk: "Low" | "Medium" | "High";
  anomalies: Array<{
    type: string;
    severity: "Low" | "Medium" | "High";
    description: string;
    recommendation: string;
  }>;
  recommendedAction: string;
  summary: string;
}

export interface ComplianceCheckResult {
  overallScore: number;
  checks: Array<{ rule: string; compliant: boolean; detail: string }>;
  criticalIssues: string[];
  recommendations: string[];
}

export interface ProcurementInsights {
  healthScore: number;
  riskIndex: "Low" | "Medium" | "High";
  confidence: number;
  savingsEstimate: number;
  keyFindings: string[];
  recommendations: Array<{ title: string; impact: string; priority: "High" | "Medium" | "Low" }>;
  anomalies: Array<{
    id: string;
    tenderId: string;
    type: string;
    severity: "Low" | "Medium" | "High";
    description: string;
    recommendation: string;
  }>;
  forecasts: Array<{ label: string; value: string; trend: string; up: boolean }>;
}
