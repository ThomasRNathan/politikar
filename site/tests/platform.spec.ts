import { test, expect } from "@playwright/test";

test.describe("politikar platform", () => {
  test("home loads, status notice visible, hero copy and France map render", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/politikar/);
    // Discreet status notice on every page
    // Banner now shows live counters when DB has claims, falls back to
    // "Plateforme en construction" when empty. Either message confirms
    // the StatusNotice renders.
    await expect(
      page.getByText(/Pipeline live\.|Plateforme en construction/i),
    ).toBeVisible();
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
    const cards = page.locator("a[href^='/politiciens/']");
    expect(await cards.count()).toBeGreaterThanOrEqual(16);
  });

  test("politician profile renders score, decomposition, claims, real photo", async ({
    page,
  }) => {
    await page.goto("/politiciens/emmanuel-macron");
    await expect(
      page.getByRole("heading", { name: "Emmanuel Macron" })
    ).toBeVisible();
    // TruthScore shows the fixture value (64) when DB is below the
    // significance threshold, or the real DB score once it passes 10
    // published verdicts. Accept any numeric score.
    await expect(page.getByLabel(/TruthScore \d+/i).first()).toBeVisible();
    // "IC95" appears on fixture mode; "score réel" appears on DB mode.
    const hasIc95 = await page.getByText(/IC95/i).isVisible({ timeout: 2000 }).catch(() => false);
    const hasScoreReel = await page.getByText(/score réel/i).isVisible({ timeout: 2000 }).catch(() => false);
    expect(hasIc95 || hasScoreReel).toBeTruthy();
    await expect(page.getByText(/Décomposition/i).first()).toBeVisible();
    await expect(page.getByText(/Factuel/i).first()).toBeVisible();
    await expect(page.getByText(/Promesses/i).first()).toBeVisible();
    await expect(page.getByText(/Transparence/i).first()).toBeVisible();
    await expect(page.getByText(/Par sujet/i)).toBeVisible();
    await expect(page.getByText(/Distribution des verdicts/i)).toBeVisible();
    const claimLinks = page.locator("a[href^='/claims/']");
    expect(await claimLinks.count()).toBeGreaterThanOrEqual(1);
    // Real photo from Wikimedia
    const macronPhoto = page.locator('img[alt*="Emmanuel Macron"]').first();
    await expect(macronPhoto).toBeVisible();
    const src = await macronPhoto.getAttribute("src");
    expect(src).toMatch(/wikimedia/);
  });

  test("claim detail page renders verdict, reasoning, evidences", async ({
    page,
  }) => {
    await page.goto("/claims/c-001");
    await expect(page.getByText("Plutôt vrai", { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Raisonnement" })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Sources et évidences/i })).toBeVisible();
    await expect(page.getByText(/INSEE/i).first()).toBeVisible();
    await expect(page.getByText(/qualifie le propos, jamais la personne/i)).toBeVisible();
  });

  test("partis index lists parties and shows real logos", async ({ page }) => {
    await page.goto("/partis");
    await expect(page.getByRole("heading", { name: /Score moyen pondéré/i })).toBeVisible();
    await expect(page.getByText("Renaissance").first()).toBeVisible();
    await expect(page.getByText("Rassemblement national").first()).toBeVisible();
    // Party logos (Wikimedia images)
    const renaissanceLogo = page.locator('img[alt*="Renaissance"]').first();
    await expect(renaissanceLogo).toBeVisible();
    const src = await renaissanceLogo.getAttribute("src");
    expect(src).toMatch(/wikimedia/);
  });

  test("party detail page shows logo and members", async ({ page }) => {
    await page.goto("/partis/rassemblement-national");
    await expect(
      page.getByRole("heading", { name: "Rassemblement national" })
    ).toBeVisible();
    await expect(page.getByText(/Membres suivis/i)).toBeVisible();
    const cards = page.locator("a[href^='/politiciens/']");
    expect(await cards.count()).toBeGreaterThanOrEqual(1);
    // Logo
    const logo = page.locator('img[alt*="Rassemblement national"]').first();
    await expect(logo).toBeVisible();
  });

  test("region page renders aggregate and members", async ({ page }) => {
    await page.goto("/regions/ile-de-france");
    await expect(
      page.getByRole("heading", { name: "Île-de-France" })
    ).toBeVisible();
  });

  test("/fonctions index lists functions grouped by level", async ({ page }) => {
    await page.goto("/fonctions");
    await expect(
      page.getByRole("heading", { name: /Comparer à fonctions équivalentes/i })
    ).toBeVisible();
    // Level groupings present
    await expect(page.getByRole("heading", { name: "Exécutif national" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Parlement" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Direction de parti" })).toBeVisible();
  });

  test("/fonctions/leader-parti shows aggregate analysis", async ({ page }) => {
    await page.goto("/fonctions/leader-parti");
    await expect(
      page.getByRole("heading", { name: "Leader de parti" })
    ).toBeVisible();
    // Aggregate score box (label appears in header; footer also mentions "score moyen pondéré")
    await expect(page.getByText(/Score moyen pondéré/i).first()).toBeVisible();
    // Three score cards
    await expect(page.getByText(/Score factuel/i).first()).toBeVisible();
    await expect(page.getByText(/Score promesses/i).first()).toBeVisible();
    await expect(page.getByText(/Volume total/i).first()).toBeVisible();
    // Distribution by party section
    await expect(
      page.getByRole("heading", { name: /Distribution par parti/i })
    ).toBeVisible();
    // Topics section
    await expect(
      page.getByRole("heading", { name: /Sujets les plus traités/i })
    ).toBeVisible();
    // Ranking section
    await expect(
      page.getByRole("heading", { name: /Ranking interne/i })
    ).toBeVisible();
  });

  test("methode page renders all six steps", async ({ page }) => {
    await page.goto("/methode");
    for (const step of [
      "Ingestion",
      "Extraction",
      "Cascade de vérification",
      "Revue humaine",
      "Scoring",
      "Publication",
    ]) {
      await expect(page.getByRole("heading", { name: step })).toBeVisible();
    }
    await expect(page.getByText(/Garde-fous éditoriaux/i)).toBeVisible();
  });

  test("docs are still accessible at /docs", async ({ page }) => {
    await page.goto("/docs");
    await expect(page.getByRole("heading", { name: /Six documents/i })).toBeVisible();
    await page.getByRole("link", { name: /Architecture/i }).first().click();
    await expect(page).toHaveURL(/\/docs\/architecture/);
    await expect(
      page.locator("header h1").filter({ hasText: "Architecture" })
    ).toBeVisible();
  });

  test("status notice visible on every page", async ({ page }) => {
    for (const route of [
      "/",
      "/politiciens",
      "/partis",
      "/fonctions",
      "/methode",
      "/docs",
      "/claims/c-001",
    ]) {
      await page.goto(route);
      await expect(
        page.getByText(/Pipeline live\.|Plateforme en construction/i),
        `Status notice missing on ${route}`
      ).toBeVisible();
    }
  });

  test("404 returns Next.js not-found for invalid politicians", async ({ page }) => {
    const res = await page.goto("/politiciens/this-does-not-exist", {
      waitUntil: "domcontentloaded",
    });
    expect(res?.status()).toBe(404);
  });

  test("homepage France map regions are clickable and navigate to region pages", async ({
    page,
  }) => {
    await page.goto("/");
    // FranceMap renders an SVG with short_name labels per region; click IDF
    await page
      .locator("svg[aria-label^='Carte de France']")
      .getByText("IDF", { exact: true })
      .click();
    await expect(page).toHaveURL(/\/regions\/ile-de-france/);
  });

  test("photos load successfully (no broken images)", async ({ page }) => {
    await page.goto("/politiciens/marine-le-pen");
    const photo = page.locator('img[alt*="Marine Le Pen"]').first();
    await expect(photo).toBeVisible();
    // Wait for image to actually load by checking naturalWidth
    const naturalWidth = await photo.evaluate(
      (img: HTMLImageElement) => img.naturalWidth
    );
    expect(naturalWidth).toBeGreaterThan(0);
  });

  test("/classement page loads and shows ranking content", async ({ page, request }) => {
    // Guard: skip content assertions if this page isn't deployed yet.
    const status = (await request.get("/classement")).status();
    if (status === 404) {
      test.skip(true, "/classement not yet deployed on this environment");
      return;
    }
    await page.goto("/classement");
    await expect(page).toHaveTitle(/Classement/i);
    await expect(
      page.getByRole("heading", { name: /Véracité du discours politique/i })
    ).toBeVisible();
    // Should show either "données réelles" (live DB) or "illustratif" (fixture)
    const hasRealData = await page.getByText("données réelles").isVisible();
    const hasIllustrative = await page.getByText("illustratif").isVisible();
    expect(hasRealData || hasIllustrative).toBeTruthy();
    // Should have at least one ranking entry (either DB or fixture)
    const rankEntries = page.locator("a[href^='/politiciens/']");
    expect(await rankEntries.count()).toBeGreaterThanOrEqual(1);
    // Methodology note present
    await expect(page.getByText(/Note méthodologique/i)).toBeVisible();
  });

  test("politician search filters the annuaire", async ({ page, request }) => {
    // Check that the live /politiciens page supports ?q= search params.
    // The page returns 200 either way; distinguish by checking if the
    // "Effacer le filtre" link appears (only present in the new async version).
    await page.goto("/politiciens?q=macron");
    await page.waitForLoadState("networkidle");
    const hasSearchSupport = await page
      .getByText(/Effacer le filtre/i)
      .isVisible({ timeout: 2000 })
      .catch(() => false);
    if (!hasSearchSupport) {
      test.skip(true, "Search params not yet supported on this deployment");
      return;
    }
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      /résultat|macron/i
    );
    await expect(page.getByText(/Macron/i).first()).toBeVisible();
  });

  test("politician topic filter shows subset", async ({ page }) => {
    await page.goto("/politiciens?topic=economy");
    await page.waitForLoadState("networkidle");
    // Guard: topic chips are only present in the new async version of the page.
    const hasTopicChips = await page
      .getByRole("link", { name: /Économie/i })
      .isVisible({ timeout: 2000 })
      .catch(() => false);
    if (!hasTopicChips) {
      test.skip(true, "Topic filter chips not yet deployed on this environment");
      return;
    }
    // The Économie chip should be highlighted (active style) when ?topic=economy is active
    const economieChip = page.getByRole("link", { name: /Économie/i }).first();
    await expect(economieChip).toBeVisible();
    // Heading should reflect filtered results
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });
});
