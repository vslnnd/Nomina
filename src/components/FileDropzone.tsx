"use client";

import React from 'react';
import { HardDrive } from 'lucide-react';
import { cn } from '@/lib/utils';
import { showSuccess, showError } from '@/utils/toast';

interface FileDropzoneProps {
  onFilesSelected: (files: File[]) => void;
  onDirectorySelected: (handle: any) => void;
  className?: string;
}

const FileDropzone = ({ onDirectorySelected, className }: FileDropzoneProps) => {
  const handleOpenDirectory = async () => {
    try {
      // @ts-ignore - File System Access API
      if ('showDirectoryPicker' in window) {
        // @ts-ignore
        const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
        onDirectorySelected(handle);
        showSuccess("Folder linked successfully!");
      } else {
        showError("Your browser doesn't support direct file renaming. Please use Chrome or Edge.");
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        showError("Failed to open folder");
      }
    }
  };

  return (
    <div className={cn("relative group", className)}>
      <div className="absolute inset-0 bg-[rgba(184,242,160,0.07)] rounded-xl border-[1.5px] border-dashed border-[#3d3d3d] group-hover:border-[#b8f2a0] transition-colors pointer-events-none" />
      <div className="relative px-6 py-8 flex flex-col items-center text-center gap-3">
        <button
          onClick={handleOpenDirectory}
          className="w-full bg-[rgba(184,242,160,0.13)] text-[#b8f2a0] border border-[rgba(184,242,160,0.25)] hover:bg-[rgba(184,242,160,0.2)] hover:border-[#b8f2a0] px-4 py-3 rounded-[6px] font-mono text-[13px] font-bold uppercase tracking-[1.5px] transition-all flex items-center justify-center gap-2 shadow-sm"
        >
          <HardDrive size={16} />
          Select Folder
        </button>
        <p className="text-[11px] text-[#848484] tracking-wider font-mono mt-1">
          Files are renamed securely
        </p>
      </div>
    </div>
  );
};

export default FileDropzone;