import React from 'react';

interface CropAnalyticsProps {
  farmId: string;
}

const CropAnalytics: React.FC<CropAnalyticsProps> = ({ farmId }) => {
  return (
    <div className="h-80 flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 rounded-xl border-2 border-dashed border-green-300">
      <div className="text-center space-y-2">
        <div className="text-4xl">🌾</div>
        <h3 className="text-lg font-medium text-neutral-700">Crop Analytics</h3>
        <p className="text-sm text-neutral-500">Farm ID: {farmId}</p>
        <p className="text-xs text-neutral-400">Crop analytics component will be implemented here</p>
      </div>
    </div>
  );
};

export default CropAnalytics;