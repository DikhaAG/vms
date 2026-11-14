import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  useModalFocusTrap,
  FOCUSABLE_ELEMENTS_SELECTOR,
} from "./use-modal-focus-trap";

describe("useModalFocusTrap", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("exports a valid accessible focusable CSS selector string", () => {
    expect(FOCUSABLE_ELEMENTS_SELECTOR).toContain("button:not([disabled])");
    expect(FOCUSABLE_ELEMENTS_SELECTOR).toContain("[href]");
    expect(FOCUSABLE_ELEMENTS_SELECTOR).toContain("input:not([disabled])");
    expect(FOCUSABLE_ELEMENTS_SELECTOR).toContain("select:not([disabled])");
    expect(FOCUSABLE_ELEMENTS_SELECTOR).toContain("textarea:not([disabled])");
    expect(FOCUSABLE_ELEMENTS_SELECTOR).toContain(
      '[tabindex]:not([tabindex="-1"]):not([disabled])',
    );
  });

  it("exposes useModalFocusTrap function without crashing", () => {
    expect(typeof useModalFocusTrap).toBe("function");
  });
});

