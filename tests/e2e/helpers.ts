import { expect, type Page } from "@playwright/test";

/** Replaces the editor contents through Monaco's API (typing would trigger auto-closing brackets). */
export async function setCode(page: Page, code: string): Promise<void> {
  await page.waitForFunction(() => Boolean((window as unknown as { monaco?: unknown }).monaco));
  await page.waitForFunction(
    () => ((window as unknown as { monaco?: { editor: { getEditors: () => unknown[] } } }).monaco?.editor.getEditors().length ?? 0) > 0,
  );
  await page.evaluate((value) => {
    type Editor = { setValue: (v: string) => void };
    const monaco = (window as unknown as { monaco: { editor: { getEditors: () => Editor[] } } }).monaco;
    monaco.editor.getEditors()[0]?.setValue(value);
  }, code);
}

export async function visualize(page: Page): Promise<void> {
  await page.getByRole("button", { name: /^Visualize/ }).click();
  await expect(page.getByRole("status").filter({ hasText: "Compiling" })).toBeHidden({ timeout: 30_000 });
}

export async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
}
