import assert from "node:assert/strict";
import test from "node:test";
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
