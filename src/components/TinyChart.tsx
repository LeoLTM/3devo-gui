import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
} from 'chart.js';
import { DataRow } from '@/types/extruder';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler);

interface TinyChartProps {
  data: DataRow[];
  field: keyof DataRow;
  color: string;
  className?: string;
}

export function TinyChart({ data, field, color, className = '' }: TinyChartProps) {
  // Show placeholder if insufficient data
  if (data.length < 2) {
    return (
      <div className={`inline-block w-20 h-[30px] bg-gray-100 rounded ${className}`} />
    );
  }

  // Take last 50 data points
  const recentData = data.slice(-50);
  const values = recentData.map((d) => d[field] as number);

  const chartData = {
    labels: recentData.map((_, i) => i.toString()),
    datasets: [
      {
        data: values,
        borderColor: color,
        backgroundColor: `${color}20`, // 20 = 12.5% opacity in hex
        borderWidth: 1.5,
        fill: true,
        tension: 0.3,
        pointRadius: 0,
        pointHoverRadius: 0,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false as const,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        enabled: false,
      },
    },
    scales: {
      x: {
        display: false,
      },
      y: {
        display: false,
      },
    },
    elements: {
      point: {
        radius: 0,
      },
    },
  };

  return (
    <div className={`inline-block w-20 h-[30px] ${className}`}>
      <Line data={chartData} options={options} />
    </div>
  );
}
