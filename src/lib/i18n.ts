import { Locale } from "@/types";

export const translations = {
  en: {
    appName: "Second Brain",
    appDescription: "AI-Powered Knowledge Base",
    allNotes: "All Notes",
    recent: "Recent",
    tags: "Tags",
    newNote: "New Note",
    searchPlaceholder: "Search notes...",
    untitledNote: "Untitled Note",
    deleteNote: "Delete",
    deleteConfirmTitle: "Delete Note",
    deleteConfirmMessage:
      "Are you sure you want to delete this note? This action cannot be undone.",
    cancel: "Cancel",
    confirm: "Delete",
    edit: "Edit",
    preview: "Preview",
    summarize: "Summarize",
    generating: "Generating...",
    relatedNotes: "Related Knowledge",
    noRelated: "No related notes found",
    createdAt: "Created",
    updatedAt: "Modified",
    generatedTags: "AI Tags",
    emptyStateTitle: "Start your second brain",
    emptyStateDescription:
      "Create your first note and let AI help you organize your knowledge.",
    createFirstNote: "Create your first note",
    titlePlaceholder: "Note title...",
    contentPlaceholder: "Start writing in Markdown...",
    noNotes: "No notes found",
    noTags: "No tags yet",
    lightMode: "Light",
    darkMode: "Dark",
    system: "System",
    language: "Language",
    noteCount: (n: number) => (n === 1 ? "1 note" : `${n} notes`),
    justNow: "just now",
    minutesAgo: (n: number) => (n === 1 ? "1 min ago" : `${n} min ago`),
    hoursAgo: (n: number) => (n === 1 ? "1 hr ago" : `${n} hr ago`),
    daysAgo: (n: number) => (n === 1 ? "1 day ago" : `${n} days ago`),
  },
  "zh-CN": {
    appName: "第二大脑",
    appDescription: "AI驱动的知识库",
    allNotes: "所有笔记",
    recent: "最近",
    tags: "标签",
    newNote: "新建笔记",
    searchPlaceholder: "搜索笔记...",
    untitledNote: "无标题笔记",
    deleteNote: "删除",
    deleteConfirmTitle: "删除笔记",
    deleteConfirmMessage: "确定要删除这篇笔记吗？此操作无法撤销。",
    cancel: "取消",
    confirm: "删除",
    edit: "编辑",
    preview: "预览",
    summarize: "生成摘要",
    generating: "生成中...",
    relatedNotes: "相关知识",
    noRelated: "未找到相关笔记",
    createdAt: "创建于",
    updatedAt: "修改于",
    generatedTags: "AI标签",
    emptyStateTitle: "开始你的第二大脑",
    emptyStateDescription: "创建你的第一篇笔记，让AI帮你组织知识。",
    createFirstNote: "创建第一篇笔记",
    titlePlaceholder: "笔记标题...",
    contentPlaceholder: "开始用 Markdown 写作...",
    noNotes: "没有找到笔记",
    noTags: "还没有标签",
    lightMode: "浅色",
    darkMode: "深色",
    system: "跟随系统",
    language: "语言",
    noteCount: (n: number) => `${n} 篇笔记`,
    justNow: "刚刚",
    minutesAgo: (n: number) => `${n} 分钟前`,
    hoursAgo: (n: number) => `${n} 小时前`,
    daysAgo: (n: number) => `${n} 天前`,
  },
} as const;

export type Translations = (typeof translations)[Locale];

export function getTranslations(locale: Locale): Translations {
  return translations[locale];
}

export function formatRelativeTime(
  dateStr: string,
  t: Translations,
): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return t.justNow;
  if (diffMin < 60) return t.minutesAgo(diffMin);
  if (diffHr < 24) return t.hoursAgo(diffHr);
  return t.daysAgo(diffDay);
}
