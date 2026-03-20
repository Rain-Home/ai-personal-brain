"use client";

import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Translations } from "@/lib/i18n";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  t: Translations;
}

export function SearchBar({ value, onChange, t }: SearchBarProps) {
  return (
    <div className="relative">
      <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t.searchPlaceholder}
        className="h-9 pl-9 pr-8 text-sm"
      />
      {value && (
        <button
          onClick={() => onChange("")}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
