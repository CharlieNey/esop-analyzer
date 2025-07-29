import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info } from 'lucide-react';

interface DataQualityIndicatorProps {
  metrics: {
    [key: string]: number | null | undefined;
  };
}

const DataQualityIndicator: React.FC<DataQualityIndicatorProps> = ({ metrics }) => {
  const totalFields = Object.keys(metrics).length;
  const filledFields = Object.values(metrics).filter(value => value !== null && value !== undefined).length;
  const completeness = totalFields > 0 ? (filledFields / totalFields) * 100 : 0;
  
  const getQualityLevel = (completeness: number) => {
    if (completeness >= 90) return { level: 'excellent', color: 'green', icon: CheckCircle2 };
    if (completeness >= 70) return { level: 'good', color: 'blue', icon: Info };
    if (completeness >= 50) return { level: 'fair', color: 'yellow', icon: AlertTriangle };
    return { level: 'poor', color: 'red', icon: XCircle };
  };
  
  const quality = getQualityLevel(completeness);
  const Icon = quality.icon;
  
  const getQualityMessage = (level: string, completeness: number) => {
    switch (level) {
      case 'excellent':
        return `Excellent data quality - ${completeness.toFixed(0)}% of key metrics extracted successfully`;
      case 'good':
        return `Good data quality - ${completeness.toFixed(0)}% of key metrics available`;
      case 'fair':
        return `Fair data quality - ${completeness.toFixed(0)}% of metrics found. Some values may be missing`;
      case 'poor':
        return `Limited data quality - Only ${completeness.toFixed(0)}% of metrics extracted. Manual review recommended`;
      default:
        return `Data quality: ${completeness.toFixed(0)}% complete`;
    }
  };
  
  const colorClasses = {
    green: 'bg-green-50 border-green-200 text-green-800',
    blue: 'bg-blue-50 border-blue-200 text-blue-800',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    red: 'bg-red-50 border-red-200 text-red-800',
  };
  
  const iconColorClasses = {
    green: 'text-green-600',
    blue: 'text-blue-600',
    yellow: 'text-yellow-600',
    red: 'text-red-600',
  };
  
  return (
    <div className={`rounded-lg border p-3 ${colorClasses[quality.color as keyof typeof colorClasses]}`}>
      <div className="flex items-start space-x-2">
        <Icon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${iconColorClasses[quality.color as keyof typeof iconColorClasses]}`} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">
            {getQualityMessage(quality.level, completeness)}
          </p>
          {quality.level !== 'excellent' && (
            <p className="text-xs mt-1 opacity-80">
              Missing values may indicate the document structure doesn't match expected formats or the data wasn't clearly extractable.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default DataQualityIndicator;