import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { ChartStyle, type ChartConfig } from "./chart"

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

    expect(markup).toContain('[data-chart=chart-traffic]')
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
})
