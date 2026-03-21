"use client";

import { useEffect, useState } from "react";
import { Sparkles, FileText, Loader2 } from "lucide-react";
import { Note, RelatedNoteResult } from "@/types";
import { findRelatedNotes } from "@/lib/ai-service";
import { Translations } from "@/lib/i18n";

interface RelatedNotesProps {
  noteId: string;
  allNotes: Note[];
  onSelect: (id: string) => void;
  t: Translations;
}

export function RelatedNotes({
  noteId,
  allNotes,
  onSelect,
  t,
}: RelatedNotesProps) {
  const [related, setRelated] = useState<RelatedNoteResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    findRelatedNotes(noteId, allNotes).then((results) => {
      if (!cancelled) {
        setRelated(results);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [noteId, allNotes]);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <Sparkles className="h-3.5 w-3.5" />
        {t.relatedNotes}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          {t.generating}
        </div>
      ) : related.length === 0 ? (
        <p className="py-2 text-xs text-muted-foreground">{t.noRelated}</p>
      ) : (
        <div className="space-y-1">
          {related.map((result) => (
            <button
              key={result.note.id}
              onClick={() => onSelect(result.note.id)}
              className="flex w-full flex-col gap-0.5 rounded-md px-2 py-1.5 text-left text-xs transition-colors hover:bg-accent"
            >
              <div className="flex items-center gap-2">
                <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="truncate">
                  {result.note.title || t.untitledNote}
                </span>
              </div>
              {result.reason && (
                <p className="truncate pl-[22px] text-[10px] italic text-muted-foreground/70">
                  {result.reason}
                </p>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
