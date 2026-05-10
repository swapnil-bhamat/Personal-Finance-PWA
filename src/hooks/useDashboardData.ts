import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../services/db";
import type { AssetPurpose } from "../services/db";
import { calculateProjectedValue } from "../services/projectionService";

const getGoalAllocationByName = (
  goals: Array<{ name: string; allocatedAmount: number }>,
  matcher: RegExp,
) =>
  goals
    .filter((goal) => matcher.test(goal.name))
    .reduce((sum, goal) => sum + goal.allocatedAmount, 0);

export function useDashboardData() {
  const holders = useLiveQuery(() => db.holders.toArray()) || [];
  const accounts = useLiveQuery(() => db.accounts.toArray()) || [];
  const cashFlows = useLiveQuery(() => db.cashFlow.toArray()) || [];

  let transferRows: Array<{
      holderName: string;
      bankInfo: string;
      amount: number;
    }> = [],
    totalTransferAmount = 0;
  holders.forEach((holder) => {
    const holderAccounts = accounts.filter(
      (acc) => acc.holders_id === holder.id,
    );
    holderAccounts.forEach((acc) => {
      const amount = cashFlows
        .filter(
          (cf) => cf.holders_id === holder.id && cf.accounts_id === acc.id,
        )
        .reduce((sum, cf) => sum + (cf.monthly || 0), 0);
      if (amount !== 0) {
        totalTransferAmount += amount;
        transferRows.push({
          holderName: holder.name,
          bankInfo: acc.bank,
          amount,
        });
      }
    });
  });
  transferRows = transferRows.sort((a, b) => {
    const nameCompare = a.holderName.localeCompare(b.holderName);
    if (nameCompare !== 0) return nameCompare;
    return b.amount - a.amount;
  });

  const assetClassColors = [
    "#2ecc71",
    "#e74c3c",
    "#f1c40f",
    "#3498db",
    "#9b59b6",
    "#34495e",
  ];
  const assetGoalColors = [
    "#8e44ad",
    "#16a085",
    "#d35400",
    "#c0392b",
    "#27ae60",
    "#2980b9",
  ];
  const savingsColors = [
    "#f39c12",
    "#1abc9c",
    "#e67e22",
    "#7f8c8d",
    "#bdc3c7",
    "#2c3e50",
  ];

  const totalAssets =
    useLiveQuery(() =>
      db.assetsHoldings
        .toArray()
        .then((holdings) =>
          holdings.reduce(
            (sum, holding) => sum + holding.existingAllocation,
            0,
          ),
        ),
    ) || 0;

  const liabilitiesData = useLiveQuery(async () => {
    const liabilities = await db.liabilities.toArray();
    const loanTypes = await db.loanTypes.toArray();
    const { calculateRemainingBalance, calculateEMI } =
      await import("../utils/financialUtils");

    return liabilities.reduce(
      (acc, liability) => {
        const loanType = loanTypes.find(
          (lt) => lt.id === liability.loanType_id,
        );
        if (!loanType) return acc;

        const balance = calculateRemainingBalance(
          liability.loanAmount,
          loanType.interestRate,
          liability.totalMonths,
          liability.loanStartDate,
        );

        let emi = 0;
        if (balance > 0) {
          emi = calculateEMI(
            liability.loanAmount,
            loanType.interestRate,
            liability.totalMonths,
          );
        }

        return { sum: acc.sum + balance, emi: acc.emi + emi };
      },
      { sum: 0, emi: 0 },
    );
  }) || { sum: 0, emi: 0 };

  const totalLiabilities = liabilitiesData.sum;
  const totalEmi = liabilitiesData.emi;

  const netWorth = totalAssets - totalLiabilities;

  const expensesByPurpose =
    useLiveQuery(async () => {
      const purposes = await db.assetPurposes.toArray();
      const cashFlows = await db.cashFlow.toArray();
      const totalMonthlyIncome = await db.income
        .toArray()
        .then((incomes) =>
          incomes.reduce((sum, item) => sum + Number(item.monthly), 0),
        );
      const purposeMap = purposes.reduce(
        (
          map: Record<number, { name: string; total: number }>,
          purpose: AssetPurpose,
        ) => {
          if (purpose.id) {
            map[purpose.id] = { name: purpose.name, total: 0 };
          }
          return map;
        },
        {},
      );

      cashFlows.forEach((flow) => {
        if (flow.assetPurpose_id && purposeMap[flow.assetPurpose_id]) {
          purposeMap[flow.assetPurpose_id].total += flow.monthly;
        }
      });

      return Object.values(purposeMap)
        .filter(
          (purpose): purpose is { name: string; total: number } =>
            purpose.total > 0,
        )
        .map((purpose) => ({
          id: purpose.name,
          value: purpose.total,
          label: purpose.name,
          total: totalMonthlyIncome,
        }));
    }) || [];

  const withPercentage = ["Need", "Savings", "Want"]
    .map((key) => {
      const item = expensesByPurpose.find((i) => i.id === key);
      if (!item) return null;
      const percentage = (item.value / item.total) * 100;
      let isValid = true;
      let rule = "";

      if (key === "Need") {
        rule = "≤ 50%";
        if (percentage > 50) isValid = false;
      }
      if (key === "Want") {
        rule = "≤ 20%";
        if (percentage > 20) isValid = false;
      }
      if (key === "Savings") {
        rule = "≥ 30%";
        if (percentage < 30) isValid = false;
      }

      return { ...item, percentage, isValid, rule };
    })
    .filter(Boolean);

  const assetClassAllocation =
    useLiveQuery(async () => {
      const assetClasses = await db.assetClasses.toArray();
      const holdings = await db.assetsHoldings.toArray();
      const assetSubClasses = await db.assetSubClasses.toArray();
      const assetsProjection = await db.assetsProjection.toArray();
      const projectedSubClassIds = new Set(
        assetsProjection.map((projection) => projection.assetSubClasses_id),
      );
      const subClassToClassMap = new Map(
        assetSubClasses.map((subClass) => [
          subClass.id,
          subClass.assetClasses_id,
        ]),
      );
      const allocationMap: Record<number, number> = {};

      holdings.forEach((holding) => {
        if (projectedSubClassIds.has(holding.assetSubClasses_id)) {
          const assetClassId = subClassToClassMap.get(
            holding.assetSubClasses_id,
          );

          if (assetClassId) {
            allocationMap[assetClassId] =
              (allocationMap[assetClassId] || 0) +
              holding.existingAllocation;
          }
        }
      });

      return assetClasses
        .filter((ac) => allocationMap[ac.id] > 0)
        .map((ac) => ({
          id: ac.id,
          label: ac.name,
          value: allocationMap[ac.id],
        }));
    }) || [];

  const assetAllocationByGoal =
    useLiveQuery(async () => {
      const goals = await db.goals.toArray();
      const holdings = await db.assetsHoldings.toArray();
      const allocationMap: Record<number, number> = {};
      holdings.forEach((h) => {
        if (h.goals_id) {
          allocationMap[h.goals_id] =
            (allocationMap[h.goals_id] || 0) + h.existingAllocation;
        }
      });
      return goals
        .filter((goal) => allocationMap[goal.id] > 0)
        .map((goal) => ({
          id: goal.id,
          label: goal.name,
          value: allocationMap[goal.id],
        }));
    }) || [];

  const assetAllocationByBucket =
    useLiveQuery(async () => {
      const buckets = await db.buckets.toArray();
      const holdings = await db.assetsHoldings.toArray();
      const allocationMap: Record<number, number> = {};
      holdings.forEach((h) => {
        if (h.buckets_id) {
          allocationMap[h.buckets_id] =
            (allocationMap[h.buckets_id] || 0) + h.existingAllocation;
        }
      });
      return buckets
        .filter((bucket) => allocationMap[bucket.id] > 0)
        .map((bucket) => ({
          id: bucket.id,
          label: bucket.name,
          value: allocationMap[bucket.id],
        }));
    }) || [];

  const savingsCashFlow =
    useLiveQuery(async () => {
      const purposes = await db.assetPurposes.toArray();
      const cashFlows = await db.cashFlow.toArray();
      const goals = await db.goals.toArray();
      const savingsPurposeIds = purposes
        .filter((p) => p.type === "savings")
        .map((p) => p.id);
      const goalMap: Record<number, { name: string; total: number }> = {};
      goals.forEach((goal) => {
        if (goal.id) {
          goalMap[goal.id] = { name: goal.name, total: 0 };
        }
      });
      const savingsFlows = cashFlows.filter((flow) =>
        savingsPurposeIds.includes(flow.assetPurpose_id),
      );
      // Group by goal_id, fallback to 'No Goal' if not set
      const grouped: Record<string, number> = {};
      savingsFlows.forEach((flow) => {
        const label =
          flow.goal_id && goalMap[flow.goal_id]?.name
            ? goalMap[flow.goal_id].name
            : "No Goal";
        grouped[label] = (grouped[label] || 0) + flow.monthly;
      });
      return Object.entries(grouped).map(([label, total]) => ({
        id: label,
        label,
        value: total,
      }));
    }) || [];

  const cardData = [
    {
      title: "Total Assets",
      value: totalAssets,
      bg: "primary",
      text: "white",
      url: "/assets-holdings",
    },
    {
      title: "Total Liabilities",
      value: totalLiabilities,
      bg: "danger",
      text: "white",
      url: "/liabilities",
    },
    {
      title: "Net Worth",
      value: netWorth,
      bg: "success",
      text: "white",
      url: "",
    },
  ];

  const goalProgress =
    useLiveQuery(async () => {
      const goals = await db.goals.toArray();
      const holdings = await db.assetsHoldings.toArray();
      const allocationMap: Record<number, number> = {};

      holdings.forEach((h) => {
        if (h.goals_id) {
          allocationMap[h.goals_id] =
            (allocationMap[h.goals_id] || 0) + h.existingAllocation;
        }
      });

      return goals
        .map((goal) => ({
          id: goal.id,
          name: goal.name,
          targetAmount: goal.amountRequiredToday || 0,
          allocatedAmount: allocationMap[goal.id] || 0,
          gap: (goal.amountRequiredToday || 0) - (allocationMap[goal.id] || 0),
        }))
        .sort((a, b) => b.targetAmount - a.targetAmount);
    }) || [];

  const projectedAssetGrowth =
    useLiveQuery(async () => {
      const assetClasses = await db.assetClasses.toArray();
      const holdings = await db.assetsHoldings.toArray();
      const assetSubClasses = await db.assetSubClasses.toArray();
      const assetsProjection = await db.assetsProjection.toArray();
      const assetClassMap = new Map(
        assetClasses.map((assetClass) => [assetClass.id, assetClass.name]),
      );

      const getCurrentAllocation = (assetSubClassId: number) =>
        holdings
          .filter((holding) => holding.assetSubClasses_id === assetSubClassId)
          .reduce((sum, holding) => sum + holding.existingAllocation, 0);

      const allocationMap: Record<
        number,
        { id: number; label: string; currentValue: number; value: number }
      > = {};

      assetsProjection.forEach((projection) => {
          const subClass = assetSubClasses.find(
            (item) => item.id === projection.assetSubClasses_id
          );
          const assetClassId = subClass?.assetClasses_id;

          if (!assetClassId) return;

          const currentValue = getCurrentAllocation(
            projection.assetSubClasses_id
          );
          const value = calculateProjectedValue(
            currentValue,
            projection.newMonthlyInvestment,
            projection.lumpsumExpected,
            projection.redemptionExpected,
            subClass.expectedReturns || 0
          );

          if (!allocationMap[assetClassId]) {
            allocationMap[assetClassId] = {
              id: assetClassId,
              label: assetClassMap.get(assetClassId) || "Unknown",
              currentValue: 0,
              value: 0,
            };
          }

          allocationMap[assetClassId].currentValue += currentValue;
          allocationMap[assetClassId].value += value;
        });

      return Object.values(allocationMap)
        .filter((item) => item.currentValue > 0 || item.value > 0)
        .sort((a, b) => b.value - a.value);
    }) || [];
  /* Financial Freedom KPI Metrics */
  // Derived from existing data to avoid redundant DB calls
  const totalIncome =
    useLiveQuery(async () => {
      const incomes = await db.income.toArray();
      return incomes.reduce((sum, item) => sum + Number(item.monthly), 0);
    }) || 0;

  const financialFreedomMetrics = {
    income: totalIncome,
    assets: totalAssets,
    liabilities: totalLiabilities,
    expenses: expensesByPurpose.find((e) => e.id === "Need")?.value || 0,
    wants: expensesByPurpose.find((e) => e.id === "Want")?.value || 0,
    emergencyFund: getGoalAllocationByName(goalProgress, /emergency/i),
    retirementAssets: getGoalAllocationByName(goalProgress, /fire/i),
    emi: totalEmi,
  };

  return {
    cardData,
    withPercentage,
    transferRows,
    totalTransferAmount,
    savingsCashFlow,
    assetClassAllocation,
    assetAllocationByGoal,
    assetAllocationByBucket,
    assetClassColors,
    assetGoalColors,
    savingsColors,
    goalProgress,
    projectedAssetGrowth,
    financialFreedomMetrics,
  };
}
