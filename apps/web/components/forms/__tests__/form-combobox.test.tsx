import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { ComboboxControl } from "@/components/forms/form-combobox"
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table"

class ResizeObserverMock {
  disconnect() {}

  observe() {}

  unobserve() {}
}

describe("ComboboxControl", () => {
  it("keeps an inline row-action trigger click out of its table row", async () => {
    vi.stubGlobal("ResizeObserver", ResizeObserverMock)
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: vi.fn(),
    })
    const user = userEvent.setup()
    const onRowClick = vi.fn()

    render(
      <Table>
        <TableBody>
          <TableRow onClick={onRowClick}>
            <TableCell>
              <ComboboxControl
                dataRowAction
                id="category"
                onChange={() => {}}
                options={[{ label: "Groceries", value: "groceries" }]}
                value="groceries"
              />
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    )

    await user.click(screen.getByRole("button", { name: /groceries/i }))

    expect(screen.getByPlaceholderText("Search...")).toBeInTheDocument()
    await user.click(screen.getByRole("option", { name: /groceries/i }))

    expect(onRowClick).not.toHaveBeenCalled()
  })
})
