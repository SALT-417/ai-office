import type { ReviewStatus } from './history';

export type ProjectFileCategory = 'frontend' | 'server' | 'test' | 'config' | 'documentation';
export type AnalysisSpecialist = 'sou' | 'aki';
export type AnalysisSeverity = 'low' | 'medium' | 'high';
export type AnalysisRequestStatus = 'idle' | 'loading' | 'success' | 'error';
export interface ProjectFileInfo { path: string; category: ProjectFileCategory; size: number }
export interface AnalysisEvidence { path: string; line?: number; description: string }
export interface AnalysisFinding { title: string; severity: AnalysisSeverity; evidence: AnalysisEvidence[]; recommendation: string; completionCriteria: string[]; verification: string[] }
export interface AnalysisResponse { specialist: AnalysisSpecialist; specialistName: 'ソウ' | 'アキ'; objective: string; analyzedFiles: string[]; redacted: boolean; summary: string; findings: AnalysisFinding[] }
export interface AnalysisHistoryEntry extends AnalysisResponse { id: string; createdAt: string; updatedAt: string; reviewStatus: ReviewStatus; reviewNote: string }
export interface AnalysisHistoryStore { version: 1; entries: AnalysisHistoryEntry[] }
