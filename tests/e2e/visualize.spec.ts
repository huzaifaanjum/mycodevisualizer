import { expect, test } from "@playwright/test";
import { expectNoHorizontalOverflow, setCode, visualize } from "./helpers";

test.describe("visualizer", () => {
  test("runs the starter program step by step", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("code-editor").locator(".monaco-editor")).toBeVisible({ timeout: 30_000 });
    await visualize(page);

    await expect(page.getByText("The program starts in main()")).toBeVisible();
    await expect(page.getByText(/^Step 1 of \d+$/)).toBeVisible();
    await expect(page.getByRole("region", { name: "main frame" })).toBeVisible();

    await page.keyboard.press("ArrowRight");
    await expect(page.getByText(/^Step 2 of \d+$/)).toBeVisible();
    await page.keyboard.press("ArrowLeft");
    await expect(page.getByText(/^Step 1 of \d+$/)).toBeVisible();

    await page.keyboard.press("End");
    await expect(page.getByText(/The program finished/)).toBeVisible();
    await expect(page.getByLabel("Program output")).toContainText("4! = 24");
    await expectNoHorizontalOverflow(page);
  });

  test("shows the recursion tree with return values", async ({ page }) => {
    await page.goto("/");
    await visualize(page);
    await page.keyboard.press("End");
    await page.getByRole("tab", { name: "Call tree" }).click();
    const tree = page.getByRole("group", { name: "Call tree diagram" });
    await expect(tree.getByRole("button", { name: /^Call 2: factorial\(n = 4\), finished, → 24$/ })).toBeVisible();
    await expect(page.getByText(/calls so far/i)).toBeVisible();

    // Outline layout lists the same calls as an accessible tree.
    await page.getByRole("radio", { name: "Outline" }).click();
    await expect(page.getByRole("tree", { name: "Call outline" })).toContainText("factorial(n = 1)");
  });

  test("clicking a call jumps to the step where it started", async ({ page }) => {
    await page.goto("/");
    await visualize(page);
    await page.keyboard.press("End");
    await page.getByRole("tab", { name: "Call tree" }).click();
    await page.getByRole("button", { name: /^Call 3: factorial\(n = 3\)/ }).click();
    await expect(page.getByRole("button", { name: /^Call 3: factorial\(n = 3\), running now/ })).toBeVisible();
    await expect(page.getByText(/^Step \d+ of \d+$/)).not.toHaveText(/^Step 1 of/);
  });

  test("keeps the final memory state after the program ends", async ({ page }) => {
    await page.goto("/?example=array-sum");
    await expect(page.getByText(/^Step 1 of \d+$/)).toBeVisible({ timeout: 30_000 });
    await page.keyboard.press("End");
    await expect(page.getByText(/Program finished\. This is the final state of memory/)).toBeVisible();
    await expect(page.getByRole("region", { name: "main frame" })).toBeVisible();
  });

  test("editing code keeps the last run until Clear is pressed", async ({ page }) => {
    await page.goto("/");
    await visualize(page);
    await page.keyboard.press("End");
    await page.getByRole("button", { name: "Edit code" }).click();
    await expect(page.getByText("Showing your last run.")).toBeVisible();
    await expect(page.getByLabel("Program output")).toContainText("4! = 24");
    await expect(page.getByRole("button", { name: /^Visualize/ })).toBeVisible();

    await page.getByRole("button", { name: "Clear visualization" }).click();
    await expect(page.getByLabel("Program output")).toBeHidden();
    await expect(page.getByText("Showing your last run.")).toBeHidden();
  });

  test("draws a reference arrow from an array variable to the heap", async ({ page }) => {
    await page.goto("/?example=array-aliasing");
    await expect(page.getByText(/^Step 1 of \d+$/)).toBeVisible({ timeout: 30_000 });
    await page.keyboard.press("End");
    await page.keyboard.press("ArrowLeft");
    await expect(page.locator("[data-heap-id]").first()).toBeVisible();
    await expect(page.locator("[data-heap-id] figcaption").first()).toContainText("original = alias");
    await expect(page.locator("svg path[marker-end]").first()).toBeAttached();
  });

  test("shows collection contents and highlights what changed", async ({ page }) => {
    await page.goto("/?example=arraylist-basics");
    await expect(page.getByText(/^Step 1 of \d+$/)).toBeVisible({ timeout: 30_000 });
    // Step to just after shopping.add(1, "apples").
    for (let i = 0; i < 5; i++) await page.keyboard.press("ArrowRight");
    await expect(page.getByText('"apples" was added to shopping at index 1. shopping now has 4 elements.')).toBeVisible();
    const list = page.locator("figure", { hasText: "ArrayList" });
    await expect(list).toContainText("size 4");
    await expect(list.locator("figcaption")).toContainText("shopping");
    await expect(list.getByText("(added)")).toHaveCount(1);
    await page.keyboard.press("ArrowRight");
    await expect(page.getByText('shopping[0] was replaced: "milk" → "oat milk".')).toBeVisible();
    await page.keyboard.press("ArrowRight");
    await expect(list.getByText("(removed)")).toHaveCount(1);
    await expectNoHorizontalOverflow(page);
  });

  test("shows a map as a key-value table with updated values", async ({ page }) => {
    await page.goto("/?example=treemap-grades");
    await expect(page.getByText(/^Step 1 of \d+$/)).toBeVisible({ timeout: 30_000 });
    for (let i = 0; i < 5; i++) await page.keyboard.press("ArrowRight");
    await expect(page.getByText('grades: the value for "Ali" changed from 92 to 95.')).toBeVisible();
    const table = page.locator("figure", { hasText: "TreeMap" });
    await expect(table).toContainText("sorted by key");
    await expect(table.locator("figcaption")).toContainText("grades");
    await expect(table.getByRole("row")).toHaveCount(4);
  });

  test("automated mode plays on its own and can be paused", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("radio", { name: "Automated" }).click();
    await visualize(page);
    await expect(page.getByText(/^Step [3-9] of \d+$/)).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: "Pause" }).click();
    await expect(page.getByRole("button", { name: "Play" })).toBeVisible();
  });

  test("explains compile errors with line numbers", async ({ page }) => {
    await page.goto("/");
    await setCode(page, 'public class Broken {\n    public static void main(String[] args) {\n        int x = "hello";\n    }\n}\n');
    await visualize(page);
    await expect(page.getByText("The code didn't compile")).toBeVisible();
    await expect(page.getByRole("button", { name: /Line 3, column/ })).toBeVisible();
    await expect(page.getByText("A String value can't be stored in an int variable.")).toBeVisible();
  });

  test("explains runtime exceptions", async ({ page }) => {
    await page.goto("/");
    await setCode(
      page,
      'public class OutOfBounds {\n    public static void main(String[] args) {\n        int[] a = new int[2];\n        System.out.println("before");\n        a[5] = 1;\n        System.out.println("after");\n    }\n}\n',
    );
    await visualize(page);
    await page.keyboard.press("End");
    await expect(page.getByRole("alert").filter({ hasText: "ArrayIndexOutOfBoundsException on line 5" })).toBeVisible();
    await expect(page.getByRole("alert").getByText(/Valid indexes are 0 to 1\./)).toBeVisible();
  });

  test("rejects unsupported features with a friendly message", async ({ page }) => {
    await page.goto("/");
    await setCode(page, "public class Main {\n    public static void main(String[] a) {\n        new Thread(() -> {}).start();\n    }\n}\n");
    await page.getByRole("button", { name: /^Visualize/ }).click();
    await expect(page.getByText("Not supported yet")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/Line 3: Threads aren't supported/)).toBeVisible();
  });
});

