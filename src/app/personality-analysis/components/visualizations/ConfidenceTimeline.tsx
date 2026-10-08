import React, { useEffect, useRef, CSSProperties } from 'react';
import { DESIGN_TOKENS } from '@/components/shared/styles/design-tokens';
import { safeArray, safeArrayAccess, safeLength } from '../../utils/data-safety';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const { colors, spacing } = DESIGN_TOKENS;

interface ConfidenceTimelineProps {
  data: Array<{
    timestamp: string;
    week: string;
    assertive_score: number;
    hesitant_score: number;
    overall_confidence: number;
    message_count: number;
  }>;
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
  
  chartContainer: {
    position: 'relative',
    height: '400px',
    marginBottom: spacing.lg,
  } as CSSProperties,
  
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: spacing.md,
    marginTop: spacing.lg,
  } as CSSProperties,
  
  statCard: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: '8px',
    border: `1px solid ${colors.border}`,
    textAlign: 'center',
  } as CSSProperties,
  
  statValue: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: colors.accent,
    marginBottom: spacing.xs,
  } as CSSProperties,
  
  statLabel: {
    fontSize: '0.875rem',
    color: colors.textSecondary,
  } as CSSProperties,
  
  legend: {
    display: 'flex',
    justifyContent: 'center',
    gap: spacing.lg,
    marginBottom: spacing.md,
    flexWrap: 'wrap',
  } as CSSProperties,
  
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.xs,
    fontSize: '0.875rem',
    color: colors.textSecondary,
  } as CSSProperties,
  
  legendColor: {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
  } as CSSProperties,

  '@media (max-width: 768px)': {
    chartContainer: {
      height: '300px',
    },
    statsGrid: {
      gridTemplateColumns: '1fr 1fr',
    },
  },
};

export const ConfidenceTimeline: React.FC<ConfidenceTimelineProps> = ({ data }) => {
  const chartRef = useRef<any>(null);

  // Process data for chart
  const processedData = data.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  
  const labels = processedData.map(point => {
    const date = new Date(point.timestamp);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  });

  const assertiveData = processedData.map(point => point.assertive_score);
  const hesitantData = processedData.map(point => point.hesitant_score);
  const overallData = processedData.map(point => point.overall_confidence);

  // Calculate statistics
  const avgAssertive = assertiveData.reduce((a, b) => a + b, 0) / assertiveData.length || 0;
  const avgHesitant = hesitantData.reduce((a, b) => a + b, 0) / hesitantData.length || 0;
  const avgOverall = overallData.reduce((a, b) => a + b, 0) / overallData.length || 0;
  const trend = overallData.length > 1 ? 
    overallData[overallData.length - 1] - overallData[0] : 0;

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Overall Confidence',
        data: overallData,
        borderColor: colors.accent,
        backgroundColor: `${colors.accent}20`,
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: colors.accent,
        pointBorderColor: colors.background,
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 7,
      },
      {
        label: 'Assertive Language',
        data: assertiveData,
        borderColor: colors.accentDark,
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderDash: [5, 5],
        fill: false,
        tension: 0.4,
        pointBackgroundColor: colors.accentDark,
        pointBorderColor: colors.background,
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
      {
        label: 'Hesitant Language',
        data: hesitantData,
        borderColor: '#FF6B6B',
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderDash: [2, 2],
        fill: false,
        tension: 0.4,
        pointBackgroundColor: '#FF6B6B',
        pointBorderColor: colors.background,
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(35, 35, 64, 0.95)',
        borderColor: colors.accent,
        borderWidth: 1,
        titleColor: colors.text,
        bodyColor: colors.textSecondary,
        callbacks: {
          label: function(context: any) {
            const point = processedData[context.dataIndex];
            return [
              `${context.dataset.label}: ${context.parsed.y.toFixed(1)}`,
              `Messages: ${point.message_count}`,
            ];
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          color: `${colors.border}40`,
        },
        ticks: {
          color: colors.textSecondary,
          maxTicksLimit: 8,
        },
      },
      y: {
        grid: {
          color: `${colors.border}40`,
        },
        ticks: {
          color: colors.textSecondary,
        },
        title: {
          display: true,
          text: 'Confidence Score',
          color: colors.textSecondary,
        },
      },
    },
    elements: {
      point: {
        hoverBackgroundColor: colors.accent,
      },
    },
    interaction: {
      intersect: false,
      mode: 'index' as const,
    },
  };

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>Confidence Evolution Timeline</h3>
      
      <div style={styles.legend}>
        <div style={styles.legendItem}>
          <div style={{...styles.legendColor, backgroundColor: colors.accent}} />
          <span>Overall Confidence</span>
        </div>
        <div style={styles.legendItem}>
          <div style={{...styles.legendColor, backgroundColor: colors.accentDark}} />
          <span>Assertive Language</span>
        </div>
        <div style={styles.legendItem}>
          <div style={{...styles.legendColor, backgroundColor: '#FF6B6B'}} />
          <span>Hesitant Language</span>
        </div>
      </div>
      
      <div style={styles.chartContainer}>
        <Line ref={chartRef} data={chartData} options={options} />
      </div>
      
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statValue}>{avgOverall.toFixed(1)}</div>
          <div style={styles.statLabel}>Average Confidence</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statValue}>{avgAssertive.toFixed(1)}</div>
          <div style={styles.statLabel}>Average Assertiveness</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statValue}>{avgHesitant.toFixed(1)}</div>
          <div style={styles.statLabel}>Average Hesitancy</div>
        </div>
        <div style={styles.statCard}>
          <div style={{
            ...styles.statValue,
            color: trend >= 0 ? colors.accent : '#FF6B6B'
          }}>
            {trend >= 0 ? '+' : ''}{trend.toFixed(1)}
          </div>
          <div style={styles.statLabel}>Confidence Trend</div>
        </div>
      </div>
    </div>
  );
};