describe("Tiny Tummy Tauri smoke", () => {
  it("creates a child and reloads it from SQLite", async () => {
    const childName = `E2E ${Date.now()}`;

    const getStartedButton = await $("button=Get Started");
    await getStartedButton.waitForDisplayed({ timeout: 20000 });
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
