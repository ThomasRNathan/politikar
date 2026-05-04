import { test, expect } from "@playwright/test";

test.describe("politikar platform mock", () => {
  test("home loads, demo banner visible, hero copy and France map render", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/politikar/);
    // Demo banner is mandatory per RISKS.md
    await expect(page.getByText(/Démo de design/i)).toBeVisible();
    // Hero
    await expect(
      page.getByRole("heading", { name: /véracité du discours politique/i })
    ).toBeVisible();
    // France hex map
    await expect(page.getByLabel(/Carte de France/i)).toBeVisible();
    // Search form
    await expect(page.getByPlaceholder(/Chercher un politique/i)).toBeVisible();
    // Top stories section
    await expect(page.getByText(/Top stories de la semaine/i)).toBeVisible();
    // Top 5 ranking section
    await expect(page.getByText(/Top 5 par véracité/i)).toBeVisible();
  });

  test("nav links to /politiciens and shows the annuaire", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Politiciens", exact: true }).click();
    await expect(page).toHaveURL(/\/politiciens$/);
    await expect(
      page.getByRole("heading", { name: /figures nationales suivies/i })
    ).toBeVisible();
    // 16 politicians from the fixture
    const cards = page.locator("a[href^='/politiciens/']");
    expect(await cards.count()).toBeGreaterThanOrEqual(16);
  });

  test("politician profile renders score, decomposition, claims", async ({ page }) => {
    await page.goto("/politiciens/emmanuel-macron");
    await expect(
      page.getByRole("heading", { name: "Emmanuel Macron" })
    ).toBeVisible();
    // Score badge label
    await expect(page.getByLabel(/TruthScore 64/i)).toBeVisible();
    // Confidence interval
    await expect(page.getByText(/IC95/i)).toBeVisible();
    // Decomposition section
    await expect(page.getByText(/Décomposition/i).first()).toBeVisible();
    await expect(page.getByText(/Factuel/i).first()).toBeVisible();
    await expect(page.getByText(/Promesses/i).first()).toBeVisible();
    await expect(page.getByText(/Transparence/i).first()).toBeVisible();
    // Topic breakdown
    await expect(page.getByText(/Par sujet/i)).toBeVisible();
    // Verdict distribution
    await expect(page.getByText(/Distribution des verdicts/i)).toBeVisible();
    // At least one claim row
    const claimLinks = page.locator("a[href^='/claims/']");
    expect(await claimLinks.count()).toBeGreaterThanOrEqual(1);
  });

  test("claim detail page renders verdict, reasoning, evidences", async ({ page }) => {
    await page.goto("/claims/c-001");
    // Verdict pill for c-001 is "mostly_true" → "Plutôt vrai"
    await expect(page.getByText("Plutôt vrai", { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Raisonnement" })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Sources et évidences/i })).toBeVisible();
    await expect(page.getByText(/INSEE/i).first()).toBeVisible();
    // Methodology note
    await expect(page.getByText(/qualifie le propos, jamais la personne/i)).toBeVisible();
  });

  test("partis page lists parties with aggregate scores", async ({ page }) => {
    await page.goto("/partis");
    await expect(page.getByRole("heading", { name: /Score moyen pondéré/i })).toBeVisible();
    await expect(page.getByText("Renaissance").first()).toBeVisible();
    await expect(page.getByText("Rassemblement national").first()).toBeVisible();
  });

  test("party detail page lists members", async ({ page }) => {
    await page.goto("/partis/renaissance");
    await expect(page.getByRole("heading", { name: "Renaissance" })).toBeVisible();
    await expect(page.getByText(/Membres suivis/i)).toBeVisible();
    // At least one card
    const cards = page.locator("a[href^='/politiciens/']");
    expect(await cards.count()).toBeGreaterThanOrEqual(1);
  });

  test("region page renders aggregate and members", async ({ page }) => {
    await page.goto("/regions/ile-de-france");
    await expect(
      page.getByRole("heading", { name: "Île-de-France" })
    ).toBeVisible();
  });

  test("methode page renders all six steps", async ({ page }) => {
    await page.goto("/methode");
    for (const step of ["Ingestion", "Extraction", "Cascade de vérification", "Revue humaine", "Scoring", "Publication"]) {
      await expect(page.getByRole("heading", { name: step })).toBeVisible();
    }
    await expect(page.getByText(/Garde-fous éditoriaux/i)).toBeVisible();
  });

  test("docs are still accessible at /docs", async ({ page }) => {
    await page.goto("/docs");
    await expect(page.getByRole("heading", { name: /Six documents/i })).toBeVisible();
    await page.getByRole("link", { name: /Architecture/i }).first().click();
    await expect(page).toHaveURL(/\/docs\/architecture/);
    // Page header heading (the one in the docs/[slug] layout) shows the doc label
    await expect(page.locator("header h1").filter({ hasText: "Architecture" })).toBeVisible();
  });

  test("demo banner visible on every page (RISKS.md compliance)", async ({ page }) => {
    for (const route of ["/", "/politiciens", "/partis", "/methode", "/docs", "/claims/c-001"]) {
      await page.goto(route);
      await expect(
        page.getByText(/Démo de design/i),
        `Demo banner missing on ${route}`
      ).toBeVisible();
    }
  });

  test("404 returns Next.js not-found for invalid politicians", async ({ page }) => {
    const res = await page.goto("/politiciens/this-does-not-exist", {
      waitUntil: "domcontentloaded",
    });
    expect(res?.status()).toBe(404);
  });

  test("homepage hex map regions are clickable and navigate to region pages", async ({
    page,
  }) => {
    await page.goto("/");
    // Click on the IDF region label inside the SVG
    await page
      .locator("svg[aria-label='Carte de France des scores moyens par région']")
      .getByText("IDF", { exact: true })
      .click();
    await expect(page).toHaveURL(/\/regions\/ile-de-france/);
  });
});
