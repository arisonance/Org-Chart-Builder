// @vitest-environment jsdom
import { describe, it, expect, vi, beforeAll } from "vitest";
import { render, cleanup } from "@testing-library/react";
import type { ReactNode } from "react";

// React Flow does heavy DOM/measurement work that jsdom can't satisfy. This is a
// mount tripwire, not a rendering test, so we stub the library with inert
// passthrough components and the handful of value exports the app imports.
vi.mock("@xyflow/react", () => {
  const Passthrough = ({ children }: { children?: ReactNode }) => <div>{children}</div>;
  const Noop = () => null;
  return {
    ReactFlow: Passthrough,
    Background: Noop,
    MiniMap: Noop,
    Handle: Noop,
    Panel: Passthrough,
    BackgroundVariant: { Dots: "dots", Lines: "lines", Cross: "cross" },
    Position: { Top: "top", Right: "right", Bottom: "bottom", Left: "left" },
    MarkerType: { Arrow: "arrow", ArrowClosed: "arrowclosed" },
    ConnectionMode: { Strict: "strict", Loose: "loose" },
    applyNodeChanges: (_changes: unknown, nodes: unknown) => nodes,
    applyEdgeChanges: (_changes: unknown, edges: unknown) => edges,
    useReactFlow: () => ({
      fitView: vi.fn(),
      setCenter: vi.fn(),
      getNodes: () => [],
      screenToFlowPosition: (p: unknown) => p,
    }),
    ReactFlowProvider: Passthrough,
  };
});

beforeAll(() => {
  // jsdom lacks these; React Flow / Radix probe them on mount.
  if (!("ResizeObserver" in globalThis)) {
    (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }
  if (!window.matchMedia) {
    window.matchMedia = ((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;
  }
  if (!("DOMMatrixReadOnly" in globalThis)) {
    (globalThis as unknown as { DOMMatrixReadOnly: unknown }).DOMMatrixReadOnly = class {
      m22 = 1;
      constructor() {}
    };
  }
});

describe("HierarchyCanvas smoke test", () => {
  it("mounts without throwing", async () => {
    const { HierarchyCanvas } = await import("@/components/hierarchy-canvas");
    expect(() => {
      const { unmount } = render(<HierarchyCanvas />);
      unmount();
    }).not.toThrow();
    cleanup();
  });
});
