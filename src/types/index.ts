export type TagCategory = "domain" | "tech" | "action" | "project";

export interface AITag {
  label: string;
  category: TagCategory;
  weight: number;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  summary: string;
  aiTags: AITag[];
  conceptSummary?: string;
}

export interface RelatedNoteResult {
  note: Note;
  score: number;
  reason: string;
}

export type SidebarView = "all" | "recent" | "tags";

export type Locale = "en" | "zh-CN";
