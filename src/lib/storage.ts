import { Note } from "@/types";

const STORAGE_KEY = "kb-notes";
const SCHEMA_VERSION_KEY = "kb-schema-version";
const CURRENT_SCHEMA_VERSION = 1;

function ensureSchemaVersion(): void {
  const version = localStorage.getItem(SCHEMA_VERSION_KEY);
  if (version !== String(CURRENT_SCHEMA_VERSION)) {
    localStorage.setItem(SCHEMA_VERSION_KEY, String(CURRENT_SCHEMA_VERSION));
  }
}

export function getNotes(): Note[] {
  if (typeof window === "undefined") return [];
  ensureSchemaVersion();
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as Note[];
  } catch {
    return [];
  }
}

export function getNote(id: string): Note | null {
  return getNotes().find((n) => n.id === id) ?? null;
}

export function saveNote(note: Note): void {
  const notes = getNotes();
  const idx = notes.findIndex((n) => n.id === note.id);
  if (idx >= 0) {
    notes[idx] = note;
  } else {
    notes.unshift(note);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

export function deleteNote(id: string): void {
  const notes = getNotes().filter((n) => n.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}
