import { describe, expect, it } from "vitest";
import { z } from "zod";
import { formatZodErrors, isRecord } from "./validation-helpers";

describe("validation-helpers", () => {
  describe("isRecord", () => {
    it("returns true for non-null, non-array plain objects", () => {
      expect(isRecord({})).toBe(true);
      expect(isRecord({ foo: "bar" })).toBe(true);
    });

    it("returns false for primitives, arrays, null, and undefined", () => {
      expect(isRecord(null)).toBe(false);
      expect(isRecord(undefined)).toBe(false);
      expect(isRecord([])).toBe(false);
      expect(isRecord("string")).toBe(false);
      expect(isRecord(123)).toBe(false);
      expect(isRecord(true)).toBe(false);
    });
  });

  describe("formatZodErrors", () => {
    it("formats top-level, nested, and array indexed paths accurately", () => {
      const schema = z.object({
        name: z.string().min(1, "Name is required."),
        tapQuota: z.object({
          maxTaps: z.number({ error: "Max taps must be a number." }),
        }),
        visitors: z.array(
          z.object({
            givenName: z.string().min(1, "Given name is required."),
          }),
        ),
      });

      const parsed = schema.safeParse({
        name: "",
        tapQuota: { maxTaps: "invalid" },
        visitors: [{ givenName: "" }],
      });

      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        const errors = formatZodErrors(parsed.error);
        expect(errors.name).toBe("Name is required.");
        expect(errors["tapQuota.maxTaps"]).toBe("Max taps must be a number.");
        expect(errors["visitors[0].givenName"]).toBe("Given name is required.");
      }
    });

    it("maps empty path issues to _global", () => {
      const schema = z.string().superRefine((_, ctx) => {
        ctx.addIssue({
          code: "custom",
          message: "Global custom failure",
        });
      });

      const parsed = schema.safeParse("test");
      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        const errors = formatZodErrors(parsed.error);
        expect(errors._global).toBe("Global custom failure");
      }
    });
  });
});
