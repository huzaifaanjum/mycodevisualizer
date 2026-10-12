import { expect, type Page } from "@playwright/test";

/** Replaces the editor contents through Monaco's API (typing would trigger auto-closing brackets). */
export async function setCode(page: Page, code: string): Promise<void> {
  await page.waitForFunction(() => Boolean((window as unknown as { monaco?: unknown }).monaco));
  await page.evaluate((value) => {
    const monaco = (window as unknown as { monaco: { editor: { getModels: () => { setValue: (v: string) => void }[] } } }).monaco;
    monaco.editor.getModels()[0]?.setValue(value);
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
