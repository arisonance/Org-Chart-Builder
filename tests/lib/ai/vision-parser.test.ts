import { describe, it, expect } from "vitest";
import {
  statusToImportErrorKind,
  importErrorMessage,
  ImportError,
  type ImportErrorKind,
} from "@/lib/ai/vision-parser";

describe("statusToImportErrorKind", () => {
  it("maps 429 to rate-limit", () => {
    expect(statusToImportErrorKind(429)).toBe("rate-limit");
  });

  it("maps 503 to service-unavailable", () => {
    expect(statusToImportErrorKind(503)).toBe("service-unavailable");
  });

  it("maps 500 and other 5xx to server", () => {
    expect(statusToImportErrorKind(500)).toBe("server");
    expect(statusToImportErrorKind(502)).toBe("server");
    expect(statusToImportErrorKind(504)).toBe("server");
  });

  it("maps non-error statuses to unknown", () => {
    expect(statusToImportErrorKind(400)).toBe("unknown");
    expect(statusToImportErrorKind(404)).toBe("unknown");
  });
});

describe("importErrorMessage", () => {
  const kinds: ImportErrorKind[] = [
    "rate-limit",
    "service-unavailable",
    "server",
    "network",
    "invalid-response",
    "unknown",
  ];

  it("returns a distinct, non-empty message for every kind", () => {
    const messages = kinds.map(importErrorMessage);
    messages.forEach((m) => expect(m.length).toBeGreaterThan(0));
    expect(new Set(messages).size).toBe(kinds.length);
  });

  it("distinguishes 429, 503, and 500 messaging", () => {
    const rate = importErrorMessage("rate-limit");
    const unavailable = importErrorMessage("service-unavailable");
    const server = importErrorMessage("server");
    expect(rate).toMatch(/too many|wait/i);
    expect(unavailable).toMatch(/unavailable|API key/i);
    expect(server).toMatch(/server/i);
  });

  it("falls back to the unknown message for an unrecognized kind", () => {
    expect(importErrorMessage("bogus" as ImportErrorKind)).toBe(
      importErrorMessage("unknown"),
    );
  });
});

describe("ImportError", () => {
  it("carries kind and status and is an Error", () => {
    const err = new ImportError("rate-limit", "slow down", 429);
    expect(err).toBeInstanceOf(Error);
    expect(err.kind).toBe("rate-limit");
    expect(err.status).toBe(429);
    expect(err.name).toBe("ImportError");
  });
});
