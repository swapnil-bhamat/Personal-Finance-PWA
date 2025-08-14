import React, { useState, useMemo } from 'react';
import { Calculator, TrendingUp, Shield, Wallet, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { overwrite } from 'zod';
import { Box } from '@mui/material';

interface CalculationResult {
  year: number;
  age: number;
  bucket1Start: number;
  bucket2Start: number;
  bucket1Growth: number;
  bucket2Growth: number;
  sipContribution: number;
  bucket2ToB1Transfer: number;
  yearlyWithdrawal: number;
  bucket1End: number;
  bucket2End: number;
  totalAssets: number;
  inflationAdjustedExpenses: number;
  bucket2XIRRAchieved: boolean;
  bucket2ActualReturn: number;
  skippedYears: number;
  yearsTransferred: number;
  cumulativeReturn: number;
  status: 'success' | 'warning' | 'danger';
}

interface FormData {
  totalAssets: number;
  yearlyExpenses: number;
  currentAge: number;
  deathAge: number;
  withdrawalDate: string;
  sipAmount: number;
  sipYears: number;
}

const SwpPage: React.FC = () => {
  const [formData, setFormData] = useState<FormData>({
    totalAssets: 10000000,
    yearlyExpenses: 350000,
    currentAge: 45,
    deathAge: 85,
    withdrawalDate: '2025-01-01',
    sipAmount: 50000,
    sipYears: 5
  });

  const [showResults, setShowResults] = useState(false);

  const handleInputChange = (field: keyof FormData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: field === 'withdrawalDate' ? value : Number(value)
    }));
  };

  const calculations = useMemo((): { results: CalculationResult[], isViable: boolean, totalYears: number, avgBucket2Return: number } => {
    const { totalAssets, yearlyExpenses, currentAge, deathAge, sipAmount, sipYears } = formData;
    
    const bucket1Initial = yearlyExpenses * 5;
    const bucket2Initial = totalAssets - bucket1Initial;
    
    if (bucket2Initial <= 0) {
      return { results: [], isViable: false, totalYears: 0, avgBucket2Return: 0 };
    }

    const indianEquityReturns = [
      0.18, -0.08, 0.25, 0.32, -0.12, 0.28, 0.15, -0.05, 0.22, 0.08,
      0.35, -0.15, 0.19, 0.42, -0.18, 0.31, 0.11, -0.02, 0.26, 0.06,
      0.29, -0.11, 0.16, 0.38, -0.09, 0.24, 0.14, 0.03, 0.20, 0.07,
      0.33, -0.13, 0.21, 0.27, -0.06, 0.17, 0.09, -0.04, 0.23, 0.12
    ];

    const results: CalculationResult[] = [];
    const totalYears = deathAge - currentAge;
    
    let bucket1Balance = bucket1Initial;
    let bucket2Balance = bucket2Initial;
    let currentExpenses = yearlyExpenses;
    let pendingTransfers = 0;

    for (let year = 0; year < totalYears; year++) {
      const currentYear = new Date().getFullYear() + year;
      const currentUserAge = currentAge + year;
      
      const bucket1Start = bucket1Balance;
      const bucket2Start = bucket2Balance;
      
      const bucket1Growth = bucket1Balance * 0.06;
      bucket1Balance += bucket1Growth;
      
      const equityReturnRate = indianEquityReturns[year % indianEquityReturns.length];
      const bucket2Growth = bucket2Balance * equityReturnRate;
      bucket2Balance += bucket2Growth;
      
      let sipContribution = 0;
      if (year < sipYears) {
        sipContribution = sipAmount * 12;
        bucket2Balance += sipContribution;
      }
      
      let bucket2ToB1Transfer = 0;
      let yearsTransferred = 0;
      
      const minBucket1Balance = currentExpenses * 2;
      const transferNeeded = Math.max(0, minBucket1Balance - bucket1Balance);
      
      if (bucket2Balance > 0 && transferNeeded > 0) {
        bucket2ToB1Transfer = Math.min(transferNeeded, bucket2Balance);
        bucket2Balance -= bucket2ToB1Transfer;
        bucket1Balance += bucket2ToB1Transfer;
        yearsTransferred = Math.ceil(bucket2ToB1Transfer / currentExpenses);
      } else if (equityReturnRate >= 0.12 && bucket2Balance >= currentExpenses) {
        const totalToTransfer = currentExpenses * (1 + pendingTransfers);
        if (bucket2Balance >= totalToTransfer) {
          bucket2ToB1Transfer = totalToTransfer;
          bucket2Balance -= bucket2ToB1Transfer;
          bucket1Balance += bucket2ToB1Transfer;
          yearsTransferred = 1 + pendingTransfers;
          pendingTransfers = 0;
        } else {
          bucket2ToB1Transfer = Math.min(currentExpenses, bucket2Balance);
          bucket2Balance -= bucket2ToB1Transfer;
          bucket1Balance += bucket2ToB1Transfer;
          yearsTransferred = 1;
        }
      } else if (equityReturnRate < 0.12) {
        pendingTransfers = Math.min(pendingTransfers + 1, 3);
      }
      
      const yearlyWithdrawal = currentExpenses;
      bucket1Balance -= yearlyWithdrawal;
      
      if (bucket1Balance < 0 && bucket2Balance > 0) {
        const emergencyAmount = Math.min(-bucket1Balance, bucket2Balance);
        bucket2Balance -= emergencyAmount;
        bucket1Balance += emergencyAmount;
      }
      
      const bucket1End = bucket1Balance;
      const bucket2End = bucket2Balance;
      const totalAssets = bucket1End + bucket2End;
      
      let status: 'success' | 'warning' | 'danger' = 'success';
      if (totalAssets < 0) {
        status = 'danger';
      } else if (bucket1End < 0 || totalAssets < currentExpenses * 2) {
        status = 'warning';
      }
      
      results.push({
        year: currentYear,
        age: currentUserAge,
        bucket1Start,
        bucket2Start,
        bucket1Growth,
        bucket2Growth,
        sipContribution,
        bucket2ToB1Transfer,
        yearlyWithdrawal,
        bucket1End,
        bucket2End,
        totalAssets,
        inflationAdjustedExpenses: currentExpenses,
        bucket2XIRRAchieved: equityReturnRate >= 0.12,
        bucket2ActualReturn: equityReturnRate * 100,
        skippedYears: pendingTransfers,
        yearsTransferred,
        cumulativeReturn: 0,
        status
      });
      
      currentExpenses *= 1.06;
    }
    
    const isViable = results.every(result => result.totalAssets >= 0 && result.bucket1End >= 0);
    const totalReturns = results.reduce((sum, result) => sum + result.bucket2ActualReturn, 0);
    const avgBucket2Return = totalReturns / results.length;
    
    return { results, isViable, totalYears, avgBucket2Return };
  }, [formData]);

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleCalculate = () => {
    setShowResults(true);
  };

  const bucket1Initial = formData.yearlyExpenses * 5;
  const bucket2Initial = formData.totalAssets - bucket1Initial;
  const currentSWR = (formData.yearlyExpenses / formData.totalAssets) * 100;

  return (
    <Box sx={{ overflow: "auto"}}> 
      <div className="max-w-7xl mx-auto p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-lg mb-6 p-6">
        <div className="flex items-center gap-3 mb-6">
          <Calculator className="w-10 h-10 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-800">3.5% SWR Personal Finance Calculator</h1>
        </div>
        
        {/* Input Fields */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Total Assets (₹)</label>
            <input
              type="number"
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={formData.totalAssets}
              onChange={(e) => handleInputChange('totalAssets', e.target.value)}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Yearly Expenses (₹)</label>
            <input
              type="number"
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={formData.yearlyExpenses}
              onChange={(e) => handleInputChange('yearlyExpenses', e.target.value)}
            />
            <p className="text-xs text-gray-500 mt-1">
              Suggested: ₹{(formData.totalAssets * 0.035).toLocaleString('en-IN')} (3.5%)
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Current Age</label>
            <input
              type="number"
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={formData.currentAge}
              onChange={(e) => handleInputChange('currentAge', e.target.value)}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Expected Death Age</label>
            <input
              type="number"
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={formData.deathAge}
              onChange={(e) => handleInputChange('deathAge', e.target.value)}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Monthly SIP (₹)</label>
            <input
              type="number"
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={formData.sipAmount}
              onChange={(e) => handleInputChange('sipAmount', e.target.value)}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">SIP Duration (Years)</label>
            <input
              type="number"
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={formData.sipYears}
              onChange={(e) => handleInputChange('sipYears', e.target.value)}
            />
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-100 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold text-blue-800">Bucket 1 (Safe)</h3>
            </div>
            <p className="text-sm text-blue-700 mb-1">5x yearly expenses in debt funds, FDs</p>
            <p className="text-xl font-bold text-blue-800">{formatCurrency(bucket1Initial)}</p>
            <p className="text-xs text-blue-600">Expected Return: 6% XIRR</p>
          </div>
          
          <div className="bg-green-100 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              <h3 className="font-semibold text-green-800">Bucket 2 (Growth)</h3>
            </div>
            <p className="text-sm text-green-700 mb-1">Remaining in equity MF, index funds</p>
            <p className="text-xl font-bold text-green-800">{formatCurrency(bucket2Initial)}</p>
            <p className="text-xs text-green-600">Simulated Indian Market Returns</p>
          </div>
          
          <div className="bg-purple-100 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Wallet className="w-5 h-5 text-purple-600" />
              <h3 className="font-semibold text-purple-800">Withdrawal Rate</h3>
            </div>
            <p className="text-sm text-purple-700 mb-1">Annual withdrawal from Bucket 1</p>
            <p className="text-xl font-bold text-purple-800">{formatCurrency(formData.yearlyExpenses)}</p>
            <p className="text-xs text-purple-600">Adjusted for 6% inflation</p>
          </div>
          
          <div className="bg-orange-100 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Calculator className="w-5 h-5 text-orange-600" />
              <h3 className="font-semibold text-orange-800">SIP Contribution</h3>
            </div>
            <p className="text-sm text-orange-700 mb-1">Monthly to Bucket 2 for {formData.sipYears} years</p>
            <p className="text-xl font-bold text-orange-800">{formatCurrency(formData.sipAmount)}/month</p>
            <p className="text-xs text-orange-600">
              Total: {formatCurrency(formData.sipAmount * 12 * formData.sipYears)}
            </p>
          </div>
        </div>

        <button
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg flex items-center justify-center gap-2 transition-colors"
          onClick={handleCalculate}
        >
          <Calculator className="w-5 h-5" />
          Calculate Financial Projection
        </button>
      </div>

      {/* Results */}
      {showResults && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center gap-3 mb-6">
            {calculations.isViable ? (
              <CheckCircle className="w-10 h-10 text-green-600" />
            ) : (
              <XCircle className="w-10 h-10 text-red-600" />
            )}
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Projection Results</h2>
              <p className={`font-semibold ${calculations.isViable ? 'text-green-600' : 'text-red-600'}`}>
                {calculations.isViable 
                  ? 'Your retirement plan looks sustainable!' 
                  : 'Your retirement plan may need adjustments.'
                }
              </p>
            </div>
          </div>

          {/* Performance Summary */}
          {calculations.avgBucket2Return > 0 && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-5 h-5 text-green-600" />
                <h3 className="text-lg font-semibold">Performance & SWR Analysis</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Current SWR</p>
                  <p className="text-2xl font-bold text-blue-600">{currentSWR.toFixed(2)}%</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Average B2 Return</p>
                  <p className="text-2xl font-bold text-green-600">{calculations.avgBucket2Return.toFixed(2)}%</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Years with ≥12% Return</p>
                  <p className="text-2xl font-bold text-indigo-600">
                    {calculations.results.filter(r => r.bucket2XIRRAchieved).length}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total SIP Investment</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {formatCurrency(formData.sipAmount * 12 * formData.sipYears)}
                  </p>
                </div>
              </div>
              {currentSWR > 4.0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mt-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-yellow-600" />
                    <div>
                      <h4 className="font-semibold text-yellow-800">Warning</h4>
                      <p className="text-sm text-yellow-700">
                        Your withdrawal rate is {currentSWR.toFixed(2)}%, which is higher than the safe 3.5-4% range. 
                        Consider reducing yearly expenses or increasing total assets.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Results Table */}
          {bucket2Initial <= 0 ? (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex items-center gap-2">
                <XCircle className="w-5 h-5 text-red-600" />
                <div>
                  <h4 className="font-semibold text-red-800">Error</h4>
                  <p className="text-sm text-red-700">
                    Total assets are insufficient to cover 5x yearly expenses in Bucket 1.
                    Please increase your total assets or reduce yearly expenses.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border p-2 text-left">Year</th>
                    <th className="border p-2 text-left">Age</th>
                    <th className="border p-2 text-left">B1 Start</th>
                    <th className="border p-2 text-left">B2 Start</th>
                    <th className="border p-2 text-left">B2 Growth</th>
                    <th className="border p-2 text-left">SIP</th>
                    <th className="border p-2 text-left">B2→B1</th>
                    <th className="border p-2 text-left">Years T.</th>
                    <th className="border p-2 text-left">Withdrawal</th>
                    <th className="border p-2 text-left">B1 End</th>
                    <th className="border p-2 text-left">B2 End</th>
                    <th className="border p-2 text-left">Total</th>
                    <th className="border p-2 text-left">B2 Return</th>
                    <th className="border p-2 text-left">12% Met</th>
                  </tr>
                </thead>
                <tbody>
                  {calculations.results.map((result, index) => (
                    <tr
                      key={index}
                      className={`
                        ${result.status === 'danger' ? 'bg-red-100' :
                          result.status === 'warning' ? 'bg-yellow-100' : 'hover:bg-gray-50'}
                      `}
                    >
                      <td className="border p-2">{result.year}</td>
                      <td className="border p-2">{result.age}</td>
                      <td className="border p-2">{formatCurrency(result.bucket1Start)}</td>
                      <td className="border p-2 text-green-600 font-semibold">
                        {formatCurrency(result.bucket2Start)}
                      </td>
                      <td className={`border p-2 font-semibold ${result.bucket2Growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(result.bucket2Growth)}
                      </td>
                      <td className="border p-2 text-orange-600 font-semibold">
                        {result.sipContribution > 0 ? formatCurrency(result.sipContribution) : '-'}
                      </td>
                      <td className="border p-2 text-purple-600 font-semibold">
                        {result.bucket2ToB1Transfer > 0 ? formatCurrency(result.bucket2ToB1Transfer) : '-'}
                      </td>
                      <td className="border p-2 text-center">
                        {result.yearsTransferred > 0 ? (
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${
                            result.yearsTransferred > 1 ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {result.yearsTransferred}Y
                          </span>
                        ) : '-'}
                      </td>
                      <td className="border p-2 text-red-600 font-semibold">
                        {formatCurrency(result.yearlyWithdrawal)}
                      </td>
                      <td className="border p-2">{formatCurrency(result.bucket1End)}</td>
                      <td className="border p-2 text-green-600 font-semibold">
                        {formatCurrency(result.bucket2End)}
                      </td>
                      <td className="border p-2 font-bold">{formatCurrency(result.totalAssets)}</td>
                      <td className={`border p-2 font-semibold ${result.bucket2ActualReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {result.bucket2ActualReturn.toFixed(1)}%
                      </td>
                      <td className="border p-2 text-center">
                        {result.bucket2XIRRAchieved ? (
                          <CheckCircle className="w-4 h-4 text-green-600 mx-auto" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-red-600 mx-auto" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Footer Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
              <h4 className="font-semibold text-blue-800 mb-1">Assumptions</h4>
              <p className="text-sm text-blue-700">
                Bucket 1: 6% XIRR, Bucket 2: Real Indian equity returns + SIP contributions, Inflation: 6%
              </p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-md p-3">
              <h4 className="font-semibold text-green-800 mb-1">SIP Strategy</h4>
              <p className="text-sm text-green-700">
                ₹{(formData.sipAmount/1000)}K/month for {formData.sipYears} years into Bucket 2. 
                Total: {formatCurrency(formData.sipAmount * 12 * formData.sipYears)}
              </p>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
              <h4 className="font-semibold text-yellow-800 mb-1">Safety Net</h4>
              <p className="text-sm text-yellow-700">
                Emergency withdrawals from Bucket 2 if Bucket 1 depletes. 
                Orange shows SIP contributions.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
    </Box>
    
  );
};

export default SwpPage;