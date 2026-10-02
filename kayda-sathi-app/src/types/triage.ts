/**
 * Kayda Sathi — TypeScript Types
 * Mirrors the backend Pydantic schemas exactly.
 */

// ── Enums ─────────────────────────────────────────────────────────────────

export type IssueCategory =
  | 'Rental & Tenancy Dispute'
  | 'Consumer Rights Violation'
  | 'Employment & Labour Dispute'
  | 'Cyber Crime & Digital Fraud'
  | 'Family & Matrimonial Dispute'
  | 'Property & Land Dispute'
  | 'Other Civil Dispute';

export type CaseStrengthLabel =
  | 'Very Strong'
  | 'Strong'
  | 'Moderate'
  | 'Weak'
  | 'Very Weak';

export type ClauseSeverity = 'Unfair' | 'Potentially Unfair' | 'Acceptable';

// ── Sub-types ─────────────────────────────────────────────────────────────

export interface ExtractedEntities {
  complainant_name: string | null;
  opponent_name: string | null;
  amount: string | null;
  duration: string | null;
  location: string | null;
  date_of_incident: string | null;
  additional_context: string | null;
}

export interface Statute {
  act_name: string;
  section: string;
  relevance: string;
}

export interface Authority {
  forum_name: string;
  forum_type: string;
  description: string;
  jurisdiction_note: string | null;
}

export interface DocumentChecklistItem {
  name: string;
  description: string;
  weight: number;
  is_critical: boolean;
}

export interface CaseStrength {
  score: number;
  label: CaseStrengthLabel;
  explanation: string;
}

export interface ActionStep {
  step_number: number;
  title: string;
  description: string;
  timeline: string;
  escalation_level: string;
}

export interface FollowUp {
  grace_period_days: number;
  next_check_date: string;
  reminder_text: string;
}

// ── Main Triage Response ──────────────────────────────────────────────────

export interface TriageResponse {
  category: IssueCategory;
  summary: string;
  entities: ExtractedEntities;
  statutes: Statute[];
  authority: Authority;
  limitation_days: number;
  limitation_note: string;
  document_checklist: DocumentChecklistItem[];
  case_strength: CaseStrength;
  action_steps: ActionStep[];
  legal_notice: string;
  follow_up: FollowUp;
}

// ── Clause Scanner ────────────────────────────────────────────────────────

export interface FlaggedClause {
  clause_text: string;
  severity: ClauseSeverity;
  explanation: string;
  suggestion: string;
}

export interface ClauseScanResponse {
  overall_fairness_score: number;
  overall_assessment: string;
  flagged_clauses: FlaggedClause[];
  safe_clauses_count: number;
  recommendation: string;
}

// ── Request types ─────────────────────────────────────────────────────────

export interface TriageRequest {
  user_input: string;
  language?: string;
}

export interface ClauseScanRequest {
  contract_text: string;
}

// ── UI State ──────────────────────────────────────────────────────────────

export interface CheckedDocuments {
  [documentName: string]: boolean;
}

export type AppTab = 'roadmap' | 'checklist' | 'notice';
