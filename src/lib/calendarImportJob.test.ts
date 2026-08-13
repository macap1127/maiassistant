import { describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { functions: { invoke: vi.fn() } },
}));

import { toCompressedDataUrl } from "./calendarImportJob";

describe("calendar import file safeguards", () => {
  it("rejects oversized images before decoding them", async () => {
    const file = new File([new Uint8Array(15 * 1024 * 1024 + 1)], "calendar.jpg", { type: "image/jpeg" });
    await expect(toCompressedDataUrl(file)).rejects.toThrow("FILE_TOO_LARGE");
  });

  it("rejects oversized PDFs before base64 encoding them", async () => {
    const file = new File([new Uint8Array(6 * 1024 * 1024 + 1)], "calendar.pdf", { type: "application/pdf" });
    await expect(toCompressedDataUrl(file)).rejects.toThrow("FILE_TOO_LARGE");
  });
});