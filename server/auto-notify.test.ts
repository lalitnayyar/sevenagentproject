/**
 * Test: autoNotify procedure
 * Validates that PUSHOVER_USER and PUSHOVER_TOKEN env vars are set and
 * that the autoNotify tRPC procedure can deliver a real Pushover notification.
 */
import { describe, it, expect } from "vitest";

describe("autoNotify — server-side Pushover delivery", () => {
  it("should have PUSHOVER_USER env var set", () => {
    expect(process.env.PUSHOVER_USER).toBeTruthy();
    expect(process.env.PUSHOVER_USER!.length).toBeGreaterThan(10);
  });

  it("should have PUSHOVER_TOKEN env var set", () => {
    expect(process.env.PUSHOVER_TOKEN).toBeTruthy();
    expect(process.env.PUSHOVER_TOKEN!.length).toBeGreaterThan(10);
  });

  it("should deliver a real Pushover notification using env credentials", async () => {
    const user  = process.env.PUSHOVER_USER!;
    const token = process.env.PUSHOVER_TOKEN!;

    const body = new URLSearchParams({
      token,
      user,
      title: "7-Agent Auto-Notify Test",
      message: "✅ autoNotify vitest — server env credentials confirmed working",
      sound: "cashregister",
      priority: "0",
    });

    const res = await fetch("https://api.pushover.net/1/messages.json", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    const data = await res.json() as Record<string, unknown>;
    expect(res.ok).toBe(true);
    expect(data.status).toBe(1);
  }, 15_000); // 15s timeout for network call
});
