import { describe, expect, it } from "vitest"

import {
  CHART_CONTAINER_CLASS_NAME,
  type ChartConfig,
  getPayloadConfigFromPayload,
} from "./chart-config.ts"

describe("chart-config", () => {
  it("chart container classes target Recharts 3 selectors", () => {
    expect(CHART_CONTAINER_CLASS_NAME).toMatch(/recharts-cartesian-axis-tick-value/)
    expect(CHART_CONTAINER_CLASS_NAME).toMatch(/recharts-polar-grid-angle_line\[stroke='#ccc'\]/)
    expect(CHART_CONTAINER_CLASS_NAME).toMatch(/recharts-polar-grid-concentric-circle\[stroke='#ccc'\]/)
    expect(CHART_CONTAINER_CLASS_NAME).toMatch(/recharts-reference-line-line\[stroke='#ccc'\]/)
    expect(CHART_CONTAINER_CLASS_NAME).toMatch(/recharts-cross\.recharts-tooltip-cursor\[stroke='#ccc'\]/)
    expect(CHART_CONTAINER_CLASS_NAME).toMatch(/recharts-rectangle\.recharts-tooltip-cursor\[fill='#ccc'\]/)
    expect(CHART_CONTAINER_CLASS_NAME).not.toMatch(/recharts-cartesian-axis-tick_text/)
    expect(CHART_CONTAINER_CLASS_NAME).not.toMatch(/recharts-polar-grid_\[stroke='#ccc'\]/)
    expect(CHART_CONTAINER_CLASS_NAME).not.toMatch(/recharts-reference-line_\[stroke='#ccc'\]/)
  })

  it("getPayloadConfigFromPayload prefers direct payload label matches", () => {
    const config: ChartConfig = {
      revenue: { label: "Revenue", color: "#123456" },
      profit: { label: "Profit", color: "#654321" },
    }

    const payload = { dataKey: "profit", payload: { dataKey: "revenue" } }

    expect(getPayloadConfigFromPayload(config, payload, "dataKey")).toBe(config.profit)
  })

  it("getPayloadConfigFromPayload falls back to nested payload label matches", () => {
    const config: ChartConfig = {
      revenue: { label: "Revenue", color: "#123456" },
      visits: { label: "Visits", color: "#654321" },
    }

    const payload = { payload: { dataKey: "revenue" } }

    expect(getPayloadConfigFromPayload(config, payload, "dataKey")).toBe(config.revenue)
  })

  it("getPayloadConfigFromPayload falls back to the original key and ignores invalid payloads", () => {
    const config: ChartConfig = {
      value: { label: "Value", color: "#123456" },
    }

    expect(getPayloadConfigFromPayload(config, { other: "x" }, "value")).toBe(config.value)
    expect(getPayloadConfigFromPayload(config, null, "value")).toBeUndefined()
    expect(getPayloadConfigFromPayload(config, "invalid", "value")).toBeUndefined()
  })
})
