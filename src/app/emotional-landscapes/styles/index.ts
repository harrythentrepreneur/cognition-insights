// Design system and utilities
export * from './utils';

// Layout and navigation
export * from './dashboard-layout';
export * from './navigation';

// Component-specific styles
export * from './heatmap';
export * from './insights-panel';
export * from './events-timeline';
export * from './insights-delta';

// Combined styles object for backward compatibility
import { dashboardLayoutStyles } from './dashboard-layout';
import { navigationStyles } from './navigation';

export const styles = {
  ...dashboardLayoutStyles,
  ...navigationStyles
}; 