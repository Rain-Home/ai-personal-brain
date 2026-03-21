import { Note, AITag, TagCategory, RelatedNoteResult } from "@/types";
import { AISettings } from "@/hooks/use-settings";

const VALID_CATEGORIES = new Set<TagCategory>(["domain", "tech", "action", "project"]);

async function callAI(prompt: string, settings: AISettings): Promise<string> {
  const res = await fetch(
    `${settings.baseUrl.replace(/\/+$/, "")}/v1/chat/completions`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${settings.apiKey}`,
      },
      body: JSON.stringify({
        model: settings.modelName,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
      }),
    },
  );
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`AI request failed (${res.status}): ${body}`);
  }
  const data = await res.json();
  return data.choices[0].message.content;
}

// ---------------------------------------------------------------------------
// Local fallbacks (used when no API key is configured or on failure)
// ---------------------------------------------------------------------------

const STOP_WORDS = new Set([
  "the", "a", "an", "is", "it", "to", "in", "for", "of", "and",
  "or", "but", "on", "at", "by", "with", "from", "as", "this",
  "that", "was", "are", "be", "has", "have", "had", "not", "do",
  "does", "did", "will", "would", "can", "could", "should", "may",
  "might", "i", "you", "he", "she", "we", "they", "my", "your",
  "his", "her", "its", "our", "their", "what", "which", "who",
  "when", "where", "how", "all", "each", "every", "both", "few",
  "more", "most", "other", "some", "such", "no", "nor", "too",
  "very", "just", "about", "above", "after", "again", "also",
  "been", "before", "below", "between", "come", "get", "got",
  "into", "made", "make", "much", "must", "own", "same", "so",
  "than", "then", "there", "these", "those", "through", "under",
  "use", "used", "using", "way", "well", "while",
]);

function extractKeywords(text: string): string[] {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s\u4e00-\u9fff]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));

  const freq = new Map<string, number>();
  for (const w of words) {
    freq.set(w, (freq.get(w) || 0) + 1);
  }

  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([word]) => word);
}

function localSummary(content: string): string {
  const sentences = content
    .replace(/\n+/g, " ")
    .replace(/[#*_`>\-\[\]()]/g, "")
    .split(/[.!?。！？]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 10);

  if (sentences.length === 0) return "This note contains brief content.";

  const summary = sentences[0];
  return summary.length > 150 ? summary.slice(0, 147) + "..." : summary + ".";
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

interface GenerateTagsResult {
  aiTags: AITag[];
  conceptSummary: string;
}

function localFallbackTags(content: string): GenerateTagsResult {
  const keywords = extractKeywords(content.trim()).slice(0, 5);
  return {
    aiTags: keywords.map((k) => ({ label: k, category: "domain" as TagCategory, weight: 0.5 })),
    conceptSummary: localSummary(content),
  };
}

export async function generateTags(
  content: string,
  settings: AISettings,
): Promise<GenerateTagsResult> {
  if (!content.trim()) return { aiTags: [], conceptSummary: "" };

  if (!settings.apiKey) return localFallbackTags(content);

  const truncated = content.slice(0, 2000);

  const systemPrompt = `You are an AI Product Manager and PhD Researcher. Analyze the note and return a strict JSON object with:
- "tags": an array of 3-5 objects, each with "label" (string), "category" (one of "domain", "tech", "action", "project"), and "weight" (number 0.0-1.0).
  Categories:
  - domain: Industry/Field (e.g. "EdTech", "Photography")
  - tech: Specific technology (e.g. "LLM", "RAG", "Next.js")
  - action: Nature of the note (e.g. "Interview Prep", "Methodology", "Brainstorm")
- "conceptSummary": a single sentence summarizing the core concept of the note.

Return ONLY valid JSON, no markdown fences, no explanation.`;

  try {
    const response = await callAI(
      `${systemPrompt}\n\nNote:\n${truncated}`,
      settings,
    );

    const cleaned = response.replace(/```(?:json)?\s*/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleaned) as {
      tags?: unknown[];
      conceptSummary?: string;
    };

    const aiTags: AITag[] = (parsed.tags ?? [])
      .filter((t): t is Record<string, unknown> => typeof t === "object" && t !== null)
      .filter(
        (t) =>
          typeof t.label === "string" &&
          typeof t.category === "string" &&
          VALID_CATEGORIES.has(t.category as TagCategory),
      )
      .map((t) => ({
        label: String(t.label).trim(),
        category: t.category as TagCategory,
        weight: typeof t.weight === "number" ? Math.min(1, Math.max(0, t.weight)) : 0.5,
      }))
      .filter((t) => t.label.length > 0)
      .slice(0, 5);

    const conceptSummary =
      typeof parsed.conceptSummary === "string" ? parsed.conceptSummary.trim() : "";

    if (aiTags.length === 0) return localFallbackTags(content);

    return { aiTags, conceptSummary: conceptSummary || localSummary(content) };
  } catch {
    return localFallbackTags(content);
  }
}

export async function summarizeNote(
  content: string,
  settings: AISettings,
): Promise<string> {
  if (!content.trim()) return "";

  if (!settings.apiKey) return localSummary(content);

  try {
    const response = await callAI(
      `Provide a concise 1-sentence summary of the following note. Return ONLY the summary sentence, nothing else.\n\nNote:\n${content}`,
      settings,
    );
    const trimmed = response.trim();
    return trimmed || localSummary(content);
  } catch {
    return localSummary(content);
  }
}

export async function findRelatedNotes(
  noteId: string,
  allNotes: Note[],
): Promise<RelatedNoteResult[]> {
  const current = allNotes.find((n) => n.id === noteId);
  if (!current) return [];

  const currentLocalTags = new Set(current.tags.map((t) => t.toLowerCase()));
  const currentAILabels = new Set((current.aiTags ?? []).map((t) => t.label.toLowerCase()));
  const currentCategories = new Set((current.aiTags ?? []).map((t) => t.category));

  const currentWords = new Set(
    extractKeywords(current.title + " " + current.content),
  );

  const scored = allNotes
    .filter((n) => n.id !== noteId)
    .map((note) => {
      let score = 0;
      const matchedLabels: string[] = [];

      const noteAITags = note.aiTags ?? [];
      for (const tag of noteAITags) {
        if (currentAILabels.has(tag.label.toLowerCase())) {
          score += 10;
          matchedLabels.push(tag.label);
        }
      }

      const noteCategories = new Set(noteAITags.map((t) => t.category));
      for (const cat of noteCategories) {
        if (currentCategories.has(cat)) {
          score += 5;
        }
      }

      for (const tag of note.tags) {
        if (currentLocalTags.has(tag.toLowerCase())) {
          score += 8;
          matchedLabels.push(tag);
        }
      }

      if (score === 0) {
        const noteWords = extractKeywords(note.title + " " + note.content);
        const overlap = noteWords.filter((w) => currentWords.has(w)).length;
        score = overlap;
        if (overlap > 0) {
          const shared = noteWords.filter((w) => currentWords.has(w)).slice(0, 3);
          matchedLabels.push(...shared);
        }
      }

      let reason: string;
      if (matchedLabels.length > 0) {
        const tags = matchedLabels.slice(0, 3).map((l) => `#${l}`).join(" and ");
        reason = `Both notes focus on ${tags}`;
      } else if (score > 0) {
        reason = "Shares similar keywords";
      } else {
        reason = "";
      }

      return { note, score, reason };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, 5);
}
