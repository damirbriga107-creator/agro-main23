import React from 'react';

interface FinancialChartProps {
  period: '7d' | '30d' | '90d' | '1y';
}

const FinancialChart: React.FC<FinancialChartProps> = ({ period }) => {
  return (
    <div className="h-80 flex items-center justify-center bg-gradient-to-br from-neutral-50 to-neutral-100 rounded-xl border-2 border-dashed border-neutral-300">
      <div className="text-center space-y-2">
        <div className="text-4xl">📊</div>
        <h3 className="text-lg font-medium text-neutral-700">Financial Chart</h3>
        <p className="text-sm text-neutral-500">Period: {period}</p>
        <p className="text-xs text-neutral-400">Chart component will be implemented here</p>
      </div>
    </div>
  );
};

export default FinancialChart;