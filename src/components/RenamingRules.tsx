"use client";

import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Anchor, MoveDown, MoveUp, MoveRight, MoveLeft, Type } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

export type SearchPosition = 'after' | 'before' | 'above' | 'below';

interface RenamingRulesProps {
  anchorText: string;
  position: SearchPosition;
  prefix: string;
  suffix: string;
  searchPattern: string;
  onAnchorTextChange: (val: string) => void;
  onPositionChange: (val: SearchPosition) => void;
  onPrefixChange: (val: string) => void;
  onSuffixChange: (val: string) => void;
  onSearchPatternChange: (val: string) => void;
}

const RenamingRules = ({
  anchorText,
  position,
  prefix,
  suffix,
  searchPattern,
  onAnchorTextChange,
  onPositionChange,
  onPrefixChange,
  onSuffixChange,
  onSearchPatternChange
}: RenamingRulesProps) => {
  return (
    <Card className="border border-[#78e860]/30 shadow-lg bg-[#141414] overflow-hidden rounded-[8px]">
      <CardHeader className="bg-[rgba(184,242,160,0.07)] py-3 px-4 border-b border-[#2e2e2e]">
        <CardTitle className="text-[14px] flex items-center gap-2 text-[#b8f2a0] font-sans font-bold">
          <Anchor className="w-4 h-4 opacity-70" />
          Core Renaming Logic
        </CardTitle>
        <p className="text-[11px] text-[#848484] font-mono mt-1">Define the anchor and how to wrap the extracted value.</p>
      </CardHeader>
      <CardContent className="space-y-4 pt-5 px-5 pb-5 font-mono">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label className="text-[10px] font-bold text-[#848484] uppercase tracking-[0.8px]">1. Anchor Text</Label>
            <div className="relative">
              <Anchor className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#b8f2a0]" />
              <Input
                placeholder="e.g. INVOICE NO"
                className="pl-9 h-9 text-[12px] bg-[#1e1e1e] border-[#2e2e2e] focus-visible:border-[#b8f2a0] focus-visible:ring-0 text-[#f5f5f5] rounded-[6px]"
                value={anchorText}
                onChange={(e) => onAnchorTextChange(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-bold text-[#848484] uppercase tracking-[0.8px]">2. Value Position</Label>
            <Select value={position} onValueChange={(val) => onPositionChange(val as SearchPosition)}>
              <SelectTrigger className="h-9 text-[12px] bg-[#1e1e1e] border-[#2e2e2e] focus:border-[#b8f2a0] focus:ring-0 text-[#f5f5f5] rounded-[6px]">
                <SelectValue placeholder="Select position" />
              </SelectTrigger>
              <SelectContent className="bg-[#1e1e1e] border-[#2e2e2e] text-[#f5f5f5]">
                <SelectItem value="after" className="focus:bg-[#272727] focus:text-[#b8f2a0]"><div className="flex items-center gap-2"><MoveRight className="w-3.5 h-3.5 text-[#f0c040]" /><span>After the text</span></div></SelectItem>
                <SelectItem value="before" className="focus:bg-[#272727] focus:text-[#b8f2a0]"><div className="flex items-center gap-2"><MoveLeft className="w-3.5 h-3.5 text-[#ff5c5c]" /><span>Before the text</span></div></SelectItem>
                <SelectItem value="above" className="focus:bg-[#272727] focus:text-[#b8f2a0]"><div className="flex items-center gap-2"><MoveUp className="w-3.5 h-3.5 text-[#78e860]" /><span>Line above</span></div></SelectItem>
                <SelectItem value="below" className="focus:bg-[#272727] focus:text-[#b8f2a0]"><div className="flex items-center gap-2"><MoveDown className="w-3.5 h-3.5 text-[#60a5e8]" /><span>Line below</span></div></SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label className="text-[10px] font-bold text-[#848484] uppercase tracking-[0.8px]">3. Add Prefix</Label>
            <div className="relative">
              <Type className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#848484]" />
              <Input
                placeholder="Pre_"
                className="pl-9 h-9 text-[12px] bg-[#1e1e1e] border-[#2e2e2e] focus-visible:border-[#b8f2a0] focus-visible:ring-0 text-[#f5f5f5] rounded-[6px]"
                value={prefix}
                onChange={(e) => onPrefixChange(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] font-bold text-[#848484] uppercase tracking-[0.8px]">4. Add Suffix</Label>
            <div className="relative">
              <Type className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#848484]" />
              <Input
                placeholder="_Suf"
                className="pl-9 h-9 text-[12px] bg-[#1e1e1e] border-[#2e2e2e] focus-visible:border-[#b8f2a0] focus-visible:ring-0 text-[#f5f5f5] rounded-[6px]"
                value={suffix}
                onChange={(e) => onSuffixChange(e.target.value)}
              />
            </div>
          </div>
        </div>

        <p className="text-[11px] text-[#848484] bg-[#1a1a1a] px-4 py-3 rounded-[6px] border border-[#2e2e2e]">
          Final name: <span className="font-bold text-[#b8f2a0]">{prefix || ''}Value{suffix || ''}.ext</span>
        </p>

        <div className="flex items-center gap-3 py-1">
          <Separator className="flex-1 bg-[#2e2e2e]" />
          <span className="text-[9px] font-bold text-[#848484] uppercase tracking-[1.5px]">Advanced</span>
          <Separator className="flex-1 bg-[#2e2e2e]" />
        </div>

        <div className="space-y-2">
          <Label className="text-[10px] font-bold uppercase text-[#848484] tracking-[0.8px]">Regex Extraction (Optional)</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#848484]" />
            <Input
              placeholder="Regex pattern..."
              className="pl-9 h-9 text-[12px] bg-[#1e1e1e] border-[#2e2e2e] focus-visible:border-[#b8f2a0] focus-visible:ring-0 text-[#f5f5f5] rounded-[6px]"
              value={searchPattern}
              onChange={(e) => onSearchPatternChange(e.target.value)}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default RenamingRules;