import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { ACTION_GUIDE_CATEGORIES, ACTION_GUIDE_URL, getActionGuideCategory } from "../scripts/t20/action-guide.js";

test("guia reúne os quatro tipos de ação sem categorias duplicadas", () => {
  assert.deepEqual(ACTION_GUIDE_CATEGORIES.map(({ id }) => id), ["standard", "movement", "full", "free"]);
  assert.ok(ACTION_GUIDE_CATEGORIES.every(({ actions }) => actions.length > 0));
  assert.equal(new Set(ACTION_GUIDE_CATEGORIES.map(({ id }) => id)).size, ACTION_GUIDE_CATEGORIES.length);
});

test("guia mantém categoria padrão e referência completa", () => {
  assert.equal(getActionGuideCategory("unknown").id, "standard");
  assert.equal(ACTION_GUIDE_URL, "https://referencet20.vercel.app/");
});

test("botão do guia compartilha a linha da iniciativa sem aumentar as HUDs", async () => {
  const base = await readFile(new URL("../styles/t20-hotbar.css", import.meta.url), "utf8");
  const themes = await readFile(new URL("../styles/t20-layout-themes.css", import.meta.url), "utf8");

  assert.match(base, /\.bg3t20-side-actions \.bg3t20-end-turn\s*\{[^}]*grid-area:\s*1\s*\/\s*1/s);
  assert.match(base, /\.bg3t20-side-actions \.bg3t20-guide-button\s*\{[^}]*grid-area:\s*1\s*\/\s*1/s);

  for (const theme of ["reliquary", "constellation", "steel", "grimoire"]) {
    const selector = `#bg3t20-hud[data-theme="${theme}"] .bg3t20-side-actions .bg3t20-guide-button`;
    const start = themes.indexOf(selector);
    assert.notEqual(start, -1, `tema ${theme} deve ajustar o botão Guia`);
    assert.match(themes.slice(start, themes.indexOf("}", start) + 1), /grid-area:\s*1\s*\/\s*1\s*\/\s*2\s*\/\s*-1/);
  }
});
