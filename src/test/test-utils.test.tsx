import { describe, it, expect } from "vitest";
import React from "react";
import {
  createTestQueryClient,
  createTestTrpcClient,
  renderWithVmsProviders,
} from "./test-utils";

describe("Test Utils & VmsProviders Test Harness", () => {
  it("creates an isolated in-memory QueryClient with non-retrying defaults", () => {
    const client = createTestQueryClient();
    expect(client).toBeDefined();

    const queryDefaults = client.getDefaultOptions().queries;
    const mutationDefaults = client.getDefaultOptions().mutations;

    expect(queryDefaults?.retry).toBe(false);
    expect(queryDefaults?.gcTime).toBe(0);
    expect(queryDefaults?.staleTime).toBe(0);
    expect(mutationDefaults?.retry).toBe(false);
  });

  it("creates an isolated tRPC client instance", () => {
    const trpcClient = createTestTrpcClient();
    expect(trpcClient).toBeDefined();
  });

  it("renders children and Sonner toaster with renderWithVmsProviders", () => {
    const result = renderWithVmsProviders(
      <div data-testid="test-content">Konten Uji Operator VMS</div>
    );

    expect(result.html).toContain("Konten Uji Operator VMS");
    // Verifies Sonner toaster markup is present in the container
    expect(result.html).toContain("aria-live=\"polite\"");
    expect(result.queryClient).toBeDefined();
    expect(result.trpcClient).toBeDefined();
  });

  it("allows passing a custom pre-seeded QueryClient", async () => {
    const customClient = createTestQueryClient();
    customClient.setQueryData(["test-key"], { message: "Data Terisi" });

    const result = renderWithVmsProviders(
      <div>Komponen dengan Cache</div>,
      { queryClient: customClient }
    );

    expect(result.html).toContain("Komponen dengan Cache");
    expect(result.queryClient.getQueryData(["test-key"])).toEqual({
      message: "Data Terisi",
    });
  });
});
