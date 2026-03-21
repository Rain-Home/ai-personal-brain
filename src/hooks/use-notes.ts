"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { Note, SidebarView } from "@/types";
import * as storage from "@/lib/storage";
import { nanoid } from "nanoid";

export function useNotes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarView, setSidebarView] = useState<SidebarView>("all");
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setNotes(storage.getNotes());
    setIsHydrated(true);
  }, []);

  const activeNote = useMemo(
    () => notes.find((n) => n.id === activeNoteId) ?? null,
    [notes, activeNoteId],
  );

  const createNote = useCallback(() => {
    const now = new Date().toISOString();
    const note: Note = {
      id: nanoid(),
      title: "",
      content: "",
      createdAt: now,
      updatedAt: now,
      tags: [],
      summary: "",
      aiTags: [],
    };
    storage.saveNote(note);
    setNotes((prev) => [note, ...prev]);
    setActiveNoteId(note.id);
    return note;
  }, []);

  const updateNote = useCallback(
    (id: string, updates: Partial<Omit<Note, "id" | "createdAt">>) => {
      setNotes((prev) =>
        prev.map((n) => {
          if (n.id !== id) return n;
          const updated = {
            ...n,
            ...updates,
            updatedAt: new Date().toISOString(),
          };
          storage.saveNote(updated);
          return updated;
        }),
      );
    },
    [],
  );

  const removeNote = useCallback(
    (id: string) => {
      storage.deleteNote(id);
      setNotes((prev) => prev.filter((n) => n.id !== id));
      setActiveNoteId((current) => (current === id ? null : current));
    },
    [],
  );

  const filteredNotes = useMemo(() => {
    let result = notes;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          n.content.toLowerCase().includes(q) ||
          n.tags.some((t) => t.toLowerCase().includes(q)),
      );
    }

    if (sidebarView === "recent") {
      result = [...result].sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );
    }

    return result;
  }, [notes, searchQuery, sidebarView]);

  const allTags = useMemo(() => {
    const tagMap = new Map<string, number>();
    for (const note of notes) {
      for (const tag of note.tags) {
        tagMap.set(tag, (tagMap.get(tag) || 0) + 1);
      }
    }
    return tagMap;
  }, [notes]);

  return {
    notes,
    activeNote,
    activeNoteId,
    setActiveNoteId,
    createNote,
    updateNote,
    removeNote,
    searchQuery,
    setSearchQuery,
    sidebarView,
    setSidebarView,
    filteredNotes,
    allTags,
    isHydrated,
  };
}
