// jest-dom matchers are only meaningful in a DOM environment. Node-environment
// tests skip them so the matchers don't error on a missing document.
export {};

if (typeof document !== "undefined") {
  await import("@testing-library/jest-dom/vitest");
}
