// ============================================================
// DECISION CASCADE ENGINE
// PRD Section 3.2: Intake → Workstream Activation
// Rules-first approach (no AI dependency for MVP)
// ============================================================

import type { DealStructure, IntegrationModel, WorkstreamScope, MilestonePhase } from "./types";

export interface IntakeState {
  // Tier 1 - Gate Fields
  deal_structure: DealStructure | null;
  integration_model: IntegrationModel | null;
  target_close_date: string | null;
  cross_border: boolean;
  cross_border_jurisdictions: string[];
  tsa_required: "yes" | "no" | "tbd" | null;

  // Tier 2 - Configuration Fields
  industry_sector: string | null;
  shared_services_transfer: string[];
  deal_value_range: string | null;
  target_legal_entities: string | null;

  // Tier 3 - Enrichment Fields
  target_gaap_framework: string | null;
  target_erp_system: string | null;
  buyer_ma_maturity: string | null;
}

export interface WorkstreamActivation {
  workstream: string;
  scope: WorkstreamScope;
  itemCount: number;
  reason: string;
  crossBorderAdditions: string[];
  warnings: string[];
}

export interface CascadeResult {
  workstreams: WorkstreamActivation[];
  totalActiveItems: number;
  riskFlags: RiskFlag[];
  regulatoryFilings: RegulatoryFiling[];
  milestones: MilestoneCalc[];
  completionScore: number; // 0-100 intake completeness
  tier1Complete: boolean;
  tier2Complete: boolean;
  tier3Complete: boolean;
}

export interface RiskFlag {
  category: string;
  severity: "critical" | "high" | "medium";
  description: string;
  source: string; // which intake field triggered this
}

export interface RegulatoryFiling {
  name: string;
  jurisdiction: string;
  trigger: string;
  estimatedTimeline: string;
  required: boolean;
}

export interface MilestoneCalc {
  phase: MilestonePhase;
  label: string;
  date: string;
  daysFromClose: number;
}

