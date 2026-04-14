describe("Tiny Tummy Tauri smoke", () => {
  it("creates a child and reloads it from SQLite", async () => {
    const childName = `E2E ${Date.now()}`;

    // Wait for the Tauri WebView to have a meaningful DOM.
    // On CI the WebView may take several seconds to load the embedded frontend.
    await browser.waitUntil(
      async () => {
        const title = await browser.getTitle();
        return title.length > 0;
      },
      { timeout: 30000, timeoutMsg: "Tauri WebView did not report a page title within 30 s" },
    );

    // Wait for React to finish mounting — look for any <button> in the DOM.
    // If the app is stuck on the spinner or showing an error screen, this will
    // tell us via the page source dump below.
    const anyButton = await $("button");
    const buttonAppeared = await anyButton.waitForExist({ timeout: 45000 })
      .then(() => true)
      .catch(() => false);

    if (!buttonAppeared) {
      // Dump the page source so CI logs reveal what the app is actually showing.
      let source = "(could not capture)";
      try {
        source = await browser.getPageSource();
      } catch { /* ignore */ }
      throw new Error(
        `No <button> found in the DOM after 45 s. The app is likely stuck on the ` +
        `loading spinner or showing an error screen.\n\nPage source (first 4000 chars):\n${source.slice(0, 4000)}`,
      );
    }

    const getStartedButton = await $("button=Get Started");
    await getStartedButton.waitForDisplayed({ timeout: 10000 });
    await getStartedButton.click();

    const nameInput = await $("#child-name");
    await nameInput.waitForDisplayed({ timeout: 20000 });
    await nameInput.setValue(childName);

    const girlButton = await $("button=Girl");
    await girlButton.click();

    const submitButton = await $("button=Continue");
    await expect(submitButton).toBeEnabled();
    await submitButton.click();

    const startTrackingButton = await $("button=Start Tracking");
    await startTrackingButton.waitForDisplayed({ timeout: 20000 });
    await startTrackingButton.click();

    const settingsNavButton = await $("button[aria-label='Setting']");
    await settingsNavButton.waitForDisplayed({ timeout: 20000 });
    await settingsNavButton.click();

    const viewAllButton = await $("button=View All");
    await viewAllButton.waitForDisplayed({ timeout: 20000 });
    await viewAllButton.click();

    const createdChild = await $(`//*[normalize-space(text())='${childName}']`);
    await createdChild.waitForDisplayed({ timeout: 20000 });

    await browser.reloadSession();

    const settingsNavButtonAfterReload = await $("button[aria-label='Setting']");
    await settingsNavButtonAfterReload.waitForDisplayed({ timeout: 20000 });
    await settingsNavButtonAfterReload.click();

    const viewAllButtonAfterReload = await $("button=View All");
    await viewAllButtonAfterReload.waitForDisplayed({ timeout: 20000 });
    await viewAllButtonAfterReload.click();

    const createdChildAfterReload = await $(`//*[normalize-space(text())='${childName}']`);
    await createdChildAfterReload.waitForDisplayed({ timeout: 20000 });
    await expect(createdChildAfterReload).toHaveText(childName);
  });
});
