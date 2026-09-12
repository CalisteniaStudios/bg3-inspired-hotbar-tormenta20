import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("manifesto mantém Foundry 13 e verifica 14.367", async () => {
  const manifest = JSON.parse(await readFile(new URL("../module.json", import.meta.url), "utf8"));
  assert.equal(manifest.version, "0.4.5");
  assert.equal(manifest.compatibility.minimum, "13");
  assert.equal(manifest.compatibility.verified, "14.367");
  assert.equal(manifest.compatibility.maximum, "14");
});
