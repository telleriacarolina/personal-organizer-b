import assert from "node:assert/strict"
import test from "node:test"

import {
  CHART_CONTAINER_CLASS_NAME,
  type ChartConfig,
  getPayloadConfigFromPayload,
} from "./chart-config.ts"

test("chart container classes target Recharts 3 selectors", () => {
  assert.match(
    CHART_CONTAINER_CLASS_NAME,
    /recharts-cartesian-axis-tick-value/
  )
  assert.match(
    CHART_CONTAINER_CLASS_NAME,
    /recharts-polar-grid-angle_line\[stroke='#ccc'\]/
  )
  assert.match(
    CHART_CONTAINER_CLASS_NAME,
    /recharts-polar-grid-concentric-circle\[stroke='#ccc'\]/
  )
  assert.match(
    CHART_CONTAINER_CLASS_NAME,
    /recharts-reference-line-line\[stroke='#ccc'\]/
  )
  assert.match(
    CHART_CONTAINER_CLASS_NAME,
    /recharts-cross\.recharts-tooltip-cursor\[stroke='#ccc'\]/
  )
  assert.match(
    CHART_CONTAINER_CLASS_NAME,
    /recharts-rectangle\.recharts-tooltip-cursor\[fill='#ccc'\]/
  )
  assert.doesNotMatch(CHART_CONTAINER_CLASS_NAME, /recharts-cartesian-axis-tick_text/)
  assert.doesNotMatch(CHART_CONTAINER_CLASS_NAME, /recharts-polar-grid_\[stroke='#ccc'\]/)
  assert.doesNotMatch(CHART_CONTAINER_CLASS_NAME, /recharts-reference-line_\[stroke='#ccc'\]/)
})

test("getPayloadConfigFromPayload prefers direct payload label matches", () => {
  const config: ChartConfig = {
    revenue: { label: "Revenue", color: "#123456" },
    profit: { label: "Profit", color: "#654321" },
  }

  const payload = { dataKey: "profit", payload: { dataKey: "revenue" } }

  assert.equal(getPayloadConfigFromPayload(config, payload, "dataKey"), config.profit)
})

test("getPayloadConfigFromPayload falls back to nested payload label matches", () => {
  const config: ChartConfig = {
    revenue: { label: "Revenue", color: "#123456" },
    visits: { label: "Visits", color: "#654321" },
  }

  const payload = { payload: { dataKey: "revenue" } }

  assert.equal(getPayloadConfigFromPayload(config, payload, "dataKey"), config.revenue)
})

test("getPayloadConfigFromPayload falls back to the original key and ignores invalid payloads", () => {
  const config: ChartConfig = {
    value: { label: "Value", color: "#123456" },
  }

  assert.equal(getPayloadConfigFromPayload(config, { other: "x" }, "value"), config.value)
  assert.equal(getPayloadConfigFromPayload(config, null, "value"), undefined)
  assert.equal(getPayloadConfigFromPayload(config, "invalid", "value"), undefined)
})
