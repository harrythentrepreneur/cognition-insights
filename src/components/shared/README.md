# Shared Components

This directory contains shared components that are used across multiple pages in the application.

## Base Components

### `BaseCircumplex`

A D3-powered circumplex visualization for displaying multi-dimensional data.

**Props:**
- `data: CircumplexDataItem[]`: An array of data points to render on the circumplex.
- `size?: number`: The size of the component in pixels.

### `BaseEventsTimeline`

A component for displaying a timeline of events.

**Props:**
- `events: TimelineEvent[]`: An array of events to display on the timeline.
- `emotionColors: Record<string, string>`: A mapping of emotion IDs to colors.
- `title?: string`: An optional title for the timeline.

### `BaseHeatmap`

A D3-powered heatmap for displaying time-based data.

**Props:**
- `data: HeatmapDataItem[]`: An array of data points to render on the heatmap.
- `colorScheme: Record<string, string>`: A mapping of data levels to colors.
- `timeRange: { start: Date; end: Date }`: The time range to display on the heatmap.
- `fillParent?: boolean`: Whether the heatmap should fill its parent container.
- `hideLegend?: boolean`: Whether to hide the legend.

### `BaseHeatmapGrid`

A grid component for displaying multiple heatmap-style visualizations.

**Props:**
- `items: GridItem[]`: An array of items to display in the grid.

### `BaseInsightsDelta`

A component for displaying the delta between two sets of insights.

**Props:**
- `data: HabitImpact[]`: An array of habit impact data.
- `title?: string`: An optional title for the component.
- `colorScheme?: string`: An optional color scheme to use.

### `BaseInsightsPanel`

A tabbed panel for displaying different types of insights.

**Props:**
- `tabs: Tab[]`: An array of tabs to display in the panel.
- `initialTabId?: string`: The ID of the tab to select initially.

### `BaseTimeline`

A D3-powered timeline for displaying time-based data.

**Props:**
- `data: TimelineDataItem[]`: An array of data to display on the timeline.
- `timeRange: { start: Date; end: Date }`: The time range to display on the timeline.
- `onActiveItemsChange?: (activeItems: Record<string, boolean>) => void`: A callback for when the active items on the timeline change. 