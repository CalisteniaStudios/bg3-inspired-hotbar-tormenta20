import test from "node:test";
import assert from "node:assert/strict";

import {
  THEME_PRESETS,
  PORTRAIT_DEFAULTS,
  resolveAppearance,
  normalizePortraitTransform,
  normalizePortraitTransforms
} from "../scripts/t20/themes.js";

test("oferece o tema original e os cinco novos layouts", () => {
  assert.deepEqual(Object.keys(THEME_PRESETS), ["tormenta", "reliquary", "constellation", "arcane2", "steel", "grimoire", "custom"]);
  assert.equal(THEME_PRESETS.tormenta.label, "Original");
  for (const key of ["reliquary", "constellation", "arcane2", "steel", "grimoire"]) {
    assert.equal(resolveAppearance({ theme: key }).theme, key);
    assert.ok(THEME_PRESETS[key].description);
    assert.ok(THEME_PRESETS[key].icon);
  }
});

test("normaliza o enquadramento do retrato dentro dos limites", () => {
  assert.deepEqual(normalizePortraitTransform({ zoom: 2.25, x: 18, y: 74 }), { zoom: 2.25, x: 18, y: 74 });
  assert.deepEqual(normalizePortraitTransform({ zoom: 9, x: -20, y: 140 }), { zoom: 3, x: 0, y: 100 });
  assert.deepEqual(normalizePortraitTransform({ zoom: "inválido", x: null, y: undefined }), PORTRAIT_DEFAULTS);
});

test("mantém ajustes independentes para ficha e token", () => {
  const transforms = normalizePortraitTransforms({
    actor: { zoom: 1.5, x: 25, y: 60 },
    token: { zoom: 2, x: 80, y: 20 }
  });
  assert.deepEqual(transforms.actor, { zoom: 1.5, x: 25, y: 60 });
  assert.deepEqual(transforms.token, { zoom: 2, x: 80, y: 20 });
});
