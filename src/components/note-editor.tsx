"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Eye,
  Pencil,
  Trash2,
  Sparkles,
  Loader2,
  Clock,
  Calendar,
  Tag,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Note } from "@/types";
import { AISettings } from "@/hooks/use-settings";
import { Translations, formatRelativeTime } from "@/lib/i18n";
import { generateTags, summarizeNote } from "@/lib/ai-service";
import { MarkdownPreview } from "./markdown-preview";
import { RelatedNotes } from "./related-notes";

interface NoteEditorProps {
  note: Note;
  allNotes: Note[];
  onUpdate: (id: string, updates: Partial<Omit<Note, "id" | "createdAt">>) => void;
  onDelete: (id: string) => void;
  onSelectNote: (id: string) => void;
  settings: AISettings;
  t: Translations;
}

export function NoteEditor({
  note,
  allNotes,
  onUpdate,
  onDelete,
  onSelectNote,
  settings,
  t,
}: NoteEditorProps) {
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isTagging, setIsTagging] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setTitle(note.title);
    setContent(note.content);
    setMode("edit");
  }, [note.id]);

  useEffect(() => {
    if (title === note.title && content === note.content) return;

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      onUpdate(note.id, { title, content });
    }, 500);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [title, content, note.id, note.title, note.content, onUpdate]);

  const handleSummarize = useCallback(async () => {
    if (!content.trim()) return;
    setIsSummarizing(true);
    const summary = await summarizeNote(content, settings);
    onUpdate(note.id, { summary });
    setIsSummarizing(false);
  }, [content, note.id, onUpdate, settings]);

  const handleAITag = useCallback(async () => {
    if (!content.trim()) return;
    setIsTagging(true);
    const { aiTags, conceptSummary } = await generateTags(content, settings);
    onUpdate(note.id, { aiTags, conceptSummary });
    setIsTagging(false);
  }, [content, note.id, onUpdate, settings]);

  const handleDelete = () => {
    setDeleteOpen(false);
    onDelete(note.id);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;
      if (isMod && e.key === "/") {
        e.preventDefault();
        setMode((m) => (m === "edit" ? "preview" : "edit"));
      }
      if (isMod && e.key === "s") {
        e.preventDefault();
        onUpdate(note.id, { title, content });
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [note.id, title, content, onUpdate]);

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b px-4 py-2">
        <div className="flex items-center gap-1">
          <Button
            variant={mode === "edit" ? "secondary" : "ghost"}
            size="sm"
            className="h-7 gap-1.5 text-xs"
            onClick={() => setMode("edit")}
          >
            <Pencil className="h-3.5 w-3.5" />
            {t.edit}
          </Button>
          <Button
            variant={mode === "preview" ? "secondary" : "ghost"}
            size="sm"
            className="h-7 gap-1.5 text-xs"
            onClick={() => setMode("preview")}
          >
            <Eye className="h-3.5 w-3.5" />
            {t.preview}
          </Button>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 text-xs"
            onClick={handleAITag}
            disabled={isTagging || !content.trim()}
          >
            {isTagging ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Tag className="h-3.5 w-3.5" />
            )}
            {isTagging ? t.generating : t.aiTag}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 text-xs"
            onClick={handleSummarize}
            disabled={isSummarizing || !content.trim()}
          >
            {isSummarizing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            {isSummarizing ? t.generating : t.summarize}
          </Button>

          <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
            <DialogTrigger
              render={
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1.5 text-xs text-destructive hover:text-destructive"
                />
              }
            >
              <Trash2 className="h-3.5 w-3.5" />
              {t.deleteNote}
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t.deleteConfirmTitle}</DialogTitle>
                <DialogDescription>
                  {t.deleteConfirmMessage}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setDeleteOpen(false)}
                >
                  {t.cancel}
                </Button>
                <Button variant="destructive" onClick={handleDelete}>
                  {t.confirm}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Editor body */}
      <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
        {/* Main editor area */}
        <div className="flex flex-1 flex-col overflow-auto p-6">
          {/* Title */}
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t.titlePlaceholder}
            className="mb-4 border-none bg-transparent text-2xl font-bold tracking-tight outline-none placeholder:text-muted-foreground/50"
          />

          {/* Summary */}
          {note.summary && (
            <div className="mb-4 rounded-lg border bg-muted/50 px-4 py-3">
              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Sparkles className="h-3 w-3" />
                Summary
              </div>
              <p className="mt-1 text-sm">{note.summary}</p>
            </div>
          )}

          {/* Concept Summary */}
          {note.conceptSummary && (
            <div className="mb-4 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
              <div className="flex items-center gap-1.5 text-xs font-medium text-primary/70">
                <Sparkles className="h-3 w-3" />
                {t.conceptSummary}
              </div>
              <p className="mt-1 text-sm italic">{note.conceptSummary}</p>
            </div>
          )}

          {/* Content area */}
          {mode === "edit" ? (
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={t.contentPlaceholder}
              className="flex-1 resize-none border-none bg-transparent font-mono text-sm leading-relaxed outline-none placeholder:text-muted-foreground/50"
            />
          ) : (
            <div className="flex-1 overflow-auto">
              <MarkdownPreview content={content} />
            </div>
          )}
        </div>

        {/* Right panel: metadata + related notes */}
        <div className="w-full shrink-0 border-t lg:w-64 lg:border-l lg:border-t-0">
          <div className="space-y-4 p-4">
            {/* Metadata */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                {t.createdAt}: {formatRelativeTime(note.createdAt, t)}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                {t.updatedAt}: {formatRelativeTime(note.updatedAt, t)}
              </div>
            </div>

            <Separator />

            {/* User Tags */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <Tag className="h-3.5 w-3.5" />
                {t.tags}
              </div>
              {note.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {note.tags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="gap-0.5 pr-1 text-xs"
                    >
                      {tag}
                      <button
                        type="button"
                        className="ml-0.5 rounded-full p-0.5 hover:bg-muted-foreground/20"
                        onClick={() =>
                          onUpdate(note.id, {
                            tags: note.tags.filter((t) => t !== tag),
                          })
                        }
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault();
                    const value = tagInput.replace(/,/g, "").trim();
                    if (
                      value &&
                      !note.tags.some(
                        (t) => t.toLowerCase() === value.toLowerCase(),
                      )
                    ) {
                      onUpdate(note.id, { tags: [...note.tags, value] });
                    }
                    setTagInput("");
                  }
                }}
                placeholder={t.addTag}
                className="h-7 text-xs"
              />
            </div>

            {/* AI Tags */}
            {note.aiTags.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-medium text-primary/70">
                  <Sparkles className="h-3.5 w-3.5" />
                  {t.generatedTags}
                </div>
                <div className="flex flex-wrap gap-1">
                  {note.aiTags.map((tag) => (
                    <Badge
                      key={tag.label}
                      variant="outline"
                      className="gap-1 text-xs"
                    >
                      <span className="text-[10px] text-muted-foreground">
                        {tag.category}
                      </span>
                      {tag.label}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <Separator />

            {/* Related notes */}
            <RelatedNotes
              noteId={note.id}
              allNotes={allNotes}
              onSelect={onSelectNote}
              t={t}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
