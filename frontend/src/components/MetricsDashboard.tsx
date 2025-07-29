import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { DollarSign, TrendingUp, Users, Percent } from 'lucide-react';
import { getDocumentMetrics } from '../services/api';
import { DocumentMetrics } from '../types';

interface MetricsDashboardProps {
  documentId: string;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

const MetricsDashboard: React.FC<MetricsDashboardProps> = ({ documentId }) => {
  const [metrics, setMetrics] = useState<DocumentMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const data = await getDocumentMetrics(documentId);
        setMetrics(data);
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to load metrics');
      } finally {
        setLoading(false);
      }
    };

    if (documentId) {
      fetchMetrics();
    }
  }, [documentId]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded mb-4"></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center text-red-600">{error}</div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center text-gray-500">No metrics available</div>
      </div>
    );
  }

  const companyVal = metrics.metrics.companyValuation?.data;
  const keyFinancials = metrics.metrics.keyFinancials?.data;
  const capitalStructure = metrics.metrics.capitalStructure?.data;
  const discountRates = metrics.metrics.discountRates?.data;
  const valuationMultiples = metrics.metrics.valuationMultiples?.data;

  const financialData = keyFinancials ? [
    { name: 'Revenue', value: parseFloat(keyFinancials.revenue) || 0 },
    { name: 'EBITDA', value: parseFloat(keyFinancials.ebitda) || 0 },
    { name: 'Net Income', value: parseFloat(keyFinancials.netIncome) || 0 },
  ] : [];

  const capitalData = capitalStructure ? [
    { name: 'ESOP Shares', value: parseFloat(capitalStructure.esopShares) || 0 },
    { name: 'Other Shares', value: (parseFloat(capitalStructure.totalShares) || 0) - (parseFloat(capitalStructure.esopShares) || 0) },
  ] : [];

  const formatCurrency = (value: string | number) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num || 0);
  };

  const formatPercent = (value: string | number) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return `${(num || 0).toFixed(2)}%`;
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">ESOP Valuation Dashboard</h2>
        <span className="text-sm text-gray-500">{metrics.filename}</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <MetricCard
          title="Company Value"
          value={companyVal ? formatCurrency(companyVal.totalValue) : 'N/A'}
          icon={<DollarSign className="h-6 w-6" />}
          color="blue"
        />
        <MetricCard
          title="Per Share Value"
          value={companyVal ? formatCurrency(companyVal.perShareValue) : 'N/A'}
          icon={<TrendingUp className="h-6 w-6" />}
          color="green"
        />
        <MetricCard
          title="ESOP Ownership"
          value={capitalStructure ? formatPercent(capitalStructure.esopPercentage) : 'N/A'}
          icon={<Users className="h-6 w-6" />}
          color="yellow"
        />
        <MetricCard
          title="Discount Rate"
          value={discountRates ? formatPercent(discountRates.discountRate) : 'N/A'}
          icon={<Percent className="h-6 w-6" />}
          color="red"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {financialData.length > 0 && (
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Key Financial Metrics</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={financialData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis tickFormatter={(value) => formatCurrency(value)} />
                <Tooltip formatter={(value) => formatCurrency(value as number)} />
                <Bar dataKey="value" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {capitalData.length > 0 && (
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Capital Structure</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={capitalData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {capitalData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {valuationMultiples && (
        <div className="mt-6 bg-gray-50 rounded-lg p-4">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Valuation Multiples</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {parseFloat(valuationMultiples.revenueMultiple)?.toFixed(1) || 'N/A'}x
              </div>
              <div className="text-sm text-gray-500">Revenue Multiple</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {parseFloat(valuationMultiples.ebitdaMultiple)?.toFixed(1) || 'N/A'}x
              </div>
              <div className="text-sm text-gray-500">EBITDA Multiple</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface MetricCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'yellow' | 'red';
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, icon, color }) => {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    red: 'bg-red-50 text-red-600',
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-lg font-semibold text-gray-900">{value}</p>
        </div>
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
};

export default MetricsDashboard;