"use client";

import { FileText } from "lucide-react";
import { Note } from "@/types";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Translations, formatRelativeTime } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface NoteListProps {
  notes: Note[];
  activeNoteId: string | null;
  onSelect: (id: string) => void;
  t: Translations;
}

export function NoteList({ notes, activeNoteId, onSelect, t }: NoteListProps) {
  if (notes.length === 0) {
    return (
      <div className="px-3 py-8 text-center text-sm text-muted-foreground">
        {t.noNotes}
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1">
      <div className="space-y-0.5 p-2">
        {notes.map((note) => (
          <button
            key={note.id}
            onClick={() => onSelect(note.id)}
            className={cn(
              "w-full rounded-lg px-3 py-2.5 text-left transition-colors",
              "hover:bg-accent/50",
              activeNoteId === note.id && "bg-accent",
            )}
          >
            <div className="flex items-start gap-2.5">
              <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {note.title || t.untitledNote}
                </p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {note.content.slice(0, 60).replace(/[#*_`>\-\[\]()]/g, "") ||
                    "..."}
                </p>
                <div className="mt-1.5 flex items-center gap-1.5">
                  <span className="text-[11px] text-muted-foreground">
                    {formatRelativeTime(note.updatedAt, t)}
                  </span>
                  {note.tags.slice(0, 2).map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="h-4 px-1.5 text-[10px]"
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </ScrollArea>
  );
}
