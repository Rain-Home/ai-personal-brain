"use client";

import { useEffect, useState } from "react";
import { Sparkles, FileText, Loader2 } from "lucide-react";
import { Note } from "@/types";
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
  const [related, setRelated] = useState<Note[]>([]);
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
          {related.map((note) => (
            <button
              key={note.id}
              onClick={() => onSelect(note.id)}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors hover:bg-accent"
            >
              <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="truncate">
                {note.title || t.untitledNote}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