// ============================================================
// PRIMARY SCOPE MATRIX
// PRD Section 3.1: Deal Structure → Workstream Scope
// ============================================================
const SCOPE_MATRIX: Record<string, Record<string, WorkstreamScope>> = {
  stock_purchase: {
    "TSA Assessment & Exit": "conditional",
    "Consolidation & Reporting": "full_scope",
    "Operational Accounting": "full_scope",
    "Internal Controls & SOX": "full_scope",
    "Income Tax & Compliance": "full_scope",
    "Treasury & Banking": "full_scope",
    "FP&A & Baselining": "full_scope",
    "Cybersecurity & Data Privacy": "full_scope",
    "ESG & Sustainability": "full_scope",
    "Integration Budget & PMO": "full_scope",
    "Facilities & Real Estate": "conditional",
  },
  asset_purchase: {
    "TSA Assessment & Exit": "conditional",
    "Consolidation & Reporting": "partial",
    "Operational Accounting": "review_only",
    "Internal Controls & SOX": "reduced",
    "Income Tax & Compliance": "full_scope",
    "Treasury & Banking": "partial",
    "FP&A & Baselining": "full_scope",
    "Cybersecurity & Data Privacy": "full_scope",
    "ESG & Sustainability": "partial",
    "Integration Budget & PMO": "full_scope",
    "Facilities & Real Estate": "conditional",
  },
  merger_forward_triangular: {
    "TSA Assessment & Exit": "conditional",
    "Consolidation & Reporting": "full_scope",
    "Operational Accounting": "full_scope",
    "Internal Controls & SOX": "full_scope",
    "Income Tax & Compliance": "full_scope",
    "Treasury & Banking": "full_scope",
    "FP&A & Baselining": "full_scope",
    "Cybersecurity & Data Privacy": "full_scope",
    "ESG & Sustainability": "full_scope",
    "Integration Budget & PMO": "full_scope",
    "Facilities & Real Estate": "conditional",
  },
  merger_reverse_triangular: {
    "TSA Assessment & Exit": "conditional",
    "Consolidation & Reporting": "full_scope",
    "Operational Accounting": "full_scope",
    "Internal Controls & SOX": "full_scope",
    "Income Tax & Compliance": "full_scope",
    "Treasury & Banking": "full_scope",
    "FP&A & Baselining": "full_scope",
    "Cybersecurity & Data Privacy": "full_scope",
    "ESG & Sustainability": "full_scope",
    "Integration Budget & PMO": "full_scope",
    "Facilities & Real Estate": "conditional",
  },
  merger_direct: {
    "TSA Assessment & Exit": "minimal",
    "Consolidation & Reporting": "full_scope",
    "Operational Accounting": "full_scope",
    "Internal Controls & SOX": "full_scope",
    "Income Tax & Compliance": "full_scope",
    "Treasury & Banking": "full_scope",
    "FP&A & Baselining": "full_scope",
    "Cybersecurity & Data Privacy": "full_scope",
    "ESG & Sustainability": "full_scope",
    "Integration Budget & PMO": "full_scope",
    "Facilities & Real Estate": "conditional",
  },
  f_reorganization: {
    "TSA Assessment & Exit": "conditional",
    "Consolidation & Reporting": "full_scope",
    "Operational Accounting": "full_scope",
    "Internal Controls & SOX": "full_scope",
    "Income Tax & Compliance": "full_scope",
    "Treasury & Banking": "full_scope",
    "FP&A & Baselining": "full_scope",
    "Cybersecurity & Data Privacy": "full_scope",
    "ESG & Sustainability": "partial",
    "Integration Budget & PMO": "full_scope",
    "Facilities & Real Estate": "conditional",
  },
  carve_out_divestiture: {
    "TSA Assessment & Exit": "full_scope",
    "Consolidation & Reporting": "full_scope",
    "Operational Accounting": "full_scope",
    "Internal Controls & SOX": "full_scope",
    "Income Tax & Compliance": "full_scope",
    "Treasury & Banking": "full_scope",
    "FP&A & Baselining": "full_scope",
    "Cybersecurity & Data Privacy": "full_scope",
    "ESG & Sustainability": "review_only",
    "Integration Budget & PMO": "full_scope",
    "Facilities & Real Estate": "review_only",
  },
};

// Base item counts per workstream
const BASE_ITEMS: Record<string, number> = {
  "TSA Assessment & Exit": 70,
  "Consolidation & Reporting": 52,
  "Operational Accounting": 68,
  "Internal Controls & SOX": 44,
  "Income Tax & Compliance": 38,
  "Treasury & Banking": 32,
  "FP&A & Baselining": 28,
  "Cybersecurity & Data Privacy": 36,
  "ESG & Sustainability": 22,
  "Integration Budget & PMO": 35,
  "Facilities & Real Estate": 18,
};

// Scope reduction multipliers
const SCOPE_MULTIPLIERS: Record<WorkstreamScope, number> = {
  full_scope: 1.0,
  partial: 0.6,
  reduced: 0.4,
  review_only: 0.25,
  conditional: 0.5,
  minimal: 0.15,
  not_applicable: 0,
};

// Cross-border additions per jurisdiction type
const CB_ADDITIONS: Record<string, string[]> = {
  EU: [
    "GDPR DPIA for EU data processing",
    "EUMR filing assessment",
    "EU AI Act compliance review",
    "TUPE / works council consultation",
    "EU CSRD reporting assessment",
    "Standard Contractual Clauses review",
    "Pillar Two ETR analysis",
    "VAT recovery assessment",
  ],
  UK: [
    "UK NSI Act filing assessment",
    "UK GDPR compliance review",
    "UK data transfer mechanisms",
    "TUPE consultation (UK)",
    "UK statutory reporting requirements",
  ],
  US: [
    "HSR Act filing assessment",
    "CFIUS filing assessment",
    "State-level regulatory requirements",
    "FCPA compliance review",
  ],
  APAC: [
    "Local antitrust filing requirements",
    "Data localization compliance",
    "Foreign investment review",
    "Local statutory reporting",
  ],
  LatAm: [
    "Local antitrust notification",
    "FX control compliance",
    "Local labor law compliance",
    "Transfer pricing documentation",
  ],
};

