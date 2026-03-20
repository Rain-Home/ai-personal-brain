export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  summary: string;
}

export type SidebarView = "all" | "recent" | "tags";

export type Locale = "en" | "zh-CN";
