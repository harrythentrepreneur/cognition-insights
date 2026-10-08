import React, { useEffect, useRef, CSSProperties } from 'react';
import { Chart as ChartJS, RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend } from 'chart.js';
import { Radar } from 'react-chartjs-2';
import { DESIGN_TOKENS } from '@/components/shared/styles/design-tokens';

const { colors, fonts, spacing } = DESIGN_TOKENS;

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

interface PersonalityRadarProps {
  data: Record<string, number>;
}

const styles = {
  container: {
    width: '100%',
    maxWidth: '600px',
    margin: '0 auto',
    position: 'relative' as const,
  } as CSSProperties,
  
  title: {
    textAlign: 'center' as const,
    fontSize: '1.25rem',
    fontWeight: 500,
    color: colors.text,
    marginBottom: '1rem',
  } as CSSProperties,
};

export const PersonalityRadar: React.FC<PersonalityRadarProps> = ({ data }) => {
  const chartRef = useRef<any>(null);
  
  // Select key personality dimensions for radar chart
  const dimensions = [
    { key: 'expressiveness', label: 'Expressiveness' },
    { key: 'empathy', label: 'Empathy' },
    { key: 'responsiveness', label: 'Responsiveness' },
    { key: 'openness', label: 'Openness' },
    { key: 'emotional_stability', label: 'Stability' },
    { key: 'creativity', label: 'Creativity' },
    { key: 'conscientiousness', label: 'Conscientiousness' },
    { key: 'social_confidence', label: 'Social Confidence' },
  ];
  
  const chartData = {
    labels: dimensions.map(d => d.label),
    datasets: [
      {
        label: 'Your Profile',
        data: dimensions.map(d => data[d.key] || 50),
        backgroundColor: 'rgba(0, 255, 230, 0.2)',
        borderColor: colors.accent,
        borderWidth: 2,
        pointBackgroundColor: colors.accent,
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: colors.accent,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
      {
        label: 'Average',
        data: dimensions.map(() => 50),
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderColor: colors.border,
        borderWidth: 1,
        pointBackgroundColor: colors.border,
        pointBorderColor: colors.background,
        pointRadius: 0,
        borderDash: [5, 5],
      },
    ],
  };
  
  const options = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        display: true,
        position: 'bottom' as const,
        labels: {
          color: colors.textSecondary,
          padding: 20,
          font: {
            size: 12,
          },
        },
      },
      tooltip: {
        backgroundColor: 'rgba(35, 35, 64, 0.95)',
        borderColor: colors.accent,
        borderWidth: 1,
        titleColor: colors.text,
        bodyColor: colors.textSecondary,
        padding: 12,
        displayColors: false,
        callbacks: {
          label: (context: any) => {
            return `${context.dataset.label}: ${context.parsed.r}%`;
          },
        },
      },
    },
    scales: {
      r: {
        angleLines: {
          color: colors.border,
        },
        grid: {
          color: colors.border,
        },
        pointLabels: {
          color: colors.text,
          font: {
            size: 12,
            weight: 500,
          },
          padding: 15,
        },
        ticks: {
          color: colors.textSecondary,
          backdropColor: 'transparent',
          stepSize: 25,
          min: 0,
          max: 100,
          callback: (value: any) => `${value}%`,
        },
      },
    },
    elements: {
      line: {
        tension: 0.3,
      },
    },
  };
  
  return (
    <div style={styles.container}>
      <h4 style={styles.title}>Personality Dimensions</h4>
      <Radar ref={chartRef} data={chartData} options={options} />
    </div>
  );
};