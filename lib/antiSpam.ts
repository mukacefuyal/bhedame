const urlPattern = /https?:\/\/[^\s]+/gi;
const repeatedCharPattern = /(.)\1{20,}/i;
const htmlScriptPattern = /<\s*(script|iframe|object|embed)\b/i;

function words(value: string) {
  return value.toLowerCase().match(/[a-z0-9']+/g) || [];
}

function hasLowWordVariety(value: string) {
  const tokens = words(value);
  if (tokens.length < 18) return false;
  const unique = new Set(tokens);
  return unique.size / tokens.length < 0.24;
}

function excessiveSameWord(value: string) {
  const tokens = words(value);
  if (tokens.length < 8) return false;
  const counts = new Map<string, number>();
  for (const token of tokens) counts.set(token, (counts.get(token) || 0) + 1);
  return Math.max(...counts.values()) >= Math.max(7, Math.ceil(tokens.length * 0.45));
}

export function validatePostContent(input: { title: string; caption: string; authorName: string; sourceUrl?: string | null }) {
  const combined = `${input.title}\n${input.caption}`.trim();
  const links = combined.match(urlPattern) || [];

  if (input.title.length < 2) return "Title is too short.";
  if (links.length > 3) return "Too many links in one post.";
  if (repeatedCharPattern.test(combined)) return "That post looks repetitive. Please clean it up and try again.";
  if (hasLowWordVariety(combined) || excessiveSameWord(combined)) return "That post looks like repeated/spam text.";
  if (htmlScriptPattern.test(combined)) return "Embedded HTML is not allowed in post text.";
  if (input.authorName && repeatedCharPattern.test(input.authorName)) return "Please use a normal display name.";

  return null;
}

export function validateCommentContent(text: string) {
  const links = text.match(urlPattern) || [];
  if (links.length > 2) return "Too many links in one comment.";
  if (repeatedCharPattern.test(text) || hasLowWordVariety(text) || excessiveSameWord(text)) {
    return "That comment looks like spam or repeated text.";
  }
  if (htmlScriptPattern.test(text)) return "Embedded HTML is not allowed in comments.";
  return null;
}
