import React, { useState, CSSProperties } from 'react';
import { DESIGN_TOKENS } from '@/components/shared/styles/design-tokens';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const { colors, spacing } = DESIGN_TOKENS;

interface ComparisonPeriod {
  name: string;
  startDate: string;
  endDate: string;
  metrics: {
    confidence: number;
    assertiveness: number;
    proactivity: number;
    emotional_stability: number;
    social_engagement: number;
    message_count: number;
  };
}

interface SideBySideComparisonProps {
  data?: {
    periods: ComparisonPeriod[];
  };
}

const styles = {
  container: {
    width: '100%',
    padding: spacing.xl,
    backgroundColor: 'rgba(35, 35, 64, 0.5)',
    borderRadius: '12px',
    border: `1px solid ${colors.border}`,
    marginBottom: spacing.lg,
  } as CSSProperties,
  
  title: {
    fontSize: '1.5rem',
    fontWeight: 600,
    color: colors.accent,
    marginBottom: spacing.lg,
    textAlign: 'center',
  } as CSSProperties,
  
  controlsContainer: {
    display: 'flex',
    gap: spacing.md,
    marginBottom: spacing.xl,
    flexWrap: 'wrap',
    justifyContent: 'center',
  } as CSSProperties,
  
  periodSelector: {
    padding: `${spacing.sm} ${spacing.md}`,
    backgroundColor: colors.surface,
    border: `1px solid ${colors.border}`,
    borderRadius: '8px',
    color: colors.text,
    fontSize: '0.875rem',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    minWidth: '120px',
    textAlign: 'center',
  } as CSSProperties,
  
  activePeriod: {
    backgroundColor: colors.accent,
    color: colors.background,
    borderColor: colors.accent,
  } as CSSProperties,
  
  comparisonGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: spacing.xl,
    marginBottom: spacing.lg,
  } as CSSProperties,
  
  periodCard: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: '8px',
    border: `1px solid ${colors.border}`,
  } as CSSProperties,
  
  periodTitle: {
    fontSize: '1.2rem',
    fontWeight: 600,
    color: colors.accent,
    marginBottom: spacing.md,
    textAlign: 'center',
  } as CSSProperties,
  
  periodDates: {
    fontSize: '0.875rem',
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    textAlign: 'center',
  } as CSSProperties,
  
  chartContainer: {
    position: 'relative',
    height: '400px',
    marginBottom: spacing.lg,
  } as CSSProperties,
  
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
    gap: spacing.sm,
    marginTop: spacing.md,
  } as CSSProperties,
  
  metricItem: {
    textAlign: 'center',
    padding: spacing.sm,
    backgroundColor: 'rgba(0, 255, 230, 0.1)',
    borderRadius: '6px',
  } as CSSProperties,
  
  metricValue: {
    fontSize: '1.1rem',
    fontWeight: 600,
    color: colors.accent,
    marginBottom: spacing.xs,
  } as CSSProperties,
  
  metricLabel: {
    fontSize: '0.75rem',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  } as CSSProperties,
  
  insightsContainer: {
    marginTop: spacing.xl,
    padding: spacing.lg,
    backgroundColor: 'rgba(0, 255, 230, 0.1)',
    border: `1px solid ${colors.accent}`,
    borderRadius: '8px',
  } as CSSProperties,
  
  insightTitle: {
    fontSize: '1.1rem',
    fontWeight: 600,
    color: colors.accent,
    marginBottom: spacing.md,
  } as CSSProperties,
  
  insightText: {
    fontSize: '0.95rem',
    color: colors.textSecondary,
    lineHeight: 1.6,
    fontStyle: 'italic',
  } as CSSProperties,
};

