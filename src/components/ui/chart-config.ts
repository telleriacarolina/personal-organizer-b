import type { ComponentType, ReactNode } from "react"

export const THEMES = { light: "", dark: ".dark" } as const

export type ChartConfig = {
  [k in string]: {
    label?: ReactNode
    icon?: ComponentType
  } & (
    | { color?: string; theme?: never }
    | { color?: never; theme: Record<keyof typeof THEMES, string> }
  )
}

export const CHART_CONTAINER_CLASS_NAME =
  "[&_.recharts-cartesian-axis-tick-value]:fill-muted-foreground [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/50 [&_.recharts-polar-grid-angle_line[stroke='#ccc']]:stroke-border/50 [&_.recharts-polar-grid-concentric-circle[stroke='#ccc']]:stroke-border/50 [&_.recharts-polar-grid-concentric-polygon[stroke='#ccc']]:stroke-border/50 [&_.recharts-radial-bar-background-sector]:fill-muted [&_.recharts-reference-line-line[stroke='#ccc']]:stroke-border [&_.recharts-cross.recharts-tooltip-cursor[stroke='#ccc']]:stroke-border [&_.recharts-curve.recharts-tooltip-cursor[stroke='#ccc']]:stroke-border [&_.recharts-sector.recharts-tooltip-cursor[stroke='#ccc']]:stroke-border [&_.recharts-rectangle.recharts-tooltip-cursor[fill='#ccc']]:fill-muted flex aspect-video justify-center text-xs [&_.recharts-dot[stroke='#fff']]:stroke-transparent [&_.recharts-layer]:outline-hidden [&_.recharts-sector]:outline-hidden [&_.recharts-sector[stroke='#fff']]:stroke-transparent [&_.recharts-surface]:outline-hidden"

export function getPayloadConfigFromPayload(
  config: ChartConfig,
  payload: unknown,
  key: string
) {
  if (typeof payload !== "object" || payload === null) {
    return undefined
  }

  const payloadPayload =
    "payload" in payload &&
    typeof payload.payload === "object" &&
    payload.payload !== null
      ? payload.payload
      : undefined

  let configLabelKey: string = key

  if (
    key in payload &&
    typeof payload[key as keyof typeof payload] === "string"
  ) {
    configLabelKey = payload[key as keyof typeof payload] as string
  } else if (
    payloadPayload &&
    key in payloadPayload &&
    typeof payloadPayload[key as keyof typeof payloadPayload] === "string"
  ) {
    configLabelKey = payloadPayload[
      key as keyof typeof payloadPayload
    ] as string
  }

  return configLabelKey in config
    ? config[configLabelKey]
    : config[key as keyof typeof config]
}
