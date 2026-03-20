import { Note } from "@/types";

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Placeholder for a real LLM call.
 * Replace the body of this function with an actual API request
 * (e.g. OpenAI, DeepSeek) when ready — the rest of the app
 * consumes only generateTags / generateSummary / findRelatedNotes.
 */
export async function callAI(_prompt: string): Promise<string> {
  await delay(300 + Math.random() * 500);
  return "";
}

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

export async function generateTags(content: string): Promise<string[]> {
  await delay(300 + Math.random() * 500);
  if (!content.trim()) return [];
  return extractKeywords(content).slice(0, 5);
}

export async function generateSummary(content: string): Promise<string> {
  await delay(400 + Math.random() * 400);
  if (!content.trim()) return "";

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

export async function findRelatedNotes(
  noteId: string,
  allNotes: Note[],
): Promise<Note[]> {
  await delay(200 + Math.random() * 300);

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
