import { logger } from '@/lib/utils/logger';
import React, { useState } from 'react';
import { 
  insightsPanelStyles, 
  getInsightsTabStyle,
} from '@/app/emotional-landscapes/styles/insights-panel';
import { Tab } from '../types/panel';

interface BaseInsightsPanelProps {
  tabs: Tab[];
  initialTabId?: string;
}

/**
 * Base Multi-tab Insights Panel Component
 * 
 * Provides a generic tabbed interface.
 */
export const BaseInsightsPanel: React.FC<BaseInsightsPanelProps> = ({ tabs, initialTabId }) => {
  const [activeTab, setActiveTab] = useState<string>(initialTabId || (tabs.length > 0 ? tabs[0].id : ''));

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId);
  };

  const activeTabContent = tabs.find(tab => tab.id === activeTab)?.content;

  return (
    <div style={insightsPanelStyles.panel}>
      <div style={insightsPanelStyles.container}>
        <div style={insightsPanelStyles.tabBar}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              style={getInsightsTabStyle(activeTab === tab.id)}
              onClick={() => handleTabClick(tab.id)}
              aria-selected={activeTab === tab.id}
              role="tab"
            >
              {tab.title}
            </button>
          ))}
        </div>

        <div style={insightsPanelStyles.content}>
          {activeTabContent}
        </div>
      </div>
    </div>
  );
}; 