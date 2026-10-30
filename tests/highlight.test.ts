import { test } from "node:test";
import assert from "node:assert/strict";
import { tokenize } from "../src/lib/highlight.ts";

test("tokenize round-trips and classifies JSON", () => {
  const src = '// Payload\n{\n  "id": 42,\n  "name": "a:b",\n  "ok": true,\n  "n": -1.5e3\n}';
  const toks = tokenize(src);
  assert.equal(toks.map((t) => t[1]).join(""), src);
  const cls = (text: string) => toks.find((t) => t[1] === text)?.[0];
  assert.equal(cls("// Payload"), "tk-com");
  assert.equal(cls('"id"'), "tk-key");
  assert.equal(cls('"a:b"'), "tk-str");
  assert.equal(cls("42"), "tk-num");
  assert.equal(cls("-1.5e3"), "tk-num");
  assert.equal(cls("true"), "tk-num");
  assert.equal(cls("{"), "tk-p");
});
