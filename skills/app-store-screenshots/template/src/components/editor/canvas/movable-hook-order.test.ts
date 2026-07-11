import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Movable hook order", () => {
  it("evaluates every hook before the visibility return", () => {
    const source = readFileSync("src/components/editor/canvas/movable.tsx", "utf8");
    const visibilityReturn = source.indexOf("if (hidden) return null");
    const lastHook = Math.max(source.lastIndexOf("React.useCallback", visibilityReturn), source.lastIndexOf("React.useEffect", visibilityReturn), source.lastIndexOf("React.useRef", visibilityReturn));
    expect(visibilityReturn).toBeGreaterThan(0);
    expect(lastHook).toBeGreaterThan(0);
    expect(visibilityReturn).toBeGreaterThan(lastHook);
    expect(source.slice(visibilityReturn)).not.toMatch(/React\.use(?:Callback|Effect|Memo|Ref|State)/);
  });
});
