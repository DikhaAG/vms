import { describe, it, expect } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { VmsProviders } from "./vms-providers";

describe("VmsProviders Component", () => {
  it("renders children wrapped with QueryClientProvider, trpc.Provider, NuqsAdapter, and Sonner Toaster", () => {
    const html = renderToStaticMarkup(
      <VmsProviders>
        <main id="operator-main">Dashboard Operator</main>
      </VmsProviders>
    );

    expect(html).toContain("Dashboard Operator");
    expect(html).toContain("id=\"operator-main\"");
    expect(html).toContain("aria-live=\"polite\"");
  });
});

