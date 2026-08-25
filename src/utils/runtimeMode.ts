export type AppRuntimeMode = 'local-ai' | 'public-demo';

export function resolveAppRuntimeMode(value: unknown): AppRuntimeMode {
  return value === 'local-ai' || value === 'public-demo' ? value : 'public-demo';
}

export const appRuntimeMode = resolveAppRuntimeMode(import.meta.env.VITE_APP_RUNTIME_MODE);

