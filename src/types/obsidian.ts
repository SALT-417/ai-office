export interface ObsidianSaveResponse {
  saved: true;
  filename: string;
  relativePath: string;
  dailyNote:
    | { appended: true; relativePath: string }
    | { appended: false; reason: 'not-requested' | 'disabled' | 'failed' };
}

export type ObsidianSaveStatus = 'idle' | 'loading' | 'success' | 'error';

export type ObsidianEntryType = 'work' | 'analysis';

export interface ObsidianDailyNoteRequest {
  enabled: boolean;
  title: string;
  summary: string;
  employees: string[];
}

export interface ObsidianStatusResponse {
  available: boolean;
  vaultSaveEnabled: boolean;
  exportSubdir: string;
  dailyNotesEnabled: boolean;
  dailyNotesSubdir: string;
  message: string;
}

export type ObsidianStatusRequestState = 'idle' | 'loading' | 'success' | 'error';
