export interface ObsidianSaveResponse {
  saved: true;
  filename: string;
  relativePath: string;
}

export type ObsidianSaveStatus = 'idle' | 'loading' | 'success' | 'error';
