import { useState, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, AssetProjection, LiabilityProjection } from "../services/db";
import {
  calculateEMI,
  calculateRemainingBalance,
  projectLoanBalance,
} from "../utils/financialUtils";
import { toLocalCurrency } from "../utils/numberUtils";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Row,
  Col,
  Card,
  Button,
  Table,
  Modal,
  Form,
  Alert,
  Tabs,
  Tab,
} from "react-bootstrap";
import { BsPlus, BsTrash, BsPencil } from "react-icons/bs";

// Interfaces
interface ProjectionData extends AssetProjection {
  assetSubClassName: string;
  expectedReturns: number;
  currentAllocation: number;
  currentMonthlyInvestment: number;
  projectedValue: number;
}

interface LiabilityProjectionData extends LiabilityProjection {
  loanTypeName: string;
  interestRate: number;
  currentBalance: number;
  currentEmi: number;
  projectedBalance: number;
  isFutureLoan?: boolean;
}

interface AssetFormData {
  newMonthlyInvestment: number;
  lumpsumExpected: number;
  redemptionExpected: number;
  comment: string;
  expectedReturns: number;
}

interface LiabilityFormData {
  // For existing loans
  liability_id?: number;
  // For future loans
  loanType_id?: number;
  loanAmount?: number;
  emi?: number;
  startDate?: string; // DD-MM-YYYY format
  totalMonths?: number;
  // Common fields
  prepaymentExpected: number;
  comment: string;
}