// ============================================================
// MAIN CASCADE FUNCTION
// ============================================================
export function runDecisionCascade(intake: IntakeState): CascadeResult {
  const workstreams: WorkstreamActivation[] = [];
  const riskFlags: RiskFlag[] = [];
  const regulatoryFilings: RegulatoryFiling[] = [];

  // ── STEP 1: Base scope from deal structure ──
  const structureScopes = intake.deal_structure
    ? SCOPE_MATRIX[intake.deal_structure] || {}
    : {};

  for (const [ws, baseItems] of Object.entries(BASE_ITEMS)) {
    let scope: WorkstreamScope = structureScopes[ws] || "full_scope";
    const reasons: string[] = [];
    const cbAdditions: string[] = [];
    const warnings: string[] = [];

    if (intake.deal_structure) {
      reasons.push(`Base scope from ${intake.deal_structure.replace(/_/g, " ")}: ${scope.replace(/_/g, " ")}`);
    }

    // ── STEP 2: Integration model adjustments ──
    if (intake.integration_model === "standalone_platform") {
      if (ws === "Consolidation & Reporting" && scope === "full_scope") {
        scope = "reduced";
        reasons.push("Standalone model: reduced consolidation (no system migration)");
      }
      if (ws === "Internal Controls & SOX" && scope === "full_scope") {
        scope = "reduced";
        reasons.push("Standalone model: maintain existing controls only");
      }
    }

    // ── STEP 3: TSA override ──
    if (ws === "TSA Assessment & Exit") {
      if (intake.tsa_required === "yes") {
        scope = "full_scope";
        reasons.push("TSA required: full workstream activated");
      } else if (intake.tsa_required === "no") {
        scope = "not_applicable";
        reasons.push("TSA not required: workstream deactivated");
      } else if (intake.tsa_required === "tbd") {
        scope = "conditional";
        reasons.push("TSA TBD: conditional scope pending determination");
        warnings.push("TSA determination pending — early assessment recommended");
        riskFlags.push({
          category: "TSA Dependency",
          severity: "high",
          description: "TSA requirement not yet determined. Early assessment critical to avoid scope gaps.",
          source: "tsa_required = TBD",
        });
      }
    }

    // Carve-out always full TSA
    if (intake.deal_structure === "carve_out_divestiture" && ws === "TSA Assessment & Exit") {
      scope = "full_scope";
      reasons.push("Carve-out structure: full TSA workstream mandatory");
    }

    // ── STEP 4: Cross-border overlay ──
    if (intake.cross_border && intake.cross_border_jurisdictions.length > 0) {
      for (const jurisdiction of intake.cross_border_jurisdictions) {
        const region = jurisdiction.startsWith("EU") ? "EU" :
                       jurisdiction === "UK" ? "UK" :
                       jurisdiction === "US" ? "US" :
                       jurisdiction.startsWith("APAC") ? "APAC" :
                       jurisdiction.startsWith("LatAm") ? "LatAm" : null;
        if (region && CB_ADDITIONS[region]) {
          const relevantAdditions = CB_ADDITIONS[region].filter((a) => {
            if (ws === "Cybersecurity & Data Privacy") return a.includes("GDPR") || a.includes("data") || a.includes("AI Act");
            if (ws === "Income Tax & Compliance") return a.includes("filing") || a.includes("Pillar") || a.includes("VAT") || a.includes("CFIUS") || a.includes("HSR") || a.includes("transfer pricing");
            if (ws === "ESG & Sustainability") return a.includes("CSRD") || a.includes("environmental");
            if (ws === "Operational Accounting") return a.includes("labor") || a.includes("payroll") || a.includes("TUPE");
            if (ws === "Internal Controls & SOX") return a.includes("statutory");
            return false;
          });
          cbAdditions.push(...relevantAdditions);
        }
      }
      if (cbAdditions.length > 0) {
        reasons.push(`Cross-border: ${cbAdditions.length} additional items from ${intake.cross_border_jurisdictions.join(", ")}`);
      }
    }

    // ── STEP 5: Entity count adjustments ──
    if (intake.target_legal_entities) {
      const entities = intake.target_legal_entities;
      if (ws === "Consolidation & Reporting" && (entities === "6–20" || entities === "20+")) {
        if (scope !== "full_scope") {
          scope = "full_scope";
          reasons.push(`${entities} entities: full consolidation workstream required`);
        }
      }
    }

    // ── STEP 6: GAAP mismatch detection ──
    if (intake.target_gaap_framework && intake.target_gaap_framework !== "US GAAP") {
      if (ws === "Consolidation & Reporting") {
        cbAdditions.push("GAAP conversion journal entries");
        cbAdditions.push("Multi-GAAP reporting reconciliation");
        reasons.push(`GAAP mismatch (${intake.target_gaap_framework} → US GAAP): additional conversion tasks`);
        if (intake.target_legal_entities === "20+" || intake.target_legal_entities === "6–20") {
          riskFlags.push({
            category: "Financial Reporting Gap",
            severity: "high",
            description: `${intake.target_gaap_framework} to US GAAP conversion across ${intake.target_legal_entities} entities creates significant reporting risk.`,
            source: "GAAP mismatch + entity count",
          });
        }
      }
    }

    // Calculate active items
    const multiplier = SCOPE_MULTIPLIERS[scope];
    const activeItems = Math.round(baseItems * multiplier) + cbAdditions.length;

    workstreams.push({
      workstream: ws,
      scope,
      itemCount: activeItems,
      reason: reasons.join("; ") || "Default scope",
      crossBorderAdditions: cbAdditions,
      warnings,
    });
  }

  // ── RISK FLAG GENERATION ──

  // Regulatory delay risk
  if (intake.cross_border && intake.cross_border_jurisdictions.length >= 3) {
    riskFlags.push({
      category: "Regulatory Delay",
      severity: "critical",
      description: `${intake.cross_border_jurisdictions.length} jurisdictions require regulatory approval. Multi-jurisdiction deals average 4-6 months for clearance.`,
      source: "cross_border_jurisdictions ≥ 3",
    });
  }

  // Deal value regulatory triggers
  if (intake.deal_value_range === "$1B–$5B" || intake.deal_value_range === ">$5B") {
    regulatoryFilings.push({
      name: "HSR Act Filing",
      jurisdiction: "US",
      trigger: `Deal value ${intake.deal_value_range} exceeds $119.5M threshold`,
      estimatedTimeline: "30-day waiting period (extendable)",
      required: true,
    });
  }

  if (intake.cross_border && intake.cross_border_jurisdictions.some(j => j.startsWith("EU"))) {
    if (intake.deal_value_range === "$1B–$5B" || intake.deal_value_range === ">$5B") {
      regulatoryFilings.push({
        name: "EU Merger Regulation Filing",
        jurisdiction: "EU",
        trigger: "Combined worldwide turnover likely exceeds EUR 5B threshold",
        estimatedTimeline: "25 working days Phase I (extendable to Phase II)",
        required: true,
      });
    }
  }

  if (intake.industry_sector === "Defense / Aerospace" || intake.industry_sector === "Technology") {
    if (intake.cross_border && intake.cross_border_jurisdictions.includes("US")) {
      regulatoryFilings.push({
        name: "CFIUS Review",
        jurisdiction: "US",
        trigger: `${intake.industry_sector} sector with cross-border element triggers CFIUS assessment`,
        estimatedTimeline: "45-day initial review + 45-day investigation (if extended)",
        required: intake.industry_sector === "Defense / Aerospace",
      });
    }
  }

  if (intake.cross_border && intake.cross_border_jurisdictions.some(j => j === "UK")) {
    regulatoryFilings.push({
      name: "UK NSI Act Notification",
      jurisdiction: "UK",
      trigger: "Acquisition in potentially sensitive sector with UK target",
      estimatedTimeline: "30 working days initial assessment",
      required: intake.industry_sector === "Defense / Aerospace",
    });
  }

  // Day 1 readiness risk based on close date
  if (intake.target_close_date) {
    const daysToClose = Math.ceil((new Date(intake.target_close_date).getTime() - Date.now()) / 86400000);
    if (daysToClose < 60) {
      riskFlags.push({
        category: "Day 1 Readiness",
        severity: daysToClose < 30 ? "critical" : "high",
        description: `${daysToClose} days to close. Accelerated workstream activation required for Day 1 critical items.`,
        source: `target_close_date (${daysToClose} days)`,
      });
    }
  }

  // Tax structure risk for complex structures
  if (intake.deal_structure === "f_reorganization" || intake.deal_structure === "carve_out_divestiture") {
    riskFlags.push({
      category: "Tax Structure Leakage",
      severity: "high",
      description: `${intake.deal_structure.replace(/_/g, " ")} structures require detailed tax modeling to avoid unintended consequences.`,
      source: `deal_structure = ${intake.deal_structure}`,
    });
  }

  // Cross-border tax risk
  if (intake.cross_border && intake.cross_border_jurisdictions.length >= 2) {
    riskFlags.push({
      category: "Tax Structure Leakage",
      severity: "medium",
      description: "Multi-jurisdiction structure requires Pillar Two analysis, transfer pricing review, and WHT optimization.",
      source: "cross_border with 2+ jurisdictions",
    });
  }

  // ── MILESTONE CALCULATION ──
  const milestones: MilestoneCalc[] = [];
  if (intake.target_close_date) {
    const close = new Date(intake.target_close_date);
    const offsets: [MilestonePhase, string, number][] = [
      ["pre_close", "Pre-Close Preparation", -14],
      ["day_1", "Day 1 / Close", 0],
      ["day_30", "Day 30 Checkpoint", 30],
      ["day_60", "Day 60 Review", 60],
      ["day_90", "Day 90 SteerCo", 90],
      ["day_180", "Day 180 Assessment", 180],
      ["year_1", "Year 1 Close-Out", 365],
    ];
    for (const [phase, label, days] of offsets) {
      const d = new Date(close);
      d.setDate(d.getDate() + days);
      milestones.push({ phase, label, date: d.toISOString().split("T")[0], daysFromClose: days });
    }
  }

  // ── COMPLETION SCORE ──
  let filledFields = 0;
  const totalFields = 12;
  if (intake.deal_structure) filledFields++;
  if (intake.integration_model) filledFields++;
  if (intake.target_close_date) filledFields++;
  if (intake.cross_border !== null) filledFields++;
  if (intake.tsa_required) filledFields++;
  if (intake.industry_sector) filledFields++;
  if (intake.shared_services_transfer.length > 0) filledFields++;
  if (intake.deal_value_range) filledFields++;
  if (intake.target_legal_entities) filledFields++;
  if (intake.target_gaap_framework) filledFields++;
  if (intake.target_erp_system) filledFields++;
  if (intake.buyer_ma_maturity) filledFields++;

  const tier1Complete = !!(intake.deal_structure && intake.integration_model && intake.target_close_date && intake.tsa_required);
  const tier2Complete = tier1Complete && !!(intake.industry_sector && intake.deal_value_range && intake.target_legal_entities);
  const tier3Complete = tier2Complete && !!(intake.target_gaap_framework && intake.target_erp_system && intake.buyer_ma_maturity);

  const totalActiveItems = workstreams.reduce((sum, ws) => sum + ws.itemCount, 0);

  return {
    workstreams,
    totalActiveItems,
    riskFlags,
    regulatoryFilings,
    milestones,
    completionScore: Math.round((filledFields / totalFields) * 100),
    tier1Complete,
    tier2Complete,
    tier3Complete,
  };
}
