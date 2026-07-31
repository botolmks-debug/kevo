import { vi } from "vitest";
import "@testing-library/jest-dom/vitest";

// react-konva butuh Canvas API yang jsdom tidak sediakan ("Cannot read
// properties of null (reading 'scale')" saat Konva.Stage dibuat) — semua test
// yang me-render halaman berisi CanvasEditor (app/generate/page.tsx,
// app/generate-otomatis/AutoGenerate.tsx) otomatis dapat stub sederhana ini,
// bukan Konva sungguhan. Test integrasi cukup pakai dua tombol di bawah untuk
// mensimulasikan hasil interaksi editor (lihat spec-editor-kanvas-kevo.md).
vi.mock("@/components/editor/CanvasEditor", () => ({
  CanvasEditor: (props: {
    layout: { slots: { id: string; type: string }[] };
    onOverridesChange: (overrides: unknown) => void;
    onTextChange: (slotId: string, value: string) => void;
  }) => {
    const firstTextSlotId = props.layout.slots.find((s) => s.type === "text")?.id;
    return (
      <div data-testid="canvas-editor-stub">
        {firstTextSlotId ? (
          <button type="button" onClick={() => props.onTextChange(firstTextSlotId, "Teks hasil edit kanvas")}>
            stub-edit-text
          </button>
        ) : null}
        <button
          type="button"
          onClick={() =>
            props.onOverridesChange({
              slots: firstTextSlotId ? { [firstTextSlotId]: { fontFamily: "Pacifico" } } : {},
            })
          }
        >
          stub-change-overrides
        </button>
      </div>
    );
  },
}));
