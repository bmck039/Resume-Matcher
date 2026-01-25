/**
 * Type definitions for Electron API exposed to frontend
 * Add this to your Next.js type definitions
 */

interface OpenFileOptions {
  filters?: Array<{
    name: string;
    extensions: string[];
  }>;
}

interface OpenFileResult {
  filePaths: string[];
  canceled: boolean;
}

interface SaveFileOptions {
  defaultPath?: string;
  filters?: Array<{
    name: string;
    extensions: string[];
  }>;
}

interface SaveFileResult {
  filePath: string;
  canceled: boolean;
}

interface ElectronAPI {
  /**
   * Show open file dialog
   * @example
   * const { filePaths, canceled } = await window.electronAPI.openFile({
   *   filters: [{ name: 'Documents', extensions: ['pdf', 'docx'] }]
   * });
   */
  openFile: (options: OpenFileOptions) => Promise<OpenFileResult>;

  /**
   * Show save file dialog
   * @example
   * const { filePath, canceled } = await window.electronAPI.saveFile({
   *   defaultPath: 'resume.pdf'
   * });
   */
  saveFile: (options: SaveFileOptions) => Promise<SaveFileResult>;

  /**
   * Get application version
   * @example
   * const version = await window.electronAPI.getVersion();
   */
  getVersion: () => Promise<string>;

  /**
   * Get backend URL
   * @example
   * const backendUrl = await window.electronAPI.getBackendUrl();
   * // Returns: "http://127.0.0.1:8000"
   */
  getBackendUrl: () => Promise<string>;

  /**
   * Get app data directory path
   * @example
   * const dataPath = await window.electronAPI.getAppDataPath();
   */
  getAppDataPath: () => Promise<string>;

  /**
   * Open external URL in default browser
   * @example
   * await window.electronAPI.openExternal('https://example.com');
   */
  openExternal: (url: string) => Promise<void>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export type { ElectronAPI, OpenFileOptions, SaveFileOptions };
