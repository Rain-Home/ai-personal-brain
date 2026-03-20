"use client";

import { useState, useEffect, useCallback } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Locale } from "@/types";
import { getTranslations } from "@/lib/i18n";
import { useNotes } from "@/hooks/use-notes";
import { useSettings } from "@/hooks/use-settings";
import { Sidebar } from "@/components/sidebar";
import { NoteEditor } from "@/components/note-editor";
import { EmptyState } from "@/components/empty-state";
import { cn } from "@/lib/utils";

const LOCALE_KEY = "kb-locale";

export default function Home() {
  const {
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
  } = useNotes();

  const { settings, updateSettings, resetSettings } = useSettings();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [locale, setLocale] = useState<Locale>("en");

  useEffect(() => {
    const saved = localStorage.getItem(LOCALE_KEY);
    if (saved === "en" || saved === "zh-CN") {
      setLocale(saved);
    }
  }, []);

  const handleLocaleChange = useCallback((l: Locale) => {
    setLocale(l);
    localStorage.setItem(LOCALE_KEY, l);
  }, []);

  const t = getTranslations(locale);

  const handleSelectNote = useCallback(
    (id: string) => {
      setActiveNoteId(id);
      setSidebarOpen(false);
    },
    [setActiveNoteId],
  );

  const handleCreateNote = useCallback(() => {
    createNote();
    setSidebarOpen(false);
  }, [createNote]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;
      if (isMod && e.key === "n") {
        e.preventDefault();
        handleCreateNote();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleCreateNote]);

  if (!isHydrated) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-72 border-r bg-background transition-transform duration-200 md:static md:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <Sidebar
          notes={filteredNotes}
          activeNoteId={activeNoteId}
          onSelectNote={handleSelectNote}
          onCreateNote={handleCreateNote}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          sidebarView={sidebarView}
          onViewChange={setSidebarView}
          allTags={allTags}
          locale={locale}
          onLocaleChange={handleLocaleChange}
          settings={settings}
          onUpdateSettings={updateSettings}
          onResetSettings={resetSettings}
          t={t}
        />
      </aside>

      {/* Main content */}
      <main className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile header */}
        <div className="flex items-center border-b px-3 py-2 md:hidden">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setSidebarOpen((o) => !o)}
          >
            {sidebarOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>
          <span className="ml-2 text-sm font-medium">{t.appName}</span>
        </div>

        {/* Editor or empty state */}
        <div className="flex-1 overflow-hidden">
          {activeNote ? (
            <NoteEditor
              note={activeNote}
              allNotes={notes}
              onUpdate={updateNote}
              onDelete={removeNote}
              onSelectNote={handleSelectNote}
              settings={settings}
              t={t}
            />
          ) : (
            <EmptyState onCreateNote={handleCreateNote} t={t} />
          )}
        </div>
      </main>
    </div>
  );
}
