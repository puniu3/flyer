import assert from "node:assert/strict";
import test from "node:test";
import { makeLayout, ABILITY } from "../src/layout";

const equal = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-9, `${a} != ${b}`);
test("sheet edges and tray follow a shared grid", () => {
  const l = makeLayout();
  const d = l.dungeon;
  const first = l.abilities[0];
  const last = l.abilities[2];
  equal(d.z - d.depth / 2, first.z - first.depth / 2);
  equal(first.x - first.width / 2 - (d.x + d.width / 2), ABILITY.gap);
  const trayLeft = l.tray.x - l.tray.width / 2 - l.tray.railWidth;
  const trayRight = l.tray.x + l.tray.width / 2 + l.tray.railWidth;
  const trayTop = l.tray.z - l.tray.depth / 2 - l.tray.railWidth;
  const trayBottom = l.tray.z + l.tray.depth / 2 + l.tray.railWidth;
  equal(trayLeft, first.x - first.width / 2);
  equal(trayRight, last.x + last.width / 2);
  equal(trayBottom, d.z + d.depth / 2);
  equal(trayTop - (first.z + first.depth / 2), ABILITY.gap);
});
