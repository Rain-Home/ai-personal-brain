"use client";

import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Translations } from "@/lib/i18n";

interface TagsCloudProps {
  tags: Map<string, number>;
  onTagClick: (tag: string) => void;
  t: Translations;
}

export function TagsCloud({ tags, onTagClick, t }: TagsCloudProps) {
  if (tags.size === 0) {
    return (
      <div className="px-3 py-8 text-center text-sm text-muted-foreground">
        {t.noTags}
      </div>
    );
  }

  const sorted = [...tags.entries()].sort((a, b) => b[1] - a[1]);

  return (
    <ScrollArea className="flex-1">
      <div className="flex flex-wrap gap-1.5 p-3">
        {sorted.map(([tag, count]) => (
          <Badge
            key={tag}
            variant="secondary"
            className="cursor-pointer transition-colors hover:bg-primary hover:text-primary-foreground"
            onClick={() => onTagClick(tag)}
          >
            {tag}
            <span className="ml-1 text-[10px] opacity-60">{count}</span>
          </Badge>
        ))}
      </div>
    </ScrollArea>
  );
}
