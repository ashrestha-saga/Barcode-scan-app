import { describe, expect, it } from "vitest";
import {
  isValidSessionPin,
  profileRequiresSessionPin,
  sanitizeSessionPinInput,
} from "@/lib/sessionPin";

describe("sessionPin", () => {
  it("sanitizes to digits and max 11", () => {
    expect(sanitizeSessionPinInput("12a34b567890123")).toBe("12345678901");
  });

  it("validates 3–11 digits", () => {
    expect(isValidSessionPin("12")).toBe(false);
    expect(isValidSessionPin("123")).toBe(true);
    expect(isValidSessionPin("12345678901")).toBe(true);
    expect(isValidSessionPin("123456789012")).toBe(false);
    expect(isValidSessionPin("12a3")).toBe(false);
  });

  it("requires pin when active children exist", () => {
    expect(profileRequiresSessionPin({ childs: [] })).toBe(false);
    expect(
      profileRequiresSessionPin({
        childs: [{ active: true }, { active: false }],
      }),
    ).toBe(true);
    expect(
      profileRequiresSessionPin({
        childs: [{ active: false }],
      }),
    ).toBe(false);
  });
});
