"use client";

import { Brain, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Translations } from "@/lib/i18n";

interface EmptyStateProps {
  onCreateNote: () => void;
  t: Translations;
}

export function EmptyState({ onCreateNote, t }: EmptyStateProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 px-8">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
        <Brain className="h-10 w-10 text-muted-foreground" />
      </div>
      <div className="text-center">
        <h2 className="text-2xl font-semibold tracking-tight">
          {t.emptyStateTitle}
        </h2>
        <p className="mt-2 max-w-sm text-muted-foreground">
          {t.emptyStateDescription}
        </p>
      </div>
      <Button onClick={onCreateNote} size="lg" className="gap-2">
        <Plus className="h-5 w-5" />
        {t.createFirstNote}
      </Button>
    </div>
  );
}
