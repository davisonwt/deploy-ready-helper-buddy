import type { Page } from '@playwright/test';

/**
 * Wait for a sow form's cover photo to be ACCEPTED, not merely uploaded.
 *
 * CoverDropZone calls moderate-media after the storage PUT succeeds and fails
 * closed: any scanner error nulls the photo and shows an error under the
 * dropzone. The storage request still returns 200, so the network says
 * nothing is wrong while the form's `front` state is never set.
 *
 * On 2026-09-17 Sightengine's free-plan daily quota ran out mid-run and every
 * cover upload came back reason "scanner_error". The suite reported "submit
 * never enabled", which sent the investigation to the form for hours. Read the
 * dropzone's own error first so the next run names the real cause in one line.
 */
export async function waitForCoverAccepted(
  page: Page,
  /** The form's own "we still need a photo" copy. */
  stillAsking: string,
  timeoutMs = 60_000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const rejection = (await page.locator('p.text-destructive').allInnerTexts())
      .find((t) => /verify this|not accepted|must be an image/i.test(t));
    if (rejection) {
      throw new Error(
        `the cover photo was rejected, so the form is correctly incomplete: "${rejection}". `
        + 'If it mentions verifying, moderate-media returned scanner_error -- check the edge '
        + 'function logs for the Sightengine response (a daily-quota 400 looks exactly like this).',
      );
    }
    // The form stops naming the photo the moment the cover is accepted.
    if (!(await page.locator('body').innerText()).includes(stillAsking)) return;
    if (Date.now() > deadline) {
      throw new Error(`the cover photo never registered within ${Math.round(timeoutMs / 1000)}s`);
    }
    await page.waitForTimeout(1000);
  }
}
