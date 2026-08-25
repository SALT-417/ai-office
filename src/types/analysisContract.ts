export const ANALYSIS_LIMITS = {
  summary: 2_000,
  findings: 5,
  title: 160,
  evidence: 8,
  path: 300,
  description: 800,
  recommendation: 2_000,
  listItems: 8,
  listItem: 500,
} as const;

export const ANALYSIS_QUALITY_LIMITS = {
  summaryMinimum: 18,
  titleMinimum: 8,
  descriptionMinimum: 16,
  recommendationMinimum: 20,
  criteriaMinimum: 12,
  verificationMinimum: 12,
  relatedThemeMinimum: 2,
  duplicateSimilarityMaximum: 0.88,
} as const;