export const SideBySideComparison: React.FC<SideBySideComparisonProps> = ({ data }) => {
  const defaultPeriods: ComparisonPeriod[] = [
    {
      name: 'Early Period',
      startDate: '2024-01-01',
      endDate: '2024-03-31',
      metrics: {
        confidence: 45,
        assertiveness: 38,
        proactivity: 52,
        emotional_stability: 65,
        social_engagement: 58,
        message_count: 234
      }
    },
    {
      name: 'Recent Period',
      startDate: '2024-04-01',
      endDate: '2024-06-30',
      metrics: {
        confidence: 68,
        assertiveness: 72,
        proactivity: 75,
        emotional_stability: 70,
        social_engagement: 82,
        message_count: 387
      }
    },
    {
      name: 'Growth Phase',
      startDate: '2024-03-01',
      endDate: '2024-05-31',
      metrics: {
        confidence: 58,
        assertiveness: 55,
        proactivity: 63,
        emotional_stability: 68,
        social_engagement: 71,
        message_count: 312
      }
    }
  ];

  const periods = data?.periods || defaultPeriods;
  const [selectedPeriods, setSelectedPeriods] = useState<[number, number]>([0, 1]);
  
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const period1 = periods[selectedPeriods[0]];
  const period2 = periods[selectedPeriods[1]];

  const chartData = {
    labels: ['Confidence', 'Assertiveness', 'Proactivity', 'Emotional Stability', 'Social Engagement'],
    datasets: [
      {
        label: period1?.name || 'Period 1',
        data: period1 ? [
          period1.metrics.confidence,
          period1.metrics.assertiveness,
          period1.metrics.proactivity,
          period1.metrics.emotional_stability,
          period1.metrics.social_engagement
        ] : [],
        backgroundColor: `${colors.accent}80`,
        borderColor: colors.accent,
        borderWidth: 1,
      },
      {
        label: period2?.name || 'Period 2',
        data: period2 ? [
          period2.metrics.confidence,
          period2.metrics.assertiveness,
          period2.metrics.proactivity,
          period2.metrics.emotional_stability,
          period2.metrics.social_engagement
        ] : [],
        backgroundColor: `${colors.accentDark}80`,
        borderColor: colors.accentDark,
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: colors.text,
          usePointStyle: true,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(35, 35, 64, 0.95)',
        borderColor: colors.accent,
        borderWidth: 1,
        titleColor: colors.text,
        bodyColor: colors.textSecondary,
      },
    },
    scales: {
      x: {
        grid: {
          color: `${colors.border}40`,
        },
        ticks: {
          color: colors.textSecondary,
          maxRotation: 45,
        },
      },
      y: {
        beginAtZero: true,
        max: 100,
        grid: {
          color: `${colors.border}40`,
        },
        ticks: {
          color: colors.textSecondary,
        },
        title: {
          display: true,
          text: 'Score (0-100)',
          color: colors.textSecondary,
        },
      },
    },
  };

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>Temporal Comparison Analysis</h3>
      
      <div style={styles.controlsContainer}>
        {periods.map((period, index) => (
          <button
            key={index}
            style={{
              ...styles.periodSelector,
              ...(selectedPeriods.includes(index) ? styles.activePeriod : {})
            }}
            onClick={() => {
              if (selectedPeriods.includes(index)) return;
              setSelectedPeriods(prev => {
                if (prev[0] === selectedPeriods[0]) {
                  return [prev[0], index];
                } else {
                  return [index, prev[1]];
                }
              });
            }}
          >
            {period.name}
          </button>
        ))}
      </div>

      <div style={styles.chartContainer}>
        <Bar data={chartData} options={chartOptions} />
      </div>

      <div style={styles.comparisonGrid}>
        <div style={styles.periodCard}>
          <div style={styles.periodTitle}>{period1?.name}</div>
          <div style={styles.periodDates}>
            {period1 && `${formatDate(period1.startDate)} - ${formatDate(period1.endDate)}`}
          </div>
          {period1 && (
            <div style={styles.metricsGrid}>
              <div style={styles.metricItem}>
                <div style={styles.metricValue}>{period1.metrics.confidence}</div>
                <div style={styles.metricLabel}>Confidence</div>
              </div>
              <div style={styles.metricItem}>
                <div style={styles.metricValue}>{period1.metrics.assertiveness}</div>
                <div style={styles.metricLabel}>Assertiveness</div>
              </div>
              <div style={styles.metricItem}>
                <div style={styles.metricValue}>{period1.metrics.proactivity}</div>
                <div style={styles.metricLabel}>Proactivity</div>
              </div>
              <div style={styles.metricItem}>
                <div style={styles.metricValue}>{period1.metrics.emotional_stability}</div>
                <div style={styles.metricLabel}>Emotional Stability</div>
              </div>
              <div style={styles.metricItem}>
                <div style={styles.metricValue}>{period1.metrics.social_engagement}</div>
                <div style={styles.metricLabel}>Social Engagement</div>
              </div>
              <div style={styles.metricItem}>
                <div style={styles.metricValue}>{period1.metrics.message_count}</div>
                <div style={styles.metricLabel}>Messages</div>
              </div>
            </div>
          )}
        </div>

        <div style={styles.periodCard}>
          <div style={styles.periodTitle}>{period2?.name}</div>
          <div style={styles.periodDates}>
            {period2 && `${formatDate(period2.startDate)} - ${formatDate(period2.endDate)}`}
          </div>
          {period2 && (
            <div style={styles.metricsGrid}>
              <div style={styles.metricItem}>
                <div style={styles.metricValue}>{period2.metrics.confidence}</div>
                <div style={styles.metricLabel}>Confidence</div>
              </div>
              <div style={styles.metricItem}>
                <div style={styles.metricValue}>{period2.metrics.assertiveness}</div>
                <div style={styles.metricLabel}>Assertiveness</div>
              </div>
              <div style={styles.metricItem}>
                <div style={styles.metricValue}>{period2.metrics.proactivity}</div>
                <div style={styles.metricLabel}>Proactivity</div>
              </div>
              <div style={styles.metricItem}>
                <div style={styles.metricValue}>{period2.metrics.emotional_stability}</div>
                <div style={styles.metricLabel}>Emotional Stability</div>
              </div>
              <div style={styles.metricItem}>
                <div style={styles.metricValue}>{period2.metrics.social_engagement}</div>
                <div style={styles.metricLabel}>Social Engagement</div>
              </div>
              <div style={styles.metricItem}>
                <div style={styles.metricValue}>{period2.metrics.message_count}</div>
                <div style={styles.metricLabel}>Messages</div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div style={styles.insightsContainer}>
        <div style={styles.insightTitle}>Comparative Insights</div>
        <div style={styles.insightText}>
          This temporal comparison reveals developmental patterns in your personality expression 
          and social communication across different time periods, highlighting areas of growth 
          and consistency in your personal evolution.
        </div>
      </div>
    </div>
  );
};