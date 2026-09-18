// @vitest-environment jsdom

import { render } from "@testing-library/react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { ChartContainer, ChartStyle, type ChartConfig } from "@/components/ui/chart"

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
  it("returns no style element when no color config exists", () => {
    const config: ChartConfig = {
      visitors: {
        label: "Visitors",
      },
    }

    const markup = renderToStaticMarkup(<ChartStyle id="chart-empty" config={config} />)

    expect(markup).toBe("")
  })

  it("renders light and dark theme CSS variables from color and theme config", () => {
    const config: ChartConfig = {
      desktop: {
        label: "Desktop",
        color: "#3b82f6",
      },
      mobile: {
        label: "Mobile",
        theme: {
          light: "#22c55e",
          dark: "#16a34a",
        },
      },
    }

    const markup = renderToStaticMarkup(<ChartStyle id="chart-traffic" config={config} />)

    expect(markup).toContain("[data-chart=chart-traffic]")
    expect(markup).toContain("--color-desktop: #3b82f6;")
    expect(markup).toContain("--color-mobile: #22c55e;")
    expect(markup).toContain(".dark [data-chart=chart-traffic]")
    expect(markup).toContain("--color-mobile: #16a34a;")
  })

  it("uses fallback color when theme data is incomplete and avoids undefined values", () => {
    const config = {
      revenue: {
        label: "Revenue",
        color: "#f97316",
        theme: {
          light: "#fb923c",
        },
      },
    } as unknown as ChartConfig

    const markup = renderToStaticMarkup(<ChartStyle id="chart-revenue" config={config} />)

    expect(markup).toContain("--color-revenue: #fb923c;")
    expect(markup).toContain(".dark [data-chart=chart-revenue]")
    expect(markup).toContain("--color-revenue: #f97316;")
    expect(markup).not.toContain("undefined")
  })

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
