"use client";

import { useState } from "react";
import { Plus, Brain, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Note, SidebarView, Locale } from "@/types";
import { AISettings } from "@/hooks/use-settings";
import { Translations } from "@/lib/i18n";
import { SearchBar } from "./search-bar";
import { NoteList } from "./note-list";
import { TagsCloud } from "./tags-cloud";
import { ThemeToggle } from "./theme-toggle";
import { LocaleSwitcher } from "./locale-switcher";
import { SettingsDialog } from "./settings-dialog";

interface SidebarProps {
  notes: Note[];
  activeNoteId: string | null;
  onSelectNote: (id: string) => void;
  onCreateNote: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  sidebarView: SidebarView;
  onViewChange: (v: SidebarView) => void;
  allTags: Map<string, number>;
  locale: Locale;
  onLocaleChange: (l: Locale) => void;
  settings: AISettings;
  onUpdateSettings: (partial: Partial<AISettings>) => void;
  onResetSettings: () => void;
  t: Translations;
}

export function Sidebar({
  notes,
  activeNoteId,
  onSelectNote,
  onCreateNote,
  searchQuery,
  onSearchChange,
  sidebarView,
  onViewChange,
  allTags,
  locale,
  onLocaleChange,
  settings,
  onUpdateSettings,
  onResetSettings,
  t,
}: SidebarProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);

  const handleTagClick = (tag: string) => {
    onSearchChange(tag);
    onViewChange("all");
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3">
        <Brain className="h-5 w-5 text-primary" />
        <h1 className="text-sm font-semibold tracking-tight">{t.appName}</h1>
      </div>

      <div className="px-3">
        <Button
          onClick={onCreateNote}
          className="w-full justify-start gap-2"
          size="sm"
        >
          <Plus className="h-4 w-4" />
          {t.newNote}
        </Button>
      </div>

      <div className="mt-3 px-3">
        <SearchBar value={searchQuery} onChange={onSearchChange} t={t} />
      </div>

      <Separator className="mx-3 mt-3" />

      {/* Tabs */}
      <div className="px-3 pt-3">
        <Tabs
          value={sidebarView}
          onValueChange={(v) => onViewChange(v as SidebarView)}
        >
          <TabsList className="w-full">
            <TabsTrigger value="all" className="flex-1 text-xs">
              {t.allNotes}
            </TabsTrigger>
            <TabsTrigger value="recent" className="flex-1 text-xs">
              {t.recent}
            </TabsTrigger>
            <TabsTrigger value="tags" className="flex-1 text-xs">
              {t.tags}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Content */}
      <div className="mt-1 flex flex-1 flex-col overflow-hidden">
        {sidebarView === "tags" ? (
          <TagsCloud tags={allTags} onTagClick={handleTagClick} t={t} />
        ) : (
          <NoteList
            notes={notes}
            activeNoteId={activeNoteId}
            onSelect={onSelectNote}
            t={t}
          />
        )}
      </div>

      {/* Footer */}
      <Separator className="mx-3" />
      <div className="flex items-center justify-between px-3 py-2">
        <span className="text-xs text-muted-foreground">
          {t.noteCount(notes.length)}
        </span>
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setSettingsOpen(true)}
          >
            <Settings className="h-4 w-4" />
          </Button>
          <LocaleSwitcher locale={locale} onLocaleChange={onLocaleChange} />
          <ThemeToggle t={t} />
        </div>
      </div>

      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        settings={settings}
        onUpdate={onUpdateSettings}
        onReset={onResetSettings}
        t={t}
      />
    </div>
  );
}
