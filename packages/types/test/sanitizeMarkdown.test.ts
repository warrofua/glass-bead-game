import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeMarkdown } from '../src/index.ts';

test('removes script tags', () => {
  const dirty = '<p>Hello<script>alert(1)</script></p>';
  const clean = sanitizeMarkdown(dirty);
  assert.equal(clean, '<p>Hello</p>');
});

test('strips event handlers from images', () => {
  const dirty = '<img src="x" onerror="alert(1)">';
  const clean = sanitizeMarkdown(dirty);
  assert.ok(!clean.includes('onerror'));
  assert.ok(clean.startsWith('<img'));
});

test('removes javascript URLs', () => {
  const dirty = '<a href="javascript:alert(1)">hi</a>';
  const clean = sanitizeMarkdown(dirty);
  assert.equal(clean, '<a>hi</a>');
});
