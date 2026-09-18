import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { ChartContainer, ChartStyle } from "@/components/ui/chart"

describe("ChartContainer", () => {
  it("includes Recharts 3-specific theme selectors", () => {
    const { container } = render(
      <ChartContainer config={{ visitors: { color: "#8884d8" } }}>
        <div>Chart</div>
      </ChartContainer>
    )

    const chartRoot = container.querySelector("[data-slot='chart']")
    expect(chartRoot).not.toBeNull()

    const className = chartRoot?.getAttribute("class") ?? ""

    expect(className).toContain(
      "[&_.recharts-cartesian-axis-tick-value]:fill-muted-foreground"
    )
    expect(className).toContain(
      "[&_.recharts-cross.recharts-tooltip-cursor[stroke='#ccc']]:stroke-border"
    )
    expect(className).toContain(
      "[&_.recharts-rectangle.recharts-tooltip-cursor[fill='#ccc']]:fill-muted"
    )
    expect(className).not.toContain("recharts-cartesian-axis-tick_text")
  })
})

describe("ChartStyle", () => {
  it("returns null when no chart colors are configured", () => {
    const { container } = render(
      <ChartStyle id="chart-empty" config={{ visitors: { label: "Visitors" } }} />
    )

    expect(container.firstChild).toBeNull()
  })

  it("emits both light and dark css custom properties", () => {
    const { container } = render(
      <ChartStyle
        id="chart-themed"
        config={{
          desktop: { color: "#f00" },
          mobile: { theme: { light: "#0f0", dark: "#00f" } },
        }}
      />
    )

    const styleTag = container.querySelector("style")
    expect(styleTag).not.toBeNull()

    const css = styleTag?.innerHTML ?? ""

    expect(css).toContain("[data-chart=chart-themed]")
    expect(css).toContain("--color-desktop: #f00;")
    expect(css).toContain("--color-mobile: #0f0;")
    expect(css).toContain(".dark [data-chart=chart-themed]")
    expect(css).toContain("--color-mobile: #00f;")
  })
})
