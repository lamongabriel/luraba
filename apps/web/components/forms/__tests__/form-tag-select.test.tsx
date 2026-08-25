import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { TagSelectControl } from "@/components/forms/form-tag-select"

const tags = [
  {
    id: "tag-travel",
    name: "Travel",
    color: "#8b5cf6",
    icon: "plane",
  },
]

class ResizeObserverMock {
  disconnect() {}

  observe() {}

  unobserve() {}
}

vi.mock("@/queries/tags/use-tags-query", () => ({
  useTagsQuery: () => ({
    data: { data: tags },
    isPending: false,
  }),
}))

describe("TagSelectControl", () => {
  it("updates the selected ids when a command item is clicked", async () => {
    vi.stubGlobal("ResizeObserver", ResizeObserverMock)
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: vi.fn(),
    })
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(<TagSelectControl id="tags" onChange={onChange} value={[]} />)

    await user.click(screen.getByRole("button", { name: "Select tags" }))
    await user.click(screen.getByRole("option", { name: "Travel" }))

    expect(onChange).toHaveBeenCalledWith(["tag-travel"])
  })
})
