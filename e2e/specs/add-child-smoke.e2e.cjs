describe("Tiny Tummy Tauri smoke", () => {
  it("creates a child and reloads it from SQLite", async () => {
    const childName = `E2E ${Date.now()}`;

    await browser.url("/");

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

    await browser.waitUntil(
      async () => (await browser.getUrl()).endsWith("/"),
      {
        timeout: 20000,
        timeoutMsg: "Expected to return to the home route after onboarding.",
      },
    );

    await browser.url("/all-kids");

    const createdChild = await $(`//*[normalize-space(text())='${childName}']`);
    await createdChild.waitForDisplayed({ timeout: 20000 });

    await browser.refresh();

    const createdChildAfterReload = await $(`//*[normalize-space(text())='${childName}']`);
    await createdChildAfterReload.waitForDisplayed({ timeout: 20000 });
    await expect(createdChildAfterReload).toHaveText(childName);
  });
});
