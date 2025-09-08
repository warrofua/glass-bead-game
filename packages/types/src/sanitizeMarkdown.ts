export function sanitizeMarkdown(input: string): string {
  if (typeof input !== "string") return "";
  // Remove script tags and their content
  let out = input.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "");
  // Enforce length cap of 10k characters
  if (out.length > 10_000) {
    out = out.slice(0, 10_000);
  }
  return out;
}