test.describe("flow, layout and full screen", () => {
  test("flow tab shows the path this run took with counts", async ({ page }) => {
    await page.goto("/?example=array-sum");
    await expect(page.getByText(/^Step 1 of \d+$/)).toBeVisible({ timeout: 30_000 });
    await page.keyboard.press("End");
    await page.getByRole("tab", { name: "Flow" }).click();
    const flow = page.getByRole("region", { name: "Flow of main" });
    await expect(flow).toBeVisible();
    await expect(flow).toContainText("for (int i = 0; i < nums.length; i++)");
    await expect(flow.getByRole("button", { name: /^loop: for \(int i = 0; i < nums\.length; i\+\+\), line \d+ · ran 5 of 5 times$/ })).toBeVisible();
    await expect(flow).toContainText("true ×4");
    await expect(page.getByText("How to read this flowchart")).toBeVisible();
    await expect(flow.locator("svg path[marker-end]").first()).toBeAttached();
  });

  test("flow tab follows recursion into each method", async ({ page }) => {
    await page.goto("/?example=factorial-recursion");
    await expect(page.getByText(/^Step 1 of \d+$/)).toBeVisible({ timeout: 30_000 });
    await page.keyboard.press("End");
    await page.getByRole("tab", { name: "Flow" }).click();
    await expect(page.getByRole("region", { name: "Flow of factorial" })).toContainText("called 4 of 4 times");
  });

  test("clicking a flowchart box jumps to when that line runs", async ({ page }) => {
    await page.goto("/?example=array-sum");
    await expect(page.getByText(/^Step 1 of \d+$/)).toBeVisible({ timeout: 30_000 });
    await page.getByRole("tab", { name: "Flow" }).click();
    await page.getByRole("button", { name: /^loop: for/ }).click();
    await expect(page.getByText(/^Step 1 of \d+$/)).toBeHidden();
    await expect(page.getByRole("button", { name: /^loop: for .* · ran 1 of 5 times$/ })).toBeVisible();
  });

  test("code panel can be resized with the keyboard and remembers its width", async ({ page, isMobile }) => {
    test.skip(isMobile, "The divider only exists on wide screens");
    await page.goto("/");
    const handle = page.getByRole("separator", { name: "Resize code panel" });
    await expect(handle).toHaveAttribute("aria-valuenow", "45");
    await handle.focus();
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("ArrowLeft");
    await expect(handle).toHaveAttribute("aria-valuenow", "41");
    await page.keyboard.press("Home");
    await expect(handle).toHaveAttribute("aria-valuenow", "20");
    await page.reload();
    await expect(page.getByRole("separator", { name: "Resize code panel" })).toHaveAttribute("aria-valuenow", "20");
    await page.getByRole("separator", { name: "Resize code panel" }).dblclick();
    await expect(page.getByRole("separator", { name: "Resize code panel" })).toHaveAttribute("aria-valuenow", "45");
  });

  test("visualization can go full screen and back", async ({ page }) => {
    await page.goto("/");
    await visualize(page);
    const panel = page.getByRole("region", { name: "Visualization" });
    await page.getByRole("button", { name: "Full screen" }).click();
    await expect(panel).toHaveClass(/fixed/);
    await expect(page.getByText(/line \d+/).first()).toBeVisible();
    await page.keyboard.press("ArrowRight");
    await expect(page.getByText(/^Step 2 of \d+$/)).toBeVisible();
    await page.getByRole("button", { name: "Exit full screen" }).click();
    await expect(panel).not.toHaveClass(/fixed/);
    await page.keyboard.press("f");
    await expect(panel).toHaveClass(/fixed/);
    await page.keyboard.press("Escape");
    await expect(panel).not.toHaveClass(/fixed/);
  });
});

