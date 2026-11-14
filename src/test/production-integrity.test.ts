import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

function getFilesRecursively(dir: string, extension: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...getFilesRecursively(fullPath, extension));
    } else if (entry.isFile() && entry.name.endsWith(extension)) {
      files.push(fullPath);
    }
  }
  return files;
}

describe("Production Code Integrity & Guardrails", () => {
  const rootDir = process.cwd();
  const vmsAppDir = path.join(rootDir, "src/app/vms");
  const inviteAppDir = path.join(rootDir, "src/app/invite");

  const prodSourceFiles = [
    ...getFilesRecursively(vmsAppDir, ".tsx"),
    ...getFilesRecursively(vmsAppDir, ".ts"),
    ...getFilesRecursively(inviteAppDir, ".tsx"),
    ...getFilesRecursively(inviteAppDir, ".ts"),
  ].filter((f) => !f.includes(".test."));

  it("ensures no synthetic test fixtures or sample photo injectors exist in production UI files", () => {
    const bannedTokens = [
      "createSampleFaceJpegDataUri",
      "handleSimulateTap",
      "Simulasi Tap Pintu",
      "Muat Contoh Foto",
      "Muat Contoh Standar",
      "Gunakan Contoh",
    ];

    const violations: { file: string; token: string }[] = [];

    for (const filePath of prodSourceFiles) {
      const content = fs.readFileSync(filePath, "utf-8");
      for (const token of bannedTokens) {
        if (content.includes(token)) {
          violations.push({
            file: path.relative(rootDir, filePath),
            token,
          });
        }
      }
    }

    expect(
      violations,
      `Found simulation/sample mock artifacts in production code paths: ${JSON.stringify(violations, null, 2)}`,
    ).toEqual([]);
  });

  it("verifies Header does not have an optimistic systemHealthy default", () => {
    const headerPath = path.join(rootDir, "src/components/vms/header.tsx");
    const content = fs.readFileSync(headerPath, "utf-8");

    // Must NOT contain systemHealthy = true
    expect(content).not.toMatch(/systemHealthy\s*=\s*true/);
  });

  it("verifies HikCentralStatusBadge defaults to checking status instead of online", () => {
    const badgePath = path.join(
      rootDir,
      "src/components/vms/hikcentral-status-badge.tsx",
    );
    const content = fs.readFileSync(badgePath, "utf-8");

    // Must contain initialStatus = "checking"
    expect(content).toMatch(/initialStatus\s*=\s*"checking"/);
    // Must NOT contain initialStatus = "online"
    expect(content).not.toMatch(/initialStatus\s*=\s*"online"/);
  });
});
