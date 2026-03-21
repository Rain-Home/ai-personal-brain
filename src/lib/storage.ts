import { Note } from "@/types";
import { INITIAL_NOTES, SEED_VERSION } from "@/constants/seed-data";

const STORAGE_KEY = "kb-notes";
const SCHEMA_VERSION_KEY = "kb-schema-version";
const SEED_VERSION_KEY = "kb-seed-version";
const CURRENT_SCHEMA_VERSION = 2;

function migrateNotes(): void {
  const version = Number(localStorage.getItem(SCHEMA_VERSION_KEY) ?? "0");
  if (version >= CURRENT_SCHEMA_VERSION) return;

  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      const notes = JSON.parse(raw) as Record<string, unknown>[];
      const migrated = notes.map((n) => ({
        ...n,
        aiTags: Array.isArray(n.aiTags) ? n.aiTags : [],
      }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
    } catch {
      // corrupted data – leave as-is; getNotes will return []
    }
  }

  localStorage.setItem(SCHEMA_VERSION_KEY, String(CURRENT_SCHEMA_VERSION));
}

function seedInitialNotes(existing: Note[]): Note[] {
  const localVersion = Number(localStorage.getItem(SEED_VERSION_KEY) ?? "0");
  if (localVersion >= SEED_VERSION) return existing;

  const existingTitles = new Set(existing.map((n) => n.title));
  const now = new Date().toISOString();

  const newNotes: Note[] = INITIAL_NOTES
    .filter((n) => !existingTitles.has(n.title))
    .map(({ seedKey: _, ...rest }) => ({
      ...rest,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    }));

  if (newNotes.length > 0) {
    const merged = [...newNotes, ...existing];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    localStorage.setItem(SEED_VERSION_KEY, String(SEED_VERSION));
    return merged;
  }

  localStorage.setItem(SEED_VERSION_KEY, String(SEED_VERSION));
  return existing;
}

export function getNotes(): Note[] {
  if (typeof window === "undefined") return [];
  migrateNotes();
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return seedInitialNotes([]);
  try {
    const notes = JSON.parse(raw) as Note[];
    return seedInitialNotes(notes);
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
