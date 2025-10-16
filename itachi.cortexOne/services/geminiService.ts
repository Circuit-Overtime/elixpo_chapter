// FIX: Implement the isApiKeySet function to resolve the module error. This function checks for the presence of the API_KEY in environment variables, as required for LiveModeView.
export const isApiKeySet = (): boolean => {
    // In Electron renderer, we can't access process.env directly
    // This should be handled through IPC or build-time environment variables
    return !!(window as any).GEMINI_API_KEY || !!(import.meta.env.VITE_GEMINI_API_KEY);
};
