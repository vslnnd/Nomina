"use client";

import React from 'react';
import { FileText, ArrowRight, CheckCircle2, Loader2, X } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { motion, AnimatePresence } from 'framer-motion';

interface ProcessedFile {
  id: string;
  originalFile: File;
  newName: string;
  status: 'pending' | 'processing' | 'ready' | 'error' | 'renamed';
}

interface FilePreviewListProps {
  files: ProcessedFile[];
  onRemove: (id: string) => void;
}

const FilePreviewList = ({ files, onRemove }: FilePreviewListProps) => {
  if (files.length === 0) return null;

  return (
    <div className="flex flex-col h-full bg-[#141414] rounded-xl border border-[#2e2e2e] shadow-lg overflow-hidden font-mono">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#2e2e2e] bg-[#0d0d0d] shrink-0">
        <h3 className="text-[11px] font-bold text-[#848484] uppercase tracking-[0.8px]">Files to Process ({files.length})</h3>
      </div>

      <ScrollArea className="flex-1 p-3 bg-[#141414]">
        <div className="space-y-2">
          <AnimatePresence mode="popLayout">
            {files.map((file) => (
              <motion.div
                key={file.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="group relative flex items-center gap-3 p-3 rounded-[6px] bg-[#1e1e1e] border border-[#2e2e2e] hover:border-[#3d3d3d] transition-colors"
              >
                <div className="w-8 h-8 rounded-[4px] bg-[rgba(184,242,160,0.1)] flex items-center justify-center text-[#b8f2a0] shrink-0">
                  <FileText size={16} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-[12px] font-medium truncate">
                    <span className="text-[#848484] truncate max-w-[40%]">{file.originalFile.name}</span>
                    <ArrowRight size={14} className="text-[#3d3d3d] shrink-0" />
                    <span className="text-[#f5f5f5] font-bold truncate">{file.newName}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    {file.status === 'processing' && (
                      <span className="flex items-center gap-1 text-[10px] text-[#f0c040] font-bold">
                        <Loader2 size={10} className="animate-spin" />
                        READING CONTENT...
                      </span>
                    )}
                    {file.status === 'ready' && (
                      <span className="flex items-center gap-1 text-[10px] text-[#78e860] font-bold">
                        <CheckCircle2 size={10} />
                        READY TO RENAME
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => onRemove(file.id)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-[rgba(255,92,92,0.13)] hover:text-[#ff5c5c] rounded-[4px] text-[#848484] transition-all"
                >
                  <X size={15} />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </ScrollArea>
    </div>
  );
};

export default FilePreviewList;