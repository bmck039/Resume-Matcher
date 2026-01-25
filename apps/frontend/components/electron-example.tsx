/**
 * Example: How to use the Electron API in your components
 * This demonstrates file upload and save functionality
 */

'use client';

import { useElectronAPI } from '@/hooks/use-electron-api';

export function ElectronFileHandlerExample() {
  const { isElectron, openFile, saveFile, openExternal } = useElectronAPI();

  const handleResumeUpload = async () => {
    const filePath = await openFile({
      filters: [
        { name: 'Documents', extensions: ['pdf', 'docx'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    });

    if (filePath) {
      console.log('Selected file:', filePath);
      // Read file and upload to backend
      // const fileContent = await readFile(filePath);
      // await uploadResume(fileContent);
    }
  };

  const handleExportPDF = async () => {
    const savePath = await saveFile({
      defaultPath: 'my-resume.pdf',
      filters: [{ name: 'PDF', extensions: ['pdf'] }],
    });

    if (savePath) {
      console.log('Save to:', savePath);
      // Export PDF to the selected path
      // await exportPDF(savePath);
    }
  };

  const handleOpenLink = async (url: string) => {
    await openExternal(url);
  };

  return (
    <div className="p-4 border rounded">
      <h2 className="text-lg font-bold mb-4">
        {isElectron ? '🖥️ Desktop App' : '🌐 Web Version'}
      </h2>

      <div className="space-y-2">
        <button
          onClick={handleResumeUpload}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Upload Resume
        </button>

        <button
          onClick={handleExportPDF}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
        >
          Export as PDF
        </button>

        <button
          onClick={() => handleOpenLink('https://resumematcher.fyi')}
          className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
        >
          Open External Link
        </button>
      </div>

      {isElectron && (
        <p className="mt-4 text-sm text-gray-600">
          ✓ Native file dialogs are enabled
        </p>
      )}
    </div>
  );
}
