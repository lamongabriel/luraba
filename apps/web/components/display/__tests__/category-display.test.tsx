import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CategoryDisplay } from "../index";

const list = vi.hoisted(() => vi.fn());
vi.mock("@/services/categories.service", () => ({ listCategories: list }));

const PARENT = "11111111-1111-4111-8111-111111111111";
const base = { name: "Electronics", color: "#38BDF8" };

function renderWith(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe("CategoryDisplay icon fallback", () => {
  beforeEach(() => {
    list.mockReset();
    list.mockResolvedValue({ data: [{ id: PARENT, name: "Shopping", icon: "ShoppingBag03Icon" }] });
  });

  it("uses its own icon when it has one, without loading categories", () => {
    renderWith(<CategoryDisplay category={{ ...base, icon: "Car01Icon", parentId: PARENT }} />);
    expect(screen.getByText("Electronics")).toBeTruthy();
    expect(list).not.toHaveBeenCalled();
  });

  it("does not load anything for a top-level category", () => {
    renderWith(<CategoryDisplay category={{ ...base, icon: null, parentId: null }} />);
    expect(list).not.toHaveBeenCalled();
  });

  it("shows the parent's icon for a subcategory without one", async () => {
    const glyph = (container: HTMLElement) =>
      [...container.querySelectorAll("svg path")].map((path) => path.getAttribute("d")).join("|");
    const own = renderWith(<CategoryDisplay category={{ ...base, icon: "ShoppingBag03Icon" }} />);
    const parentGlyph = glyph(own.container);
    own.unmount();
    const generic = renderWith(<CategoryDisplay category={{ ...base, icon: null }} />);
    const defaultGlyph = glyph(generic.container);
    generic.unmount();
    expect(parentGlyph).not.toBe(defaultGlyph);

    const { container } = renderWith(
      <CategoryDisplay category={{ ...base, icon: null, parentId: PARENT }} />,
    );
    await waitFor(() => expect(glyph(container)).toBe(parentGlyph));
  });
});
