/**
 * Hook for Electron API with fallback for web version
 * Detects if running in Electron and provides safe access to APIs
 */

'use client';

import { useEffect, useState } from 'react';

interface UseElectronAPIReturn {
  isElectron: boolean;
  openFile: (options?: {
    filters?: Array<{ name: string; extensions: string[] }>;
  }) => Promise<string | null>;
  saveFile: (options?: {
    defaultPath?: string;
    filters?: Array<{ name: string; extensions: string[] }>;
  }) => Promise<string | null>;
  getVersion: () => Promise<string>;
  getBackendUrl: () => Promise<string>;
  getAppDataPath: () => Promise<string>;
  openExternal: (url: string) => Promise<void>;
}

export function useElectronAPI(): UseElectronAPIReturn {
  const [isElectron, setIsElectron] = useState(false);

  useEffect(() => {
    // Check if window.electronAPI is available
    setIsElectron(typeof window !== 'undefined' && !!window.electronAPI);
  }, []);

  return {
    isElectron,
    openFile: async (options) => {
      if (!isElectron || !window.electronAPI) {
        console.warn('Electron API not available');
        return null;
      }
      try {
        const result = await window.electronAPI.openFile(options || {});
        return result.canceled ? null : result.filePaths[0] || null;
      } catch (error) {
        console.error('Failed to open file dialog:', error);
        return null;
      }
    },
    saveFile: async (options) => {
      if (!isElectron || !window.electronAPI) {
        console.warn('Electron API not available');
        return null;
      }
      try {
        const result = await window.electronAPI.saveFile(options || {});
        return result.canceled ? null : result.filePath;
      } catch (error) {
        console.error('Failed to save file dialog:', error);
        return null;
      }
    },
    getVersion: async () => {
      if (!isElectron || !window.electronAPI) return 'web';
      try {
        return await window.electronAPI.getVersion();
      } catch (error) {
        console.error('Failed to get version:', error);
        return 'unknown';
      }
    },
    getBackendUrl: async () => {
      if (!isElectron || !window.electronAPI) {
        return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      }
      try {
        return await window.electronAPI.getBackendUrl();
      } catch (error) {
        console.error('Failed to get backend URL:', error);
        return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      }
    },
    getAppDataPath: async () => {
      if (!isElectron || !window.electronAPI) {
        return '';
      }
      try {
        return await window.electronAPI.getAppDataPath();
      } catch (error) {
        console.error('Failed to get app data path:', error);
        return '';
      }
    },
    openExternal: async (url) => {
      if (!isElectron || !window.electronAPI) {
        window.open(url, '_blank');
        return;
      }
      try {
        await window.electronAPI.openExternal(url);
      } catch (error) {
        console.error('Failed to open external URL:', error);
        window.open(url, '_blank');
      }
    },
  };
}
