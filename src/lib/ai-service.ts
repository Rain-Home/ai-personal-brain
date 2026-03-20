import { Note } from "@/types";
import { AISettings } from "@/hooks/use-settings";

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

export function localGenerateTags(content: string): string[] {
  if (!content.trim()) return [];
  return extractKeywords(content).slice(0, 5);
}

export async function generateTags(
  content: string,
  settings: AISettings,
): Promise<string[]> {
  if (!content.trim()) return [];

  if (!settings.apiKey) return localGenerateTags(content);

  try {
    const response = await callAI(
      `Extract 3-5 keywords/tags from the following note. Return ONLY a JSON array of lowercase strings, no explanation.\n\nNote:\n${content}`,
      settings,
    );

    const match = response.match(/\[[\s\S]*?\]/);
    if (match) {
      const tags = JSON.parse(match[0]) as string[];
      return tags
        .filter((t): t is string => typeof t === "string")
        .map((t) => t.toLowerCase().trim())
        .filter((t) => t.length > 0)
        .slice(0, 5);
    }
    return localGenerateTags(content);
  } catch {
    return localGenerateTags(content);
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
): Promise<Note[]> {
  const current = allNotes.find((n) => n.id === noteId);
  if (!current) return [];

  const currentWords = new Set(
    extractKeywords(current.title + " " + current.content),
  );

  const scored = allNotes
    .filter((n) => n.id !== noteId)
    .map((note) => {
      const noteWords = extractKeywords(note.title + " " + note.content);
      const overlap = noteWords.filter((w) => currentWords.has(w)).length;
      return { note, score: overlap };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, 3).map((s) => s.note);
}
