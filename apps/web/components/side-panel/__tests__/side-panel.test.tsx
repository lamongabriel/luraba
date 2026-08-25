import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import {
  SidePanel,
  SidePanelBody,
  SidePanelContent,
  SidePanelHeader,
  SidePanelTitle,
} from "@/components/side-panel/side-panel"
import {
  SidePanelDetailRow,
  SidePanelSection,
  SidePanelSettingCard,
} from "@/components/side-panel/side-panel-section"

describe("SidePanel", () => {
  it("composes a labeled panel with sections and settings", () => {
    render(
      <SidePanel open onOpenChange={() => undefined}>
        <SidePanelContent>
          <SidePanelHeader>
            <SidePanelTitle>Transaction details</SidePanelTitle>
          </SidePanelHeader>
          <SidePanelBody>
            <SidePanelSection title="Overview">
              <SidePanelDetailRow label="Type">Expense</SidePanelDetailRow>
            </SidePanelSection>
            <SidePanelSettingCard title="Budget" description="Included" />
          </SidePanelBody>
        </SidePanelContent>
      </SidePanel>,
    )

    expect(screen.getByRole("dialog")).toHaveTextContent("Transaction details")
    expect(screen.getByText("Overview")).toBeInTheDocument()
    expect(screen.getByText("Expense")).toBeInTheDocument()
    expect(screen.getByText("Budget")).toBeInTheDocument()
  })
})
