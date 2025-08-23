import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../services/db";
import type { AssetPurpose } from "../services/db";

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
      (acc) => acc.holders_id === holder.id
    );
    holderAccounts.forEach((acc) => {
      const amount = cashFlows
        .filter(
          (cf) => cf.holders_id === holder.id && cf.accounts_id === acc.id
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
          holdings.reduce((sum, holding) => sum + holding.existingAllocation, 0)
        )
    ) || 0;

  const totalLiabilities =
    useLiveQuery(() =>
      db.liabilities
        .toArray()
        .then((liabilities) =>
          liabilities.reduce((sum, liability) => sum + liability.balance, 0)
        )
    ) || 0;

  const netWorth = totalAssets - totalLiabilities;

  const expensesByPurpose =
    useLiveQuery(async () => {
      const purposes = await db.assetPurposes.toArray();
      const cashFlows = await db.cashFlow.toArray();
      const totalMonthlyIncome = await db.income
        .toArray()
        .then((incomes) =>
          incomes.reduce((sum, item) => sum + Number(item.monthly), 0)
        );
      const purposeMap = purposes.reduce(
        (
          map: Record<number, { name: string; total: number }>,
          purpose: AssetPurpose
        ) => {
          if (purpose.id) {
            map[purpose.id] = { name: purpose.name, total: 0 };
          }
          return map;
        },
        {}
      );

      cashFlows.forEach((flow) => {
        if (flow.assetPurpose_id && purposeMap[flow.assetPurpose_id]) {
          purposeMap[flow.assetPurpose_id].total += flow.monthly;
        }
      });

      return Object.values(purposeMap)
        .filter(
          (purpose): purpose is { name: string; total: number } =>
            purpose.total > 0
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
      const allocationMap: Record<number, number> = {};
      holdings.forEach((h) => {
        if (h.assetClasses_id) {
          allocationMap[h.assetClasses_id] =
            (allocationMap[h.assetClasses_id] || 0) + h.existingAllocation;
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
        savingsPurposeIds.includes(flow.assetPurpose_id)
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
    },
    {
      title: "Total Liabilities",
      value: totalLiabilities,
      bg: "danger",
      text: "white",
    },
    {
      title: "Net Worth",
      value: netWorth,
      bg: "success",
      text: "white",
    },
  ];

  return {
    cardData,
    withPercentage,
    transferRows,
    totalTransferAmount,
    savingsCashFlow,
    assetClassAllocation,
    assetAllocationByGoal,
    assetClassColors,
    assetGoalColors,
    savingsColors,
  };
}
