"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { MadeWithDyad } from "@/components/made-with-dyad";
import FileDropzone from '@/components/FileDropzone';
import RenamingRules, { SearchPosition } from '@/components/RenamingRules';
import FilePreviewList from '@/components/FilePreviewList';
import { Button } from '@/components/ui/button';
import { Download, RefreshCw, Trash2, Save, Loader2, Minus, Maximize2, X, Settings, Clock, SplitSquareHorizontal } from 'lucide-react';
import { extractTextFromFile } from '@/utils/file-extractor';
import { showSuccess, showError } from '@/utils/toast';

interface ProcessedFile {
  id: string;
  originalFile: File;
  fileHandle?: any; // For File System Access API
  content: string;
  newName: string;
  status: 'pending' | 'processing' | 'ready' | 'error' | 'renamed';
  baseGroupName: string;
}

const Index = () => {
  const [activeTab, setActiveTab] = useState<'split' | 'history' | 'settings'>('split');
  const [files, setFiles] = useState<ProcessedFile[]>([]);
  const [directoryHandle, setDirectoryHandle] = useState<any>(null);
  const [isRenaming, setIsRenaming] = useState(false);

  const [anchorText, setAnchorText] = useState('');
  const [position, setPosition] = useState<SearchPosition>('after');
  const [prefix, setPrefix] = useState('');
  const [suffix, setSuffix] = useState('');
  const [searchPattern, setSearchPattern] = useState('');

  const processFiles = async (newFiles: { file: File, handle?: any }[]) => {
    const processed = newFiles.map(item => {
      const f = item.file;
      const baseName = f.name.substring(0, f.name.lastIndexOf('.')) || f.name;
      return {
        id: Math.random().toString(36).substr(2, 9),
        originalFile: f,
        fileHandle: item.handle,
        content: '',
        newName: f.name,
        status: 'pending' as const,
        baseGroupName: baseName
      };
    });

    setFiles(prev => [...prev, ...processed]);

    for (const fileObj of processed) {
      setFiles(prev => prev.map(f => f.id === fileObj.id ? { ...f, status: 'processing' } : f));

      try {
        const content = await extractTextFromFile(fileObj.originalFile);
        setFiles(prev => prev.map(f => f.id === fileObj.id ? {
          ...f,
          content,
          status: 'ready'
        } : f));
      } catch (err) {
        setFiles(prev => prev.map(f => f.id === fileObj.id ? { ...f, status: 'error' } : f));
      }
    }
  };

  const handleFilesSelected = (selectedFiles: File[]) => {
    processFiles(selectedFiles.map(f => ({ file: f })));
  };

  const handleDirectorySelected = async (handle: any) => {
    setDirectoryHandle(handle);
    const fileEntries: { file: File, handle: any }[] = [];

    // @ts-ignore
    for await (const entry of handle.values()) {
      if (entry.kind === 'file') {
        const file = await entry.getFile();
        // Only process supported extensions
        const ext = file.name.split('.').pop()?.toLowerCase();
        if (['pdf', 'docx', 'xlsx', 'xls', 'csv', 'txt', 'xml'].includes(ext || '')) {
          fileEntries.push({ file, handle: entry });
        }
      }
    }

    processFiles(fileEntries);
  };

  const updateNewNames = useCallback(() => {
    const groups = new Map<string, ProcessedFile[]>();
    files.forEach(f => {
      if (f.status === 'renamed') return;
      const group = groups.get(f.baseGroupName) || [];
      group.push(f);
      groups.set(f.baseGroupName, group);
    });

    const groupDiscoveredNames = new Map<string, string>();

    groups.forEach((groupFiles, baseGroupName) => {
      let discoveredName = '';

      if (anchorText) {
        for (const f of groupFiles) {
          if (!f.content) continue;

          const lines = f.content.split('\n').map(l => l.trim()).filter(l => l.length > 0);
          const escapedAnchor = anchorText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

          if (position === 'after') {
            const regex = new RegExp(`${escapedAnchor}\\s*[:=-]?\\s*(\\S+)`, 'i');
            const match = f.content.match(regex);
            if (match && match[1]) discoveredName = match[1];
          }
          else if (position === 'before') {
            const regex = new RegExp(`(\\S+)\\s*${escapedAnchor}`, 'i');
            const match = f.content.match(regex);
            if (match && match[1]) discoveredName = match[1];
          }
          else if (position === 'above' || position === 'below') {
            const anchorIdx = lines.findIndex(line =>
              new RegExp(escapedAnchor, 'i').test(line)
            );

            if (anchorIdx !== -1) {
              const targetIdx = position === 'above' ? anchorIdx - 1 : anchorIdx + 1;
              if (targetIdx >= 0 && targetIdx < lines.length) {
                const words = lines[targetIdx].trim().split(/\s+/);
                if (words.length > 0) discoveredName = words[0];
              }
            }
          }

          if (discoveredName) {
            discoveredName = discoveredName.trim().replace(/[/\\?%*:|"<>]/g, '-');
            break;
          }
        }
      }

      if (!discoveredName && searchPattern) {
        for (const f of groupFiles) {
          if (f.content) {
            try {
              const regex = new RegExp(searchPattern, 'i');
              const match = f.content.match(regex);
              if (match) {
                discoveredName = (match[1] || match[0]).trim().replace(/[/\\?%*:|"<>]/g, '-');
                break;
              }
            } catch (e) { }
          }
        }
      }

      if (discoveredName) {
        groupDiscoveredNames.set(baseGroupName, discoveredName);
      }
    });

    setFiles(prev => prev.map(file => {
      if (file.status === 'renamed') return file;
      const extension = file.originalFile.name.split('.').pop() || '';
      const discoveredBase = groupDiscoveredNames.get(file.baseGroupName) || file.baseGroupName;
      const finalName = `${prefix}${discoveredBase}${suffix}.${extension}`;
      return { ...file, newName: finalName };
    }));
  }, [anchorText, position, prefix, suffix, searchPattern, files.length]);

  useEffect(() => {
    updateNewNames();
  }, [anchorText, position, prefix, suffix, searchPattern]);

  const handleRenameInPlace = async () => {
    if (files.length === 0) return;
    setIsRenaming(true);
    let successCount = 0;

    try {
      for (const file of files) {
        if (file.fileHandle && file.newName !== file.originalFile.name) {
          try {
            // @ts-ignore - File System Access API move method
            await file.fileHandle.move(file.newName);
            setFiles(prev => prev.map(f => f.id === file.id ? { ...f, status: 'renamed' } : f));
            successCount++;
          } catch (err) {
            console.error(`Failed to rename ${file.originalFile.name}:`, err);
          }
        }
      }
      showSuccess(`Successfully renamed ${successCount} files directly in your folder!`);
    } catch (err) {
      showError("An error occurred during renaming");
    } finally {
      setIsRenaming(false);
    }
  };

  const handleDownloadAll = () => {
    if (files.length === 0) return;
    files.forEach(file => {
      const url = URL.createObjectURL(file.originalFile);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.newName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
    showSuccess(`Successfully processed ${files.length} files!`);
  };

  const removeFile = (id: string) => setFiles(prev => prev.filter(f => f.id !== id));
  const clearAll = () => {
    setFiles([]);
    setDirectoryHandle(null);
    showSuccess("Cleared all files");
  };

  const hasLocalHandles = files.some(f => f.fileHandle);

  return (
    <div className="h-screen flex flex-col bg-[#0d0d0d] text-[#f5f5f5] font-sans selection:bg-[#b8f2a0]/20 overflow-hidden">
      {/* Titlebar */}
      <header id="titlebar" className="flex items-center justify-between px-4 h-[46px] border-b border-[#2e2e2e] bg-[#0d0d0d] shrink-0" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}>
        <div className="logo flex items-center gap-[9px]" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          <div className="logo-icon w-6 h-6 bg-[#b8f2a0] rounded-[5px] flex items-center justify-center text-black">
            <RefreshCw size={14} />
          </div>
          <div className="flex items-baseline gap-2">
            <h1 className="logo-name font-sans font-extrabold text-[17px] tracking-[-0.3px] text-[#f5f5f5]">Nomina</h1>
            <span className="logo-version text-[10px] text-[#848484] font-mono mt-[1px]">v1.0.0 by VSL software</span>
          </div>
        </div>

        <div className="flex items-center gap-1" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          <button
            // @ts-ignore - injected by preload
            onClick={() => window.electron?.minimize()}
            className="w-8 h-8 flex items-center justify-center text-[#848484] hover:bg-[#1a1a1a] hover:text-[#f5f5f5] rounded transition-colors"
          >
            <Minus size={14} />
          </button>
          <button
            // @ts-ignore
            onClick={() => window.electron?.maximize()}
            className="w-8 h-8 flex items-center justify-center text-[#848484] hover:bg-[#1a1a1a] hover:text-[#f5f5f5] rounded transition-colors"
          >
            <Maximize2 size={13} />
          </button>
          <button
            // @ts-ignore
            onClick={() => window.electron?.close()}
            className="w-8 h-8 flex items-center justify-center text-[#848484] hover:bg-[rgba(255,92,92,0.13)] hover:text-[#ff5c5c] rounded transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex border-b border-[#2e2e2e] bg-[#0d0d0d] px-4 shrink-0">
        <button
          onClick={() => setActiveTab('split')}
          className={`px-4 py-2.5 text-[11px] font-bold tracking-[0.8px] uppercase font-mono border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'split' ? 'border-[#b8f2a0] text-[#b8f2a0]' : 'border-transparent text-[#848484] hover:text-[#c8c8c8]'}`}
        >
          <SplitSquareHorizontal size={14} />
          Rename
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2.5 text-[11px] font-bold tracking-[0.8px] uppercase font-mono border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'history' ? 'border-[#b8f2a0] text-[#b8f2a0]' : 'border-transparent text-[#848484] hover:text-[#c8c8c8]'}`}
        >
          <Clock size={14} />
          History
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-2.5 text-[11px] font-bold tracking-[0.8px] uppercase font-mono border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'settings' ? 'border-[#b8f2a0] text-[#b8f2a0]' : 'border-transparent text-[#848484] hover:text-[#c8c8c8]'}`}
        >
          <Settings size={14} />
          Settings
        </button>
      </div>

      {/* Main content — fills remaining height */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'split' && (
          <div className="h-full max-w-6xl mx-auto px-6 py-4 grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-200">
            {/* Left panel — scrollable internally if needed */}
            <div className="lg:col-span-5 flex flex-col gap-4 overflow-y-auto pr-1">
              <FileDropzone
                onFilesSelected={handleFilesSelected}
                onDirectorySelected={handleDirectorySelected}
              />

              <RenamingRules
                anchorText={anchorText}
                position={position}
                prefix={prefix}
                suffix={suffix}
                searchPattern={searchPattern}
                onAnchorTextChange={setAnchorText}
                onPositionChange={setPosition}
                onPrefixChange={setPrefix}
                onSuffixChange={setSuffix}
                onSearchPatternChange={setSearchPattern}
              />

              {files.length > 0 && (
                <div className="flex flex-col gap-2">
                  {hasLocalHandles ? (
                    <Button
                      className="w-full h-[46px] rounded-[6px] text-[13px] font-bold tracking-[1.5px] uppercase font-mono shadow-sm bg-[rgba(184,242,160,0.13)] text-[#b8f2a0] border-[1.5px] border-[rgba(184,242,160,0.3)] hover:bg-[rgba(184,242,160,0.2)] hover:border-[#b8f2a0] transition-all flex items-center justify-center gap-[9px]"
                      onClick={handleRenameInPlace}
                      disabled={isRenaming}
                    >
                      {isRenaming ? <Loader2 className="animate-spin w-[18px] h-[18px]" /> : <Save className="w-[18px] h-[18px]" />}
                      {isRenaming ? "Renaming..." : "Rename in Folder"}
                    </Button>
                  ) : (
                    <Button className="w-full h-[46px] rounded-[6px] text-[13px] font-bold tracking-[1.5px] uppercase font-mono shadow-sm bg-[rgba(184,242,160,0.13)] text-[#b8f2a0] border-[1.5px] border-[rgba(184,242,160,0.3)] hover:bg-[rgba(184,242,160,0.2)] hover:border-[#b8f2a0] transition-all flex items-center justify-center gap-[9px]" onClick={handleDownloadAll}>
                      <Download className="w-[18px] h-[18px]" />
                      Download All
                    </Button>
                  )}
                  <Button variant="outline" className="h-[36px] w-full rounded-[6px] border border-[#3d3d3d] bg-[#1e1e1e] hover:bg-[#272727] text-[#848484] hover:text-[#f5f5f5] text-[11px] font-bold tracking-[0.4px] uppercase font-mono transition-all" onClick={clearAll}>
                    <Trash2 size={14} className="mr-1.5" />
                    Clear All
                  </Button>
                </div>
              )}
            </div>

            {/* Right panel — file list fills full height */}
            <div className="lg:col-span-7 flex flex-col overflow-hidden">
              {files.length > 0 ? (
                <FilePreviewList files={files} onRemove={removeFile} />
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-[#2e2e2e] rounded-xl bg-[#141414] text-[#848484] font-mono">
                  <p className="font-bold text-[13px] text-[#c8c8c8]">No files selected yet</p>
                  <p className="text-[11px] mt-2">Drop files or select a folder to rename</p>
                </div>
              )}
            </div>

          </div>
        )}

        {activeTab === 'history' && (
          <div className="h-full flex flex-col items-center justify-center bg-[#141414] text-[#848484] font-mono animate-in fade-in duration-200">
            <Clock size={40} className="mb-4 opacity-50 text-[#b8f2a0]" />
            <p className="font-bold text-[13px] text-[#c8c8c8] uppercase tracking-[1px]">History coming soon</p>
            <p className="text-[11px] mt-2 text-[#848484]">Your previous renaming batches will appear here.</p>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="h-full flex flex-col items-center justify-center bg-[#141414] text-[#848484] font-mono animate-in fade-in duration-200">
            <Settings size={40} className="mb-4 opacity-50 text-[#b8f2a0]" />
            <p className="font-bold text-[13px] text-[#c8c8c8] uppercase tracking-[1px]">Settings coming soon</p>
            <p className="text-[11px] mt-2 text-[#848484]">App preferences and regex templates.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;