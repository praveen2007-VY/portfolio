import { describe, expect, it } from "vitest";
import { isInteractive, isTextInput } from "@/components/ui/custom-cursor";

type MockElement = {
  tagName: string;
  dataset: Record<string, string>;
  attributes: Record<string, string>;
  closest: (selector: string) => MockElement | null;
  parent: MockElement | null;
};

// Helper to create mock DOM-like elements for node test environment
function createMockElement(
  tagName: string,
  attrs: Record<string, string> = {},
  parent: MockElement | null = null,
): MockElement {
  const el: MockElement = {
    tagName: tagName.toUpperCase(),
    dataset: {},
    attributes: { ...attrs },
    closest: (selector: string) => {
      if (matchesSelector(el, selector)) return el;
      let curr = el.parent;
      while (curr) {
        if (matchesSelector(curr, selector)) return curr;
        curr = curr.parent;
      }
      return null;
    },
    parent,
  };

  for (const [k, v] of Object.entries(attrs)) {
    if (k.startsWith("data-")) {
      const camel = k.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      el.dataset[camel] = v;
      el.dataset[k.slice(5)] = v;
    }
  }

  return el;
}

function matchesSelector(el: MockElement, selectorGroup: string): boolean {
  const selectors = selectorGroup.split(",").map((s) => s.trim());
  for (const sel of selectors) {
    if (sel.includes(":not(")) {
      const baseTag = sel.split(":")[0]?.toUpperCase();
      if (baseTag && el.tagName !== baseTag) continue;
      const notMatches = [...sel.matchAll(/:not\(\[type="([^"]+)"\]\)/g)];
      const type = el.attributes.type || "text";
      const isExcluded = notMatches.some((m) => m[1] === type);
      if (!isExcluded) return true;
    } else if (sel.startsWith("[")) {
      const match = sel.match(/\[([a-zA-Z0-9_-]+)(?:="([^"]+)")?\]/);
      if (match) {
        const [, attr, val] = match;
        if (val !== undefined) {
          if (el.attributes[attr] === val) return true;
        } else if (attr in el.attributes) {
          return true;
        }
      }
    } else if (sel.toUpperCase() === el.tagName) {
      return true;
    }
  }
  return false;
}

describe("Custom Cursor Detection Logic", () => {
  describe("isTextInput", () => {
    it("handles null / undefined safely without throwing", () => {
      expect(isTextInput(null)).toBe(false);
    });

    it("identifies standard text input types", () => {
      const input = createMockElement("input", { type: "text" });
      expect(isTextInput(input as unknown as HTMLElement)).toBe(true);

      const email = createMockElement("input", { type: "email" });
      expect(isTextInput(email as unknown as HTMLElement)).toBe(true);

      const textarea = createMockElement("textarea");
      expect(isTextInput(textarea as unknown as HTMLElement)).toBe(true);

      const contentEditable = createMockElement("div", { contenteditable: "true" });
      expect(isTextInput(contentEditable as unknown as HTMLElement)).toBe(true);
    });

    it("excludes non-text inputs such as buttons, checkboxes, and radio buttons", () => {
      const btn = createMockElement("input", { type: "button" });
      expect(isTextInput(btn as unknown as HTMLElement)).toBe(false);

      const submit = createMockElement("input", { type: "submit" });
      expect(isTextInput(submit as unknown as HTMLElement)).toBe(false);

      const checkbox = createMockElement("input", { type: "checkbox" });
      expect(isTextInput(checkbox as unknown as HTMLElement)).toBe(false);

      const radio = createMockElement("input", { type: "radio" });
      expect(isTextInput(radio as unknown as HTMLElement)).toBe(false);
    });

    it("does not report true for ordinary buttons, links, or text paragraphs", () => {
      const button = createMockElement("button");
      expect(isTextInput(button as unknown as HTMLElement)).toBe(false);

      const p = createMockElement("p");
      expect(isTextInput(p as unknown as HTMLElement)).toBe(false);

      const span = createMockElement("span");
      expect(isTextInput(span as unknown as HTMLElement)).toBe(false);
    });

    it("never relies on window.getSelection() (selecting text or repeated clicking never hides cursor)", () => {
      const originalWindow = globalThis.window;
      Object.defineProperty(globalThis, "window", {
        value: {
          getSelection: () => ({
            toString: () => "Selected text after 3 rapid clicks",
          }),
        },
        writable: true,
        configurable: true,
      });

      const button = createMockElement("button");
      expect(isTextInput(button as unknown as HTMLElement)).toBe(false);

      const div = createMockElement("div");
      expect(isTextInput(div as unknown as HTMLElement)).toBe(false);

      Object.defineProperty(globalThis, "window", {
        value: originalWindow,
        writable: true,
        configurable: true,
      });
    });
  });

  describe("isInteractive", () => {
    it("handles null safely without throwing", () => {
      expect(isInteractive(null)).toBe(false);
    });

    it("detects buttons, links, summaries, and role=button", () => {
      const button = createMockElement("button");
      expect(isInteractive(button as unknown as HTMLElement)).toBe(true);

      const a = createMockElement("a", { href: "/admin/projects" });
      expect(isInteractive(a as unknown as HTMLElement)).toBe(true);

      const roleButton = createMockElement("div", { role: "button" });
      expect(isInteractive(roleButton as unknown as HTMLElement)).toBe(true);

      const summary = createMockElement("summary");
      expect(isInteractive(summary as unknown as HTMLElement)).toBe(true);
    });

    it("detects chips, cards, tags, and custom data attributes", () => {
      const chip = createMockElement("div", { "data-cursor": "chip" });
      expect(isInteractive(chip as unknown as HTMLElement)).toBe(true);

      const card = createMockElement("div", { "data-project-card": "" });
      expect(isInteractive(card as unknown as HTMLElement)).toBe(true);
    });

    it("detects nested elements inside interactive parents", () => {
      const button = createMockElement("button");
      const icon = createMockElement("svg", {}, button);
      const span = createMockElement("span", {}, icon);
      expect(isInteractive(span as unknown as HTMLElement)).toBe(true);
    });

    it("does not trigger for ordinary non-interactive elements", () => {
      const div = createMockElement("div");
      expect(isInteractive(div as unknown as HTMLElement)).toBe(false);

      const p = createMockElement("p");
      expect(isInteractive(p as unknown as HTMLElement)).toBe(false);
    });
  });

  describe("Repeated click stability simulation", () => {
    it("remains consistent across 10 or more consecutive clicks", () => {
      const button = createMockElement("button");
      const results: { isText: boolean; isHover: boolean }[] = [];

      for (let i = 0; i < 20; i++) {
        const isText = isTextInput(button as unknown as HTMLElement);
        const isHover = isInteractive(button as unknown as HTMLElement);
        results.push({ isText, isHover });
      }

      expect(results.every((r) => !r.isText && r.isHover)).toBe(true);
    });
  });
});
