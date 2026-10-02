"""
Kayda Sathi — Pydantic Schemas
Strict typed models for the AI triage response.
These enforce structured JSON output from Groq/LLM with zero hallucination drift.
"""

from __future__ import annotations

from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, Field


# ── Enums ────────────────────────────────────────────────────────────────────

class IssueCategory(str, Enum):
    RENTAL = "Rental & Tenancy Dispute"
    CONSUMER = "Consumer Rights Violation"
    EMPLOYMENT = "Employment & Labour Dispute"
    CYBER = "Cyber Crime & Digital Fraud"
    FAMILY = "Family & Matrimonial Dispute"
    PROPERTY = "Property & Land Dispute"
    OTHER = "Other Civil Dispute"


class CaseStrengthLabel(str, Enum):
    VERY_STRONG = "Very Strong"
    STRONG = "Strong"
    MODERATE = "Moderate"
    WEAK = "Weak"
    VERY_WEAK = "Very Weak"


class ClauseSeverity(str, Enum):
    UNFAIR = "Unfair"
    POTENTIALLY_UNFAIR = "Potentially Unfair"
    ACCEPTABLE = "Acceptable"


# ── Sub-models ───────────────────────────────────────────────────────────────

class ExtractedEntities(BaseModel):
    complainant_name: Optional[str] = Field(None, description="Name of the person filing the complaint")
    opponent_name: Optional[str] = Field(None, description="Name of the opposing party")
    amount: Optional[str] = Field(None, description="Monetary amount involved (e.g., ₹40,000)")
    duration: Optional[str] = Field(None, description="Time duration of the issue (e.g., 2 months)")
    location: Optional[str] = Field(None, description="City/state where the issue occurred")
    date_of_incident: Optional[str] = Field(None, description="When the issue started or occurred")
    additional_context: Optional[str] = Field(None, description="Any other relevant details extracted")


class Statute(BaseModel):
    act_name: str = Field(..., description="Full name of the act (e.g., Model Tenancy Act, 2021)")
    section: str = Field(..., description="Specific section number and title")
    relevance: str = Field(..., description="How this section applies to the user's situation")


class Authority(BaseModel):
    forum_name: str = Field(..., description="Name of the forum/authority (e.g., District Consumer Forum)")
    forum_type: str = Field(..., description="Type: Tribunal, Court, Authority, Ombudsman, Police, etc.")
    description: str = Field(..., description="What this authority does and how to approach them")
    jurisdiction_note: Optional[str] = Field(None, description="Location-specific jurisdiction info")


class DocumentChecklistItem(BaseModel):
    name: str = Field(..., description="Document name (e.g., Rental Agreement)")
    description: str = Field(..., description="Why this document is needed and what it proves")
    weight: int = Field(..., ge=0, le=100, description="How much this doc contributes to case strength (0-100)")
    is_critical: bool = Field(..., description="Whether the case is significantly weakened without it")


class CaseStrength(BaseModel):
    score: int = Field(..., ge=0, le=100, description="Overall case strength score assuming all documents available")
    label: CaseStrengthLabel = Field(..., description="Human-readable strength label")
    explanation: str = Field(..., description="Why the case is this strong/weak")


class ActionStep(BaseModel):
    step_number: int = Field(..., description="Step order (1, 2, 3...)")
    title: str = Field(..., description="Short title (e.g., Send Legal Demand Notice)")
    description: str = Field(..., description="Detailed explanation of what to do")
    timeline: str = Field(..., description="Expected timeline (e.g., Within 7 days)")
    escalation_level: str = Field(..., description="Level: Informal, Pre-Litigation, Formal Litigation")


class FollowUp(BaseModel):
    grace_period_days: int = Field(..., description="Days to wait after sending notice before escalating")
    next_check_date: str = Field(..., description="Suggested date to check if action was taken")
    reminder_text: str = Field(..., description="Human-readable reminder message")


# ── Main Response Model ──────────────────────────────────────────────────────

class TriageResponse(BaseModel):
    """Complete structured triage output from the AI reasoning core."""

    category: IssueCategory = Field(..., description="Classification of the legal issue")
    summary: str = Field(
        ...,
        description="Plain-language explanation of the user's rights in this situation. "
                    "Written in simple English, no jargon. 2-3 sentences."
    )
    entities: ExtractedEntities = Field(..., description="Extracted key entities from the user's input")
    statutes: List[Statute] = Field(
        ...,
        min_length=1,
        description="Relevant Indian statutes that apply to this case"
    )
    authority: Authority = Field(..., description="The most appropriate legal forum/authority to approach")
    limitation_days: int = Field(
        ...,
        description="Number of days remaining before the statute of limitations expires. "
                    "Calculate from today's date if possible, otherwise give the statutory limit."
    )
    limitation_note: str = Field(
        ...,
        description="Explanation of the limitation period (e.g., '2 years from date of cause of action under CPA 2019')"
    )
    document_checklist: List[DocumentChecklistItem] = Field(
        ...,
        min_length=1,
        description="Documents the user should gather to strengthen their case"
    )
    case_strength: CaseStrength = Field(
        ...,
        description="Assessment of how strong the case is assuming all documents are available"
    )
    action_steps: List[ActionStep] = Field(
        ...,
        min_length=1,
        description="Step-by-step action roadmap with escalation stages"
    )
    legal_notice: str = Field(
        ...,
        description="A complete, ready-to-use legal demand notice/letter. "
                    "Must include: sender details placeholder, recipient details, "
                    "facts of the case, legal basis, demand, and deadline. "
                    "Formal tone, proper legal formatting."
    )
    follow_up: FollowUp = Field(..., description="Follow-up schedule and reminder info")


# ── Clause Scanner Models ────────────────────────────────────────────────────

class FlaggedClause(BaseModel):
    clause_text: str = Field(..., description="The exact text of the problematic clause")
    severity: ClauseSeverity = Field(..., description="How problematic this clause is")
    explanation: str = Field(..., description="Why this clause is unfair and what law it violates")
    suggestion: str = Field(..., description="What a fair version of this clause would look like")


class ClauseScanResponse(BaseModel):
    """Structured output from the dark pattern / unfair clause scanner."""

    overall_fairness_score: int = Field(
        ..., ge=0, le=100,
        description="Overall fairness score of the contract (100 = perfectly fair)"
    )
    overall_assessment: str = Field(
        ...,
        description="2-3 sentence summary of the contract's fairness"
    )
    flagged_clauses: List[FlaggedClause] = Field(
        default_factory=list,
        description="List of problematic clauses found in the contract"
    )
    safe_clauses_count: int = Field(
        ...,
        description="Number of clauses that are fair and standard"
    )
    recommendation: str = Field(
        ...,
        description="Overall recommendation: whether to sign, negotiate, or reject"
    )


# ── Request Models ───────────────────────────────────────────────────────────

class TriageRequest(BaseModel):
    user_input: str = Field(..., min_length=10, description="The user's legal problem in plain language")
    language: str = Field(default="auto", description="Language hint: auto, en, hi, ta, kn, hinglish")


class ClauseScanRequest(BaseModel):
    contract_text: str = Field(..., min_length=20, description="The contract or T&C text to scan")