export default function AssetAllocationProjectionPage() {
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [showLiabilityModal, setShowLiabilityModal] = useState(false);
  const [projectionYears, setProjectionYears] = useState(10);
  const [isAddingFutureLoan, setIsAddingFutureLoan] = useState(false);

  // State for forms
  const [editingAssetRecord, setEditingAssetRecord] = useState<ProjectionData | null>(null);
  const [editingLiabilityRecord, setEditingLiabilityRecord] = useState<LiabilityProjectionData | null>(null);

  const [assetFormData, setAssetFormData] = useState<AssetFormData>({
    newMonthlyInvestment: 0,
    lumpsumExpected: 0,
    redemptionExpected: 0,
    comment: "",
    expectedReturns: 0,
  });

  const [liabilityFormData, setLiabilityFormData] = useState<LiabilityFormData>({
    prepaymentExpected: 0,
    comment: "",
    loanType_id: 0,
    loanAmount: 0,
    emi: 0,
    startDate: "",
    totalMonths: 0,
  });

  const [alert, setAlert] = useState<{
    type: "success" | "danger";
    message: string;
  } | null>(null);

  // Fetch config for inflation rate
  const userConfig =
    useLiveQuery(async () => {
      const configs = await db.configs.toArray();
      return configs.map((config) => ({
        [config.key]: config.value,
      }));
    })?.reduce((acc, curr) => ({ ...acc, ...curr }), {}) || {};

  const inflationRate = Number(userConfig["inflation-rate"]) || 6.5;

  // Fetch all required data
  const assetSubClasses = useLiveQuery(() => db.assetSubClasses.toArray());
  const assetsHoldings = useLiveQuery(() => db.assetsHoldings.toArray());
  const assetsProjection = useLiveQuery(() => db.assetsProjection.toArray());
  const liabilities = useLiveQuery(() => db.liabilities.toArray());
  const liabilitiesProjection = useLiveQuery(() =>
    db.liabilitiesProjection.toArray()
  );
  const loanTypes = useLiveQuery(() => db.loanTypes.toArray());

  // Auto-create liability projections for existing liabilities and clean up duplicates
  useEffect(() => {
    const createLiabilityProjections = async () => {
      if (!liabilities || !liabilitiesProjection) return;

      // Group projections by liability_id to find duplicates (only for existing liabilities, not future loans)
      const projectionsByLiability = new Map<
        number,
        typeof liabilitiesProjection
      >();
      for (const lp of liabilitiesProjection) {
        // Only process existing liability projections (those with liability_id)
        if (lp.liability_id !== undefined && lp.liability_id !== null) {
          if (!projectionsByLiability.has(lp.liability_id)) {
            projectionsByLiability.set(lp.liability_id, []);
          }
          projectionsByLiability.get(lp.liability_id)!.push(lp);
        }
      }

      // Remove duplicate projections, keeping only the one with the highest ID
      const duplicatesToDelete: number[] = [];
      for (const [, projections] of projectionsByLiability) {
        if (projections.length > 1) {
          // Sort by ID descending and keep the first (highest ID)
          projections.sort((a, b) => b.id - a.id);
          // Mark all except the first for deletion
          for (let i = 1; i < projections.length; i++) {
            duplicatesToDelete.push(projections[i].id);
          }
        }
      }

      // Delete duplicate projections
      if (duplicatesToDelete.length > 0) {
        await Promise.all(
          duplicatesToDelete.map((id) => db.liabilitiesProjection.delete(id))
        );
      }

      // Create missing projections
      const existingProjectionIds = new Set(
        Array.from(projectionsByLiability.keys())
      );

      const missingProjections = liabilities.filter(
        (liability) => !existingProjectionIds.has(liability.id)
      );

      if (missingProjections.length > 0) {
        const newProjections = missingProjections.map((liability) => ({
          id: undefined as unknown as number, // Will be auto-generated by Dexie
          liability_id: liability.id,
          newEmi: 0,
          prepaymentExpected: 0,
          comment: `Current: ${
            loanTypes?.find((lt) => lt.id === liability.loanType_id)?.name ||
            "Loan"
          }`,
        }));

        await db.liabilitiesProjection.bulkAdd(
          newProjections as LiabilityProjection[]
        );
      }
    };

    createLiabilityProjections();
  }, [liabilities, liabilitiesProjection, loanTypes]);

  // Helper functions
  const getLiabilityName = (
    id: number | undefined,
    liabilities: any[] | undefined,
    loanTypes: any[] | undefined
  ) => {
    if (!id || !liabilities || !loanTypes) return "Unknown";
    const liability = liabilities.find((l) => l.id === id);
    if (!liability) return "Unknown";
    const type = loanTypes.find((t) => t.id === liability.loanType_id);
    return `${type?.name || "Loan"} (${toLocalCurrency(liability.loanAmount)})`;
  };

  const getLoanTypeName = (id: number | undefined, loanTypes: any[] | undefined) => {
    if (!id || !loanTypes) return "Unknown";
    const type = loanTypes.find((t) => t.id === id);
    return type?.name || "Unknown";
  };

  const getAssetSubClassName = (
    id: number | undefined,
    assetSubClasses: any[] | undefined
  ) => {
    if (!id || !assetSubClasses) return "Unknown";
    const subClass = assetSubClasses.find((s) => s.id === id);
    return subClass?.name || "Unknown";
  };

  // Combine data for display - Assets
  const assetProjectionData: ProjectionData[] | undefined = useLiveQuery(
    async () => {
      if (!assetSubClasses || !assetsHoldings || !assetsProjection) return [];

      const getAssetSubClass = (id: number) =>
        assetSubClasses.find((asc) => asc.id === id);

      const getCurrentAllocation = (assetSubClassId: number) =>
        assetsHoldings
          .filter((ah) => ah.assetSubClasses_id === assetSubClassId)
          .reduce((sum, ah) => sum + ah.existingAllocation, 0);

      const getCurrentMonthlyInvestment = (assetSubClassId: number) =>
        assetsHoldings
          .filter((ah) => ah.assetSubClasses_id === assetSubClassId)
          .reduce((sum, ah) => sum + (ah.sip || 0), 0);

      // Calculate projected value for each asset
      const calculateProjectedValue = (
        currentAllocation: number,
        newMonthly: number,
        lumpsum: number,
        redemption: number,
        expectedReturns: number
      ) => {
        const monthlyReturn = expectedReturns / 12 / 100;
        const totalMonthlyInvestment = newMonthly;
        const years = 1; // Projection for 1 year (base calculation)

        // Future value of current allocation
        const futureValue =
          currentAllocation * Math.pow(1 + expectedReturns / 100, years);

        // Future value of monthly investments (current + new)
        const monthlyFV =
          totalMonthlyInvestment *
          ((Math.pow(1 + monthlyReturn, years * 12) - 1) / monthlyReturn);

        // Add lumpsum investment with its growth
        const lumpsumFV = lumpsum * Math.pow(1 + expectedReturns / 100, years);

        // Subtract redemption
        return futureValue + monthlyFV + lumpsumFV - redemption;
      };

      return assetsProjection
        .map((ap) => {
          const subClass = getAssetSubClass(ap.assetSubClasses_id);
          const currentAllocation = getCurrentAllocation(ap.assetSubClasses_id);
          const currentMonthlyInvestment = getCurrentMonthlyInvestment(
            ap.assetSubClasses_id
          );

          return {
            ...ap,
            assetSubClassName: subClass?.name || "Unknown",
            expectedReturns: subClass?.expectedReturns || 0,
            currentAllocation,
            currentMonthlyInvestment,
            projectedValue: calculateProjectedValue(
              currentAllocation,
              ap.newMonthlyInvestment,
              ap.lumpsumExpected,
              ap.redemptionExpected,
              subClass?.expectedReturns || 0
            ),
          };
        })
        .sort((a, b) => b.currentAllocation - a.currentAllocation);
    },
    [assetSubClasses, assetsHoldings, assetsProjection],
    []
  );

  // Combine data for display - Liabilities
  const liabilityProjectionData: LiabilityProjectionData[] = useLiveQuery(
    async () => {
      if (!liabilities || !liabilitiesProjection || !loanTypes) return [];

      const getLiability = (id: number) => liabilities.find((l) => l.id === id);
      const getLoanType = (id: number) => loanTypes.find((lt) => lt.id === id);

      // Calculate projected balance for each liability
      const calculateProjectedBalance = (
        currentBalance: number,
        currentEmi: number,
        newEmi: number,
        prepayment: number,
        interestRate: number,
        startDate?: string // For future loans
      ) => {
        const monthlyRate = interestRate / 12 / 100;
        const emiToUse = newEmi > 0 ? newEmi : currentEmi;
        let balance = currentBalance;

        // For future loans, calculate months from start date to 1 year from now
        let monthsToProject = 12;
        if (startDate) {
          // Parse date - handle both DD-MM-YYYY and YYYY-MM-DD formats
          let start: Date;
          const parts = startDate.split("-").map(Number);
          
          if (parts[0] > 1000) {
            // YYYY-MM-DD format
            start = new Date(parts[0], parts[1] - 1, parts[2]);
          } else {
            // DD-MM-YYYY format
            start = new Date(parts[2], parts[1] - 1, parts[0]);
          }
          
          const now = new Date();
          const oneYearFromNow = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());

          if (start > oneYearFromNow) {
            // Loan starts after projection period (1 year from now)
            return 0;
          }

          if (start > now) {
            // Loan starts in the future but before 1 year from now
            // Calculate months from start date to 1 year from now
            const monthsDiff =
              (oneYearFromNow.getFullYear() - start.getFullYear()) * 12 +
              (oneYearFromNow.getMonth() - start.getMonth());
            monthsToProject = Math.max(0, monthsDiff);
          } else {
            // Loan already started - project 12 months from now
            monthsToProject = 12;
          }
        }

        // Simulate months of payments
        for (let month = 0; month < monthsToProject; month++) {
          // Add interest for the month
          balance = balance * (1 + monthlyRate);

          // Pay EMI (covers interest first, then principal)
          if (emiToUse > 0) {
            balance = Math.max(0, balance - emiToUse);
          }

          // Apply prepayment if applicable (assume done at end of projection period)
          if (month === monthsToProject - 1 && prepayment > 0) {
            balance = Math.max(0, balance - prepayment);
          }
        }

        return balance;
      };

      // Separate existing liability projections and future loans
      const existingProjections = liabilitiesProjection.filter(
        (lp) => lp.liability_id !== undefined && lp.liability_id !== null
      );
      const futureLoans = liabilitiesProjection.filter(
        (lp) => lp.liability_id === undefined || lp.liability_id === null
      );

      // Deduplicate existing projections: keep only the projection with the highest ID for each liability_id
      const projectionMap = new Map<
        number,
        (typeof liabilitiesProjection)[0]
      >();
      for (const lp of existingProjections) {
        if (lp.liability_id !== undefined) {
          const existing = projectionMap.get(lp.liability_id);
          if (!existing || lp.id > existing.id) {
            projectionMap.set(lp.liability_id, lp);
          }
        }
      }

      // Process existing liability projections
      const existingData = Array.from(projectionMap.values()).map((lp) => {
        const liability =
          lp.liability_id !== undefined && lp.liability_id !== null
            ? getLiability(lp.liability_id)
            : null;
        const loanType = liability ? getLoanType(liability.loanType_id) : null;
        
        // Calculate current balance and EMI dynamically
        const currentBalance = liability && loanType 
            ? calculateRemainingBalance(liability.loanAmount, loanType.interestRate, liability.totalMonths, liability.loanStartDate)
            : 0;
            
        const currentEmi = liability && loanType
            ? calculateEMI(liability.loanAmount, loanType.interestRate, liability.totalMonths)
            : 0;

        return {
          ...lp,
          loanTypeName: loanType?.name || "Unknown",
          interestRate: loanType?.interestRate || 0,
          currentBalance,
          currentEmi,
          isFutureLoan: false,
            projectedBalance: calculateProjectedBalance(
            currentBalance,
            currentEmi,
            0, // newEmi removed, passing 0
            lp.prepaymentExpected,
            loanType?.interestRate || 0
          ),
        };
      });

      // Process future loans
      const futureData = futureLoans.map((lp) => {
        const loanType =
          lp.loanType_id !== undefined && lp.loanType_id !== null
            ? getLoanType(lp.loanType_id)
            : null;
        const loanAmount = lp.loanAmount || 0;
        const emi = (loanAmount && loanType && lp.totalMonths) 
            ? calculateEMI(loanAmount, loanType.interestRate, lp.totalMonths) 
            : 0;
        
        // For future loans, current balance is 0 if not started, or calculated if started
        // But typically "Future Loan" implies it starts in the future.
        // If startDate is in the past, it's effectively an active loan but tracked as "future" in this table?
        // Let's stick to the logic: if startDate > today, currentBalance = 0.
        // If startDate <= today, calculate balance.
        
        let currentBalance = 0;
        if (lp.startDate) {
            const [day, month, year] = lp.startDate.split("-").map(Number);
            const start = new Date(year, month - 1, day);
            if (start <= new Date()) {
                 currentBalance = calculateRemainingBalance(
                    loanAmount, 
                    loanType?.interestRate || 0, 
                    lp.totalMonths || 0, 
                    lp.startDate
                 );
            }
        }

        return {
          ...lp,
          loanTypeName: loanType?.name || "Unknown",
          interestRate: loanType?.interestRate || 0,
          currentBalance, // Usually 0 for future loans
          currentEmi: emi,
          isFutureLoan: true,
          projectedBalance: calculateProjectedBalance(
            currentBalance > 0 ? currentBalance : loanAmount, 
            emi,
            0, // newEmi removed, passing 0
            lp.prepaymentExpected,
            loanType?.interestRate || 0,
            lp.startDate
          ),
        };
      });

      return [...existingData, ...futureData];
    },
    [liabilities, liabilitiesProjection, loanTypes],
    []
  );

  // Handlers
  const handleEditAsset = (record: ProjectionData) => {
    setEditingAssetRecord(record);
    setAssetFormData({
      newMonthlyInvestment: record.newMonthlyInvestment,
      lumpsumExpected: record.lumpsumExpected,
      redemptionExpected: record.redemptionExpected,
      comment: record.comment || "",
      expectedReturns: record.expectedReturns || 0,
    });
    setShowAssetModal(true);
  };


  
  // Wait, I need to fix the "Add Asset" logic.
  // I'll add a separate state for `newAssetSubClassId` inside the modal or component.
  const [newAssetSubClassId, setNewAssetSubClassId] = useState<number>(0);

  const handleSaveAsset = async () => {
      try {
          const { expectedReturns, ...projectionData } = assetFormData;
          
          if (editingAssetRecord) {
              await db.assetsProjection.update(editingAssetRecord.id, projectionData);
              await db.assetSubClasses.update(editingAssetRecord.assetSubClasses_id, { expectedReturns });
              setAlert({ type: "success", message: "Asset projection updated" });
          } else {
              if (!newAssetSubClassId) {
                  setAlert({ type: "danger", message: "Please select an asset class" });
                  return;
              }
              await db.assetsProjection.add({
                  assetSubClasses_id: newAssetSubClassId,
                  ...projectionData
              } as AssetProjection);
              await db.assetSubClasses.update(newAssetSubClassId, { expectedReturns });
              setAlert({ type: "success", message: "Asset projection added" });
          }
          setShowAssetModal(false);
          setEditingAssetRecord(null);
          setAssetFormData({
            newMonthlyInvestment: 0,
            lumpsumExpected: 0,
            redemptionExpected: 0,
            comment: "",
            expectedReturns: 0,
          });
          setNewAssetSubClassId(0);
      } catch (error) {
          console.error(error);
          setAlert({ type: "danger", message: "Failed to save asset projection" });
      }
  };

  const handleDeleteAssetProjection = async (id: number) => {
    if (confirm("Are you sure you want to delete this projection?")) {
      await db.assetsProjection.delete(id);
    }
  };

  const handleEditLiability = (record: LiabilityProjectionData) => {
    setEditingLiabilityRecord(record);
    setIsAddingFutureLoan(record.isFutureLoan || false);
    setLiabilityFormData({
      liability_id: record.liability_id,
      loanType_id: record.loanType_id || 0,
      loanAmount: record.loanAmount || 0,
      emi: record.currentEmi || 0,
      startDate: record.startDate || "",
      totalMonths: record.totalMonths || 0,
      prepaymentExpected: record.prepaymentExpected,
      comment: record.comment || "",
    });
    setShowLiabilityModal(true);
  };

  const handleAddLiability = () => {
      setEditingLiabilityRecord(null);
      setIsAddingFutureLoan(false); // Default to existing tab
      setLiabilityFormData({
        prepaymentExpected: 0,
        comment: "",
        loanType_id: 0,
        loanAmount: 0,
        emi: 0,
        startDate: "",
        totalMonths: 0,
      });
      setShowLiabilityModal(true);
  };

  const handleSaveLiability = async () => {
    try {
      if (editingLiabilityRecord) {
         // Remove fields that shouldn't be in LiabilityProjection
         const { emi, ...dataToSave } = liabilityFormData;
         await db.liabilitiesProjection.update(editingLiabilityRecord.id, dataToSave as any);
         setAlert({ type: "success", message: "Liability projection updated" });
      } else {
        // Add New
        if (isAddingFutureLoan) {
            // Future Loan
             if (!liabilityFormData.loanType_id || !liabilityFormData.loanAmount || !liabilityFormData.startDate) {
                setAlert({ type: "danger", message: "Please fill required fields for future loan" });
                return;
             }
             const { emi, ...dataToSave } = liabilityFormData;
             await db.liabilitiesProjection.add({
                 ...dataToSave,
                 liability_id: undefined // Ensure it's undefined for future
             } as unknown as LiabilityProjection);
        } else {
            // Existing Loan Projection
            if (!liabilityFormData.liability_id) {
                setAlert({ type: "danger", message: "Please select a liability" });
                return;
            }
            const { emi, ...dataToSave } = liabilityFormData;
            await db.liabilitiesProjection.add({
                ...dataToSave,
                // Clear future fields just in case
                loanType_id: undefined,
                loanAmount: undefined,
                startDate: undefined,
                totalMonths: undefined,
            } as unknown as LiabilityProjection);
        }
        setAlert({ type: "success", message: "Liability projection added" });
      }
      setShowLiabilityModal(false);
      setEditingLiabilityRecord(null);
    } catch (error) {
      console.error(error);
      setAlert({ type: "danger", message: "Failed to save liability projection" });
    }
  };

  const handleDeleteLiabilityProjection = async (id: number) => {
    if (confirm("Are you sure you want to delete this projection?")) {
      await db.liabilitiesProjection.delete(id);
    }
  };

  // Chart Data Preparation
  const prepareAssetChartData = () => {
    if (!assetProjectionData || assetProjectionData.length === 0) {
      return [];
    }
    return assetProjectionData
      .map((record) => ({
        name: record.assetSubClassName,
        currentValue: record.currentAllocation,
        projectedValue: Number(record.projectedValue),
      }))
      .filter((item) => item.currentValue > 0 || item.projectedValue > 0);
  };

  const assetChartData = prepareAssetChartData();
  const totalCurrentAssetsForChart = assetChartData.reduce(
    (sum, item) => sum + item.currentValue,
    0
  );
  const totalProjectedAssetsForChart = assetChartData.reduce(
    (sum, item) => sum + item.projectedValue,
    0
  );

  // Calculate CAGR for assets
  const calculateCAGR = () => {
    if (totalCurrentAssetsForChart <= 0) return 0;
    const years = 1;
    return (
      (Math.pow(
        totalProjectedAssetsForChart / totalCurrentAssetsForChart,
        1 / years
      ) -
        1) *
      100
    );
  };

  const cagr = calculateCAGR();

  // Calculate total values for summary cards and table footers
  const totalCurrentAssets = assetProjectionData?.reduce(
    (sum, item) => sum + item.currentAllocation,
    0
  ) || 0;

  const totalProjectedAssets = assetProjectionData?.reduce(
    (sum, item) => sum + item.projectedValue,
    0
  ) || 0;

  const totalCurrentLiabilities = liabilityProjectionData?.reduce(
    (sum, item) => sum + item.currentBalance,
    0
  ) || 0;

  const totalProjectedLiabilities = liabilityProjectionData?.reduce(
    (sum, item) => sum + item.projectedBalance,
    0
  ) || 0;

  const currentNetWorth = totalCurrentAssets - totalCurrentLiabilities;
  const projectedNetWorth = totalProjectedAssets - totalProjectedLiabilities;
  const netWorthGrowth = projectedNetWorth - currentNetWorth;
  const netWorthGrowthPercentage = currentNetWorth > 0 
    ? (netWorthGrowth / currentNetWorth) * 100 
    : 0;

  // Chart Data for Line Chart (Net Worth Projection)
  // This is a simplified projection for the chart
  const chartData = Array.from({ length: projectionYears }, (_, i) => {
    const year = new Date().getFullYear() + i;
    // Simple linear projection for demonstration
    // Ideally this should calculate year by year using the same logic as the table
    // But for now, we'll use a simplified growth rate based on the 1-year projection
    const growthRate = cagr / 100;
    const projectedAssets = totalCurrentAssetsForChart * Math.pow(1 + growthRate, i);
    
    // Calculate projected liabilities for this year
    let projectedLiabilities = 0;
    
    if (liabilityProjectionData) {
      projectedLiabilities = liabilityProjectionData.reduce((sum, lp) => {
        let balance = 0;
        
        if (lp.isFutureLoan && lp.startDate) {
           // Logic for future loan
           // Parse date - handle both DD-MM-YYYY and YYYY-MM-DD formats
           let loanStart: Date;
           const parts = lp.startDate.split("-").map(Number);
           
           if (parts[0] > 1000) {
             // YYYY-MM-DD format
             loanStart = new Date(parts[0], parts[1] - 1, parts[2]);
           } else {
             // DD-MM-YYYY format
             loanStart = new Date(parts[2], parts[1] - 1, parts[0]);
           }
           
           const now = new Date();
           // Calculate target date as i years from now
           const targetDate = new Date(now.getFullYear() + i, now.getMonth(), now.getDate());
           
           if (targetDate >= loanStart) {
             // Loan has started by this projection year
             // Calculate months since loan start
             const monthsActive = Math.max(0, 
               (targetDate.getFullYear() - loanStart.getFullYear()) * 12 + 
               (targetDate.getMonth() - loanStart.getMonth())
             );
             
             // Project from original loan amount
             balance = projectLoanBalance(
               lp.loanAmount || 0, 
               lp.currentEmi, 
               lp.interestRate, 
               monthsActive, 
               lp.prepaymentExpected / 12 // Convert annual to monthly approximation
             );
           } else {
             // Loan hasn't started yet - balance is 0 for this year
             balance = 0;
           }
        } else {
           // Existing loan - project from current balance
           // i represents years from now. So months = i * 12.
           balance = projectLoanBalance(
             lp.currentBalance,
             lp.currentEmi,
             lp.interestRate,
             i * 12,
             lp.prepaymentExpected / 12 // Convert annual to monthly approximation
           );
        }
        return sum + Math.max(0, balance); // Ensure balance doesn't go negative
      }, 0);
    }
    
    const nominalNetWorth = projectedAssets - projectedLiabilities;
    // Calculate inflation-adjusted (real) net worth
    const inflationFactor = Math.pow(1 + inflationRate / 100, i);
    const realNetWorth = nominalNetWorth / inflationFactor;
    
    return {
      year,
      assets: Math.round(projectedAssets),
      liabilities: Math.round(projectedLiabilities),
      netWorth: Math.round(nominalNetWorth),
      realNetWorth: Math.round(realNetWorth)
    };
  });



  return (
    <div className="flex-grow-1 overflow-auto container-fluid">
      <h2 className="mb-4">Net Worth Projection</h2>
      
      {alert && (
        <Alert variant={alert.type} onClose={() => setAlert(null)} dismissible>
          {alert.message}
        </Alert>
      )}

      {/* Summary Cards */}
      <Row className="mb-4">
        <Col md={4}>
          <Card className="shadow-sm h-100">
            <Card.Body>
              <div className="d-flex align-items-center mb-2">
                <div className="bg-primary bg-opacity-10 rounded p-2 me-3">
                  <BsPlus size={24} className="text-primary" />
                </div>
                <div>
                  <div className="text-muted small">Current Net Worth</div>
                  <h5 className="mb-0">{toLocalCurrency(currentNetWorth)}</h5>
                </div>
              </div>
              <div className="small text-muted">
                Assets: {toLocalCurrency(totalCurrentAssets)} | Liabilities: {toLocalCurrency(totalCurrentLiabilities)}
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="shadow-sm h-100">
            <Card.Body>
              <div className="d-flex align-items-center mb-2">
                <div className="bg-success bg-opacity-10 rounded p-2 me-3">
                  <BsPlus size={24} className="text-success" />
                </div>
                <div>
                  <div className="text-muted small">Projected Net Worth (1 Year)</div>
                  <h5 className="mb-0">{toLocalCurrency(projectedNetWorth)}</h5>
                </div>
              </div>
              <div className="small text-muted">
                Assets: {toLocalCurrency(totalProjectedAssets)} | Liabilities: {toLocalCurrency(totalProjectedLiabilities)}
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="shadow-sm h-100">
            <Card.Body>
              <div className="d-flex align-items-center mb-2">
                <div className={`${netWorthGrowth >= 0 ? 'bg-success' : 'bg-danger'} bg-opacity-10 rounded p-2 me-3`}>
                  <BsPlus size={24} className={netWorthGrowth >= 0 ? 'text-success' : 'text-danger'} />
                </div>
                <div>
                  <div className="text-muted small">Expected Growth (1 Year)</div>
                  <h5 className="mb-0">
                    {toLocalCurrency(netWorthGrowth)}
                  </h5>
                </div>
              </div>
              <div className="small text-muted">
                Growth Rate: {netWorthGrowthPercentage.toFixed(2)}%
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Chart */}
      <Card className="mb-4 shadow-sm">
        <Card.Body>
          <div style={{ height: window.innerWidth < 768 ? "300px" : "450px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="year" 
                  style={{ fontSize: window.innerWidth < 768 ? '10px' : '12px' }}
                />
                <YAxis 
                  tickFormatter={(value) => `₹${value / 100000}L`}
                  style={{ fontSize: window.innerWidth < 768 ? '10px' : '12px' }}
                />
                <Tooltip formatter={(value: number) => toLocalCurrency(value)} />
                <Legend 
                  wrapperStyle={{ fontSize: window.innerWidth < 768 ? '10px' : '12px' }}
                />
                <Line
                  type="monotone"
                  dataKey="assets"
                  stroke="#28a745"
                  name="Assets"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="liabilities"
                  stroke="#dc3545"
                  name="Liabilities"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="netWorth"
                  stroke="#0d6efd"
                  name="Net Worth (Nominal)"
                  strokeWidth={3}
                />
                <Line
                  type="monotone"
                  dataKey="realNetWorth"
                  stroke="#fd7e14"
                  name="Real Net Worth (Inflation Adjusted)"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3">
            <Form.Label>Projection Years: {projectionYears}</Form.Label>
            <Form.Range
              min={1}
              max={30}
              value={projectionYears}
              onChange={(e) => setProjectionYears(Number(e.target.value))}
            />
          </div>
        </Card.Body>
      </Card>

      <Row>
        {/* Asset Projections */}
        <Col md={12} className="mb-4">
          <Card className="shadow-sm">
            <Card.Header className="d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Asset Growth & SIPs</h5>
              <Button
                variant="outline-primary"
                size="sm"
                onClick={() => {
                    setEditingAssetRecord(null);
                    setAssetFormData({
                        newMonthlyInvestment: 0,
                        lumpsumExpected: 0,
                        redemptionExpected: 0,
                        comment: "",
                        expectedReturns: 0,
                    });
                    setNewAssetSubClassId(0);
                    setShowAssetModal(true);
                }}
              >
                <BsPlus size={20} /> Add
              </Button>
            </Card.Header>
            <Card.Body className="p-0">
              {/* Desktop Table View */}
              <div className="d-none d-md-block">
                <Table hover responsive className="mb-0">
                  <thead>
                    <tr>
                      <th>Asset</th>
                      <th>Current Value</th>
                      <th>SIP/Month</th>
                      <th>Lumpsum/Year</th>
                      <th>Projected (1Y)</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assetProjectionData?.map((item) => (
                      <tr key={item.id}>
                        <td>
                          {getAssetSubClassName(
                            item.assetSubClasses_id,
                            assetSubClasses
                          )}
                        </td>
                        <td>{toLocalCurrency(item.currentAllocation)}</td>
                        <td>{toLocalCurrency(item.newMonthlyInvestment)}</td>
                        <td>{toLocalCurrency(item.lumpsumExpected)}</td>
                        <td>{toLocalCurrency(item.projectedValue)}</td>
                        <td>
                          <Button
                            variant="link"
                            className="text-primary p-0 me-2"
                            onClick={() => handleEditAsset(item)}
                          >
                            <BsPencil />
                          </Button>
                          <Button
                            variant="link"
                            className="text-danger p-0"
                            onClick={() => handleDeleteAssetProjection(item.id!)}
                          >
                            <BsTrash />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td><strong>Total</strong></td>
                      <td><strong>{toLocalCurrency(totalCurrentAssets)}</strong></td>
                      <td colSpan={2}></td>
                      <td><strong>{toLocalCurrency(totalProjectedAssets)}</strong></td>
                      <td></td>
                    </tr>
                  </tfoot>
                </Table>
              </div>

              {/* Mobile Card View */}
              <div className="d-md-none">
                {assetProjectionData?.map((item) => (
                  <Card key={item.id} className="m-2">
                    <Card.Body className="p-3">
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <h6 className="mb-0">
                          {getAssetSubClassName(
                            item.assetSubClasses_id,
                            assetSubClasses
                          )}
                        </h6>
                        <div>
                          <Button
                            variant="link"
                            className="text-primary p-0 me-2"
                            size="sm"
                            onClick={() => handleEditAsset(item)}
                          >
                            <BsPencil />
                          </Button>
                          <Button
                            variant="link"
                            className="text-danger p-0"
                            size="sm"
                            onClick={() => handleDeleteAssetProjection(item.id!)}
                          >
                            <BsTrash />
                          </Button>
                        </div>
                      </div>
                      <div className="small">
                        <div className="row mb-1">
                          <div className="col-6 text-muted">Current Value:</div>
                          <div className="col-6 text-end"><strong>{toLocalCurrency(item.currentAllocation)}</strong></div>
                        </div>
                        <div className="row mb-1">
                          <div className="col-6 text-muted">Projected (1Y):</div>
                          <div className="col-6 text-end"><strong>{toLocalCurrency(item.projectedValue)}</strong></div>
                        </div>
                        <div className="row mb-1">
                          <div className="col-6 text-muted">SIP/Month:</div>
                          <div className="col-6 text-end">{toLocalCurrency(item.newMonthlyInvestment)}</div>
                        </div>
                        <div className="row">
                          <div className="col-6 text-muted">Lumpsum/Year:</div>
                          <div className="col-6 text-end">{toLocalCurrency(item.lumpsumExpected)}</div>
                        </div>
                      </div>
                    </Card.Body>
                  </Card>
                ))}
                <div className="p-3 m-2 rounded">
                  <div className="row small">
                    <div className="col-6"><strong>Total Current:</strong></div>
                    <div className="col-6 text-end"><strong>{toLocalCurrency(totalCurrentAssets)}</strong></div>
                  </div>
                  <div className="row small">
                    <div className="col-6"><strong>Total Projected (1Y):</strong></div>
                    <div className="col-6 text-end"><strong>{toLocalCurrency(totalProjectedAssets)}</strong></div>
                  </div>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>

        {/* Liability Projections */}
        <Col md={12}>
          <Card className="shadow-sm">
            <Card.Header className="d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Liability Management</h5>
              <Button
                variant="outline-primary"
                size="sm"
                onClick={handleAddLiability}
              >
                <BsPlus size={20} /> Add
              </Button>
            </Card.Header>
            <Card.Body className="p-0">
              {/* Desktop Table View */}
              <div className="d-none d-md-block">
                <Table hover responsive className="mb-0">
                  <thead>
                    <tr>
                      <th>Liability</th>
                      <th>Current Balance</th>
                      <th>Prepayment/Year</th>
                      <th>Projected (1Y)</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {liabilityProjectionData?.map((item) => (
                      <tr key={item.id}>
                        <td>
                          {item.isFutureLoan 
                              ? `${getLoanTypeName(item.loanType_id, loanTypes)} (Future)` 
                              : getLiabilityName(item.liability_id, liabilities, loanTypes)
                          }
                        </td>
                        <td>{toLocalCurrency(item.currentBalance)}</td>
                        <td>{toLocalCurrency(item.prepaymentExpected)}</td>
                        <td>{toLocalCurrency(item.projectedBalance)}</td>
                        <td>
                          <Button
                            variant="link"
                            className="text-primary p-0 me-2"
                            onClick={() => handleEditLiability(item)}
                          >
                            <BsPencil />
                          </Button>
                          <Button
                            variant="link"
                            className="text-danger p-0"
                            onClick={() =>
                              handleDeleteLiabilityProjection(item.id!)
                            }
                          >
                            <BsTrash />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td><strong>Total</strong></td>
                      <td><strong>{toLocalCurrency(totalCurrentLiabilities)}</strong></td>
                      <td></td>
                      <td><strong>{toLocalCurrency(totalProjectedLiabilities)}</strong></td>
                      <td></td>
                    </tr>
                  </tfoot>
                </Table>
              </div>

              {/* Mobile Card View */}
              <div className="d-md-none">
                {liabilityProjectionData?.map((item) => (
                  <Card key={item.id} className="m-2">
                    <Card.Body className="p-3">
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <h6 className="mb-0">
                          {item.isFutureLoan 
                              ? `${getLoanTypeName(item.loanType_id, loanTypes)} (Future)` 
                              : getLiabilityName(item.liability_id, liabilities, loanTypes)
                          }
                        </h6>
                        <div>
                          <Button
                            variant="link"
                            className="text-primary p-0 me-2"
                            size="sm"
                            onClick={() => handleEditLiability(item)}
                          >
                            <BsPencil />
                          </Button>
                          <Button
                            variant="link"
                            className="text-danger p-0"
                            size="sm"
                            onClick={() => handleDeleteLiabilityProjection(item.id!)}
                          >
                            <BsTrash />
                          </Button>
                        </div>
                      </div>
                      <div className="small">
                        <div className="row mb-1">
                          <div className="col-6 text-muted">Current Balance:</div>
                          <div className="col-6 text-end"><strong>{toLocalCurrency(item.currentBalance)}</strong></div>
                        </div>
                        <div className="row mb-1">
                          <div className="col-6 text-muted">Projected (1Y):</div>
                          <div className="col-6 text-end"><strong>{toLocalCurrency(item.projectedBalance)}</strong></div>
                        </div>
                        <div className="row">
                          <div className="col-6 text-muted">Prepayment/Year:</div>
                          <div className="col-6 text-end">{toLocalCurrency(item.prepaymentExpected)}</div>
                        </div>
                      </div>
                    </Card.Body>
                  </Card>
                ))}
                <div className="p-3 m-2 rounded">
                  <div className="row small">
                    <div className="col-6"><strong>Total Current:</strong></div>
                    <div className="col-6 text-end"><strong>{toLocalCurrency(totalCurrentLiabilities)}</strong></div>
                  </div>
                  <div className="row small">
                    <div className="col-6"><strong>Total Projected (1Y):</strong></div>
                    <div className="col-6 text-end"><strong>{toLocalCurrency(totalProjectedLiabilities)}</strong></div>
                  </div>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Asset Modal */}
      <Modal show={showAssetModal} onHide={() => setShowAssetModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>{editingAssetRecord ? "Edit" : "Add"} Asset Projection</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            {!editingAssetRecord && (
                <Form.Group className="mb-3">
                  <Form.Label>Asset Sub Class</Form.Label>
                  <Form.Select
                    value={newAssetSubClassId}
                    onChange={(e) => setNewAssetSubClassId(Number(e.target.value))}
                  >
                    <option value="">Select...</option>
                    {assetSubClasses?.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
            )}
            <Form.Group className="mb-3">
              <Form.Label>New Monthly Investment (SIP)</Form.Label>
              <Form.Control
                type="number"
                value={assetFormData.newMonthlyInvestment}
                onChange={(e) =>
                  setAssetFormData({
                    ...assetFormData,
                    newMonthlyInvestment: Number(e.target.value),
                  })
                }
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Expected Annual Lumpsum</Form.Label>
              <Form.Control
                type="number"
                value={assetFormData.lumpsumExpected}
                onChange={(e) =>
                  setAssetFormData({
                    ...assetFormData,
                    lumpsumExpected: Number(e.target.value),
                  })
                }
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Expected Redemption (One-time)</Form.Label>
              <Form.Control
                type="number"
                value={assetFormData.redemptionExpected}
                onChange={(e) =>
                  setAssetFormData({
                    ...assetFormData,
                    redemptionExpected: Number(e.target.value),
                  })
                }
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Expected Returns (Annual %)</Form.Label>
              <Form.Control
                type="number"
                step="0.1"
                value={assetFormData.expectedReturns}
                onChange={(e) =>
                  setAssetFormData({
                    ...assetFormData,
                    expectedReturns: Number(e.target.value),
                  })
                }
              />
              <Form.Text className="text-muted">
                This will update the global expected return for this asset class.
              </Form.Text>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Comment</Form.Label>
              <Form.Control
                type="text"
                value={assetFormData.comment}
                onChange={(e) =>
                  setAssetFormData({
                    ...assetFormData,
                    comment: e.target.value,
                  })
                }
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setShowAssetModal(false)}
          >
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSaveAsset}>
            Save
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Liability Modal */}
      <Modal
        show={showLiabilityModal}
        onHide={() => setShowLiabilityModal(false)}
      >
        <Modal.Header closeButton>
          <Modal.Title>{editingLiabilityRecord ? "Edit" : "Add"} Liability Projection</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Tabs 
            activeKey={isAddingFutureLoan ? "future" : "existing"} 
            onSelect={(k) => setIsAddingFutureLoan(k === "future")}
            className="mb-3"
          >
            <Tab eventKey="existing" title="Existing Loan" disabled={!!editingLiabilityRecord && isAddingFutureLoan}>
              <Form>
                <Form.Group className="mb-3">
                  <Form.Label>Select Liability</Form.Label>
                  <Form.Select
                    value={liabilityFormData.liability_id || ""}
                    onChange={(e) =>
                      setLiabilityFormData({
                        ...liabilityFormData,
                        liability_id: Number(e.target.value),
                      })
                    }
                    disabled={!!editingLiabilityRecord}
                  >
                    <option value="">Select...</option>
                    {liabilities?.map((l) => {
                        const type = loanTypes?.find(t => t.id === l.loanType_id);
                        return (
                            <option key={l.id} value={l.id}>
                                {type?.name} ({toLocalCurrency(l.loanAmount)})
                            </option>
                        );
                    })}
                  </Form.Select>
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Annual Prepayment</Form.Label>
                  <Form.Control
                    type="number"
                    value={liabilityFormData.prepaymentExpected}
                    onChange={(e) =>
                      setLiabilityFormData({
                        ...liabilityFormData,
                        prepaymentExpected: Number(e.target.value),
                      })
                    }
                  />
                </Form.Group>

              </Form>
            </Tab>
            <Tab eventKey="future" title="Future Loan" disabled={!!editingLiabilityRecord && !isAddingFutureLoan}>
              <Form>
                <Form.Group className="mb-3">
                  <Form.Label>Loan Type</Form.Label>
                  <Form.Select
                    value={liabilityFormData.loanType_id || ""}
                    onChange={(e) =>
                      setLiabilityFormData({
                        ...liabilityFormData,
                        loanType_id: Number(e.target.value),
                      })
                    }
                  >
                    <option value="">Select...</option>
                    {loanTypes?.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.interestRate}%)
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Loan Amount</Form.Label>
                  <Form.Control
                    type="number"
                    value={liabilityFormData.loanAmount}
                    onChange={(e) =>
                      setLiabilityFormData({
                        ...liabilityFormData,
                        loanAmount: Number(e.target.value),
                      })
                    }
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Start Date</Form.Label>
                  <Form.Control
                    type="date"
                    value={liabilityFormData.startDate}
                    onChange={(e) =>
                      setLiabilityFormData({
                        ...liabilityFormData,
                        startDate: e.target.value,
                      })
                    }
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Tenure (Months)</Form.Label>
                  <Form.Control
                    type="number"
                    value={liabilityFormData.totalMonths}
                    onChange={(e) =>
                      setLiabilityFormData({
                        ...liabilityFormData,
                        totalMonths: Number(e.target.value),
                      })
                    }
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>EMI (Estimated)</Form.Label>
                  <Form.Control
                    type="number"
                    value={liabilityFormData.emi}
                    onChange={(e) =>
                      setLiabilityFormData({
                        ...liabilityFormData,
                        emi: Number(e.target.value),
                      })
                    }
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                    <Form.Label>Annual Prepayment (Optional)</Form.Label>
                    <Form.Control
                        type="number"
                        value={liabilityFormData.prepaymentExpected}
                        onChange={(e) =>
                        setLiabilityFormData({
                            ...liabilityFormData,
                            prepaymentExpected: Number(e.target.value),
                        })
                        }
                    />
                </Form.Group>
              </Form>
            </Tab>
          </Tabs>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setShowLiabilityModal(false)}
          >
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSaveLiability}>
            Save
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
