import test from "node:test";
import assert from "node:assert/strict";
import { sanitizeMarkdown } from "../src/sanitizeMarkdown";

test("removes script tags", () => {
  const input = "Hello<script>alert('x')</script>World";
  const output = sanitizeMarkdown(input);
  assert.strictEqual(output, "HelloWorld");
});

test("limits output to 10k characters", () => {
  const long = "a".repeat(10050);
  const output = sanitizeMarkdown(long);
  assert.strictEqual(output.length, 10_000);
});
