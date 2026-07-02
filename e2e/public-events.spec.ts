import { test, expect } from "@playwright/test";

// Regression guard: /r/events reads the ICS URL from app_settings, whose RLS
// only grants SELECT to authenticated users. If the public route uses the
// cookie-bound client instead of the admin client, anonymous visitors get an
// empty page while logged-in users see events. This test hits the page with a
// fresh (unauthenticated) context and asserts events render.
//
// ponytail: data-dependent — goes green falsely if nothing is scheduled. Run
// against a preview/prod where at least one upcoming event with a public flyer
// exists. Upgrade to an anon-vs-authed count comparison if false greens bite.
test("public events page shows events to anonymous visitors", async ({
  page,
}) => {
  await page.goto("/r/events");

  await expect(
    page.getByRole("heading", { name: "Upcoming Events" }),
  ).toBeVisible();

  // The empty state and the grid are mutually exclusive. The bug renders the
  // empty state for anon users, so assert we did NOT fall into it.
  await expect(page.getByText("No upcoming events right now")).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: /register|view flyer/i }).first(),
  ).toBeVisible();
});