test.describe("site", () => {
  test("examples page filters and opens an example", async ({ page }) => {
    await page.goto("/examples");
    await page.getByRole("radio", { name: "Recursion" }).click();
    await expect(page.getByRole("link", { name: /Factorial with recursion/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Count with a for loop/ })).toHaveCount(0);
    await page.getByRole("link", { name: /Fibonacci call tree/ }).click();
    await expect(page).toHaveURL(/example=fibonacci-recursion/);
    await expect(page.getByText(/^Step 1 of \d+$/)).toBeVisible({ timeout: 30_000 });
    await expectNoHorizontalOverflow(page);
  });

  test("accent color can be changed and is remembered", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-accent", "green");
    await page.getByRole("button", { name: /Accent color/ }).click();
    await page.getByRole("menuitemradio", { name: "Violet" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-accent", "violet");
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-accent", "violet");
  });

  test("sends security headers", async ({ request }) => {
    const res = await request.get("/");
    const headers = res.headers();
    expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["x-powered-by"]).toBeUndefined();
  });

  test("API rejects cross-origin and oversized requests", async ({ request }) => {
    const cross = await request.post("/api/runs", {
      headers: { origin: "https://evil.example", "content-type": "application/json" },
      data: { language: "java", code: "x", stdin: "" },
    });
    expect(cross.status()).toBe(403);
    const huge = await request.post("/api/runs", { data: { language: "java", code: "x".repeat(200_000), stdin: "" } });
    expect(huge.status()).toBe(413);
  });
});
