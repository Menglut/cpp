import { describe, expect, it } from "vitest";
import { validateEnvironment } from "./environment";

describe("validateEnvironment", () => {
  it("applies safe development defaults", () => {
    const result = validateEnvironment({
      DATABASE_URL: "postgresql://user:password@127.0.0.1:5432/cppstudy",
    });
    expect(result.API_PORT).toBe(3001);
    expect(result.WEB_ORIGIN).toBe("http://127.0.0.1:3000");
    expect(result.SESSION_IDLE_TTL_SECONDS).toBe(86400);
  });

  it("rejects a missing database URL", () => {
    expect(() => validateEnvironment({})).toThrow(/DATABASE_URL/);
  });

  it("rejects an invalid web origin", () => {
    expect(() =>
      validateEnvironment({ DATABASE_URL: "postgresql://local", WEB_ORIGIN: "not-a-url" }),
    ).toThrow(/WEB_ORIGIN/);
  });
});
