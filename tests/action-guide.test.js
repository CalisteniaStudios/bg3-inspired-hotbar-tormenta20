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

test("ações laterais mantêm combate destacado e três utilitários iguais", async () => {
  const base = await readFile(new URL("../styles/t20-hotbar.css", import.meta.url), "utf8");
  const themes = await readFile(new URL("../styles/t20-layout-themes.css", import.meta.url), "utf8");

  assert.match(base, /grid-template-rows:\s*minmax\(52px, 1fr\) repeat\(3, var\(--bg3t20-utility-height\)\)/);
  assert.match(base, /\.bg3t20-side-actions \.bg3t20-end-turn\s*\{[^}]*grid-area:\s*1\s*\/\s*1\s*\/\s*2\s*\/\s*-1/s);
  assert.match(base, /\.bg3t20-side-actions \.bg3t20-guide-button\s*\{[^}]*grid-area:\s*2\s*\/\s*1\s*\/\s*3\s*\/\s*-1/s);
  assert.match(base, /\.bg3t20-side-actions \.bg3t20-rest\s*\{[^}]*grid-area:\s*3\s*\/\s*1\s*\/\s*4\s*\/\s*-1/s);
  assert.match(base, /\.bg3t20-side-actions \.bg3t20-settings-button\s*\{[^}]*grid-area:\s*4\s*\/\s*1\s*\/\s*5\s*\/\s*-1/s);

  for (const theme of ["reliquary", "constellation", "steel", "grimoire"]) {
    const selector = `#bg3t20-hud[data-theme="${theme}"] .bg3t20-side-actions`;
    const start = themes.indexOf(selector);
    assert.notEqual(start, -1, `tema ${theme} deve ajustar a coluna lateral`);
    assert.match(themes.slice(start, themes.indexOf("}", start) + 1), /--bg3t20-utility-height:/);
    assert.match(themes.slice(start, themes.indexOf("}", start) + 1), /grid-template-columns:\s*1fr/);
  }
});

test("filtros mantêm ícones e rótulos dentro de cada botão", async () => {
  const base = await readFile(new URL("../styles/t20-hotbar.css", import.meta.url), "utf8");

  assert.match(base, /grid-template-columns:\s*0\.78fr 1\.13fr 1\.08fr 0\.9fr 0\.7fr 0\.9fr 0\.92fr 0\.68fr 1\.38fr/);
  assert.match(base, /\.bg3t20-filters button\s*\{[^}]*overflow:\s*hidden/s);
  assert.match(base, /\.bg3t20-filters button span\s*\{[^}]*text-overflow:\s*ellipsis/s);
  assert.match(base, /button:is\(:nth-child\(2\), :nth-child\(3\), :nth-child\(9\)\)\s*\{[^}]*font-size:\s*9px/s);
});
