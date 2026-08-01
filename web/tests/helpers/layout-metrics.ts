import { expect, type Locator, type Page } from "@playwright/test";

export const DESKTOP = { width: 1280, height: 800 };
export const TABLET = { width: 768, height: 1024 };
export const MOBILE = { width: 375, height: 667 };

export const VIEWPORTS = [
  { name: "desktop", size: DESKTOP },
  { name: "tablet", size: TABLET },
  { name: "mobile", size: MOBILE },
] as const;

/** Parse CSS pixel values (`16px`, `1px`) to numbers. */
export function parsePx(value: string): number {
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

export async function getComputed(
  locator: Locator,
  prop: keyof CSSStyleDeclaration,
): Promise<string> {
  return locator.evaluate(
    (el, p) => getComputedStyle(el)[p as keyof CSSStyleDeclaration] as string,
    prop,
  );
}

export async function assertBorderRadiusPx(
  locator: Locator,
  expected: number,
  tolerance = 1,
): Promise<void> {
  const radius = parsePx(await getComputed(locator, "borderTopLeftRadius"));
  expect(
    radius,
    `border-radius expected ~${expected}px, got ${radius}px`,
  ).toBeGreaterThanOrEqual(expected - tolerance);
  expect(radius).toBeLessThanOrEqual(expected + tolerance);
}

export async function assertBorderWidthPx(
  locator: Locator,
  expected: number,
  tolerance = 0.5,
): Promise<void> {
  const width = parsePx(await getComputed(locator, "borderTopWidth"));
  expect(
    width,
    `border-width expected ~${expected}px, got ${width}px`,
  ).toBeGreaterThanOrEqual(expected - tolerance);
  expect(width).toBeLessThanOrEqual(expected + tolerance);
}

export async function assertMinPaddingPx(
  locator: Locator,
  minPx: number,
): Promise<void> {
  const padding = await locator.evaluate((el) => {
    const s = getComputedStyle(el);
    return {
      top: Number.parseFloat(s.paddingTop),
      right: Number.parseFloat(s.paddingRight),
      bottom: Number.parseFloat(s.paddingBottom),
      left: Number.parseFloat(s.paddingLeft),
    };
  });
  const minSide = Math.min(
    padding.top,
    padding.right,
    padding.bottom,
    padding.left,
  );
  expect(
    minSide,
    `minimum padding expected >= ${minPx}px, got ${minSide}px`,
  ).toBeGreaterThanOrEqual(minPx);
}

export async function assertMinLineHeightPx(
  locator: Locator,
  minPx: number,
): Promise<void> {
  const lineHeight = parsePx(await getComputed(locator, "lineHeight"));
  expect(
    lineHeight,
    `line-height expected >= ${minPx}px, got ${lineHeight}px`,
  ).toBeGreaterThanOrEqual(minPx);
}

export async function assertFontWeightAtLeast(
  locator: Locator,
  minWeight: number,
): Promise<void> {
  const weight = await locator.evaluate((el) => {
    const w = getComputedStyle(el).fontWeight;
    return w === "bold" ? 700 : w === "normal" ? 400 : Number.parseInt(w, 10);
  });
  expect(
    weight,
    `font-weight expected >= ${minWeight}, got ${weight}`,
  ).toBeGreaterThanOrEqual(minWeight);
}

export async function assertVerticalCenterAligned(
  parent: Locator,
  childA: Locator,
  childB: Locator,
  tolerancePx = 3,
): Promise<void> {
  const [a, b] = await Promise.all([
    childA.boundingBox(),
    childB.boundingBox(),
  ]);
  expect(a).not.toBeNull();
  expect(b).not.toBeNull();
  const centerA = a!.y + a!.height / 2;
  const centerB = b!.y + b!.height / 2;
  expect(
    Math.abs(centerA - centerB),
    `vertical centers should align within ${tolerancePx}px`,
  ).toBeLessThanOrEqual(tolerancePx);

  const display = await getComputed(parent, "display");
  expect(display).toBe("flex");
  const alignItems = await getComputed(parent, "alignItems");
  expect(alignItems).toBe("center");
}

export async function assertNoHorizontalOverflow(page: Page): Promise<void> {
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    return doc.scrollWidth - doc.clientWidth;
  });
  expect(
    overflow,
    `horizontal overflow should be <= 2px, got ${overflow}px`,
  ).toBeLessThanOrEqual(2);
}

/** Stage a passage selection only (picker stays closed). */
export async function stageTextInPassage(page: Page): Promise<void> {
  await page.getByTestId("text-passage").evaluate((el) => {
    const range = document.createRange();
    const textNode = el.firstChild;
    if (textNode?.nodeType === Node.TEXT_NODE) {
      const text = textNode.textContent ?? "";
      const end = Math.min(48, text.length);
      range.setStart(textNode, 0);
      range.setEnd(textNode, end);
    } else {
      range.selectNodeContents(el);
      if (el.childNodes.length > 0) {
        range.setEnd(el, Math.min(1, el.childNodes.length));
      }
    }
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
    document.dispatchEvent(new Event("selectionchange"));
  });
  await page.waitForTimeout(200);
}

/** Second tap on staged selection - opens floating tag picker. */
export async function confirmPassageSelection(page: Page): Promise<void> {
  await page.waitForTimeout(400);
  await page.getByTestId("text-passage").dispatchEvent("pointerup");
  await page.waitForTimeout(100);
}

/** Stage + confirm (two-tap flow). */
export async function selectTextInPassage(page: Page): Promise<void> {
  await stageTextInPassage(page);
  await confirmPassageSelection(page);
}
