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
  AreaChart,
  Area,
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
  const [projectionYears, setProjectionYears] = useState(2);
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
  // Calculate year-by-year projections with proper SIP and lumpsum accounting
  const chartData = Array.from({ length: projectionYears }, (_, i) => {
    const year = new Date().getFullYear() + i;
    
    // Calculate projected assets for this year with proper SIP/Lumpsum accounting
    let projectedAssets = 0;
    
    if (assetProjectionData) {
      projectedAssets = assetProjectionData.reduce((sum, asset) => {
        const monthlyReturn = asset.expectedReturns / 12 / 100;
        const years = i; // Years from now
        
        // If this is year 0, use current allocation
        if (i === 0) {
          return sum + asset.currentAllocation;
        }
        
        // Future value of current allocation after i years
        const currentValueFV = asset.currentAllocation * Math.pow(1 + asset.expectedReturns / 100, years);
        
        // Future value of monthly SIPs over i years
        // FV = PMT × [(1+r)^n - 1] / r
        const monthlyFV = asset.newMonthlyInvestment > 0
          ? asset.newMonthlyInvestment * ((Math.pow(1 + monthlyReturn, years * 12) - 1) / monthlyReturn)
          : 0;
        
        // Future value of annual lumpsums (assuming invested at start of each year)
        // This is also an annuity: FV = PMT × [(1+r)^n - 1] / r, but annual
        const lumpsumFV = asset.lumpsumExpected > 0
          ? asset.lumpsumExpected * ((Math.pow(1 + asset.expectedReturns / 100, years) - 1) / (asset.expectedReturns / 100))
          : 0;
        
        // For simplicity, assume redemptions happen once at the end (not recurring)
        // Only apply in year 1
        const redemption = years === 1 ? asset.redemptionExpected : 0;
        
        return sum + currentValueFV + monthlyFV + lumpsumFV - redemption;
      }, 0);
    }
    
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
                  <h5 className="mb-0 fw-bold text-success fs-6">{toLocalCurrency(currentNetWorth)}</h5>
                </div>
              </div>
              <div className="small text-muted">
                Assets: <span className="fw-bold text-success fs-6">{toLocalCurrency(totalCurrentAssets)}</span> | Liabilities: <span className="fw-bold text-danger fs-6">{toLocalCurrency(totalCurrentLiabilities)}</span>
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
                  <h5 className="mb-0 fw-bold text-success fs-6">{toLocalCurrency(projectedNetWorth)}</h5>
                </div>
              </div>
              <div className="small text-muted">
                Assets: <span className="fw-bold text-success fs-6">{toLocalCurrency(totalProjectedAssets)}</span> | Liabilities: <span className="fw-bold text-danger fs-6">{toLocalCurrency(totalProjectedLiabilities)}</span>
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
                  <h5 className="mb-0 fw-bold text-success fs-6">
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
          <div style={{ height: window.innerWidth < 768 ? "350px" : "450px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorAssets" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#28a745" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#28a745" stopOpacity={0.1}/>
                  </linearGradient>
                  <linearGradient id="colorLiabilities" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#dc3545" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#dc3545" stopOpacity={0.1}/>
                  </linearGradient>
                  <linearGradient id="colorNetWorth" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0d6efd" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#0d6efd" stopOpacity={0.1}/>
                  </linearGradient>
                  <linearGradient id="colorRealNetWorth" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#fd7e14" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#fd7e14" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  opacity={window.innerWidth < 768 ? 0.2 : 0.3}
                />
                <XAxis 
                  dataKey="year" 
                  style={{ fontSize: window.innerWidth < 768 ? '12px' : '14px' }}
                  tick={{ fill: '#666' }}
                />
                <YAxis 
                  tickFormatter={(value) => `₹${value / 100000}L`}
                  style={{ fontSize: window.innerWidth < 768 ? '11px' : '13px' }}
                  tick={{ fill: '#666' }}
                  width={window.innerWidth < 768 ? 50 : 60}
                />
                <Tooltip 
                  content={({ active, payload, label }: any) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-white p-3 border rounded shadow-sm" style={{ minWidth: '200px' }}>
                          <p className="fw-bold mb-2">Year {label}</p>
                          {payload.map((entry: any, index: number) => (
                            <p key={index} className="mb-1 small" style={{ color: entry.color }}>
                              <span className="fw-semibold">{entry.name}:</span>{' '}
                              <span className={`fw-bold fs-6 ${entry.name === 'Liabilities' ? 'text-danger' : 'text-success'}`}>{toLocalCurrency(entry.value)}</span>
                            </p>
                          ))}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                {window.innerWidth >= 768 ? (
                  <Legend wrapperStyle={{ fontSize: '13px' }} />
                ) : null}
                <Area
                  type="monotone"
                  dataKey="assets"
                  stroke="#28a745"
                  fillOpacity={1}
                  fill="url(#colorAssets)"
                  strokeWidth={2}
                  name="Assets"
                />
                <Area
                  type="monotone"
                  dataKey="liabilities"
                  stroke="#dc3545"
                  fillOpacity={1}
                  fill="url(#colorLiabilities)"
                  strokeWidth={2}
                  name="Liabilities"
                />
                <Area
                  type="monotone"
                  dataKey="netWorth"
                  stroke="#0d6efd"
                  fillOpacity={1}
                  fill="url(#colorNetWorth)"
                  strokeWidth={3}
                  name="Net Worth (Nominal)"
                />
                <Area
                  type="monotone"
                  dataKey="realNetWorth"
                  stroke="#fd7e14"
                  fillOpacity={1}
                  fill="url(#colorRealNetWorth)"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  name="Real Net Worth"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          
          {/* Mobile Legend */}
          {window.innerWidth < 768 && (
            <div className="d-flex flex-wrap justify-content-center gap-3 mt-3 small">
              <div><span style={{color: '#28a745', fontSize: '18px'}}>●</span> Assets</div>
              <div><span style={{color: '#dc3545', fontSize: '18px'}}>●</span> Liabilities</div>
              <div><span style={{color: '#0d6efd', fontSize: '18px'}}>●</span> Net Worth</div>
              <div><span style={{color: '#fd7e14', fontSize: '18px'}}>⋯</span> Real Net Worth</div>
            </div>
          )}
          
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
                        <td><span className="fw-bold text-success fs-6">{toLocalCurrency(item.currentAllocation)}</span></td>
                        <td><span className="fw-bold text-success fs-6">{toLocalCurrency(item.newMonthlyInvestment)}</span></td>
                        <td><span className="fw-bold text-success fs-6">{toLocalCurrency(item.lumpsumExpected)}</span></td>
                        <td><span className="fw-bold text-success fs-6">{toLocalCurrency(item.projectedValue)}</span></td>
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
                      <td><strong><span className="fw-bold text-success fs-6">{toLocalCurrency(totalCurrentAssets)}</span></strong></td>
                      <td colSpan={2}></td>
                      <td><strong><span className="fw-bold text-success fs-6">{toLocalCurrency(totalProjectedAssets)}</span></strong></td>
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
                          <div className="col-6 text-end"><strong><span className="fw-bold text-success fs-6">{toLocalCurrency(item.currentAllocation)}</span></strong></div>
                        </div>
                        <div className="row mb-1">
                          <div className="col-6 text-muted">Projected (1Y):</div>
                          <div className="col-6 text-end"><strong><span className="fw-bold text-success fs-6">{toLocalCurrency(item.projectedValue)}</span></strong></div>
                        </div>
                        <div className="row mb-1">
                          <div className="col-6 text-muted">SIP/Month:</div>
                          <div className="col-6 text-end"><span className="fw-bold text-success fs-6">{toLocalCurrency(item.newMonthlyInvestment)}</span></div>
                        </div>
                        <div className="row">
                          <div className="col-6 text-muted">Lumpsum/Year:</div>
                          <div className="col-6 text-end"><span className="fw-bold text-success fs-6">{toLocalCurrency(item.lumpsumExpected)}</span></div>
                        </div>
                      </div>
                    </Card.Body>
                  </Card>
                ))}
                <div className="p-3 m-2 rounded">
                  <div className="row small">
                    <div className="col-6"><strong>Total Current:</strong></div>
                    <div className="col-6 text-end"><strong><span className="fw-bold text-success fs-6">{toLocalCurrency(totalCurrentAssets)}</span></strong></div>
                  </div>
                  <div className="row small">
                    <div className="col-6"><strong>Total Projected (1Y):</strong></div>
                    <div className="col-6 text-end"><strong><span className="fw-bold text-success fs-6">{toLocalCurrency(totalProjectedAssets)}</span></strong></div>
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
                        <td><span className="fw-bold text-danger fs-6">{toLocalCurrency(item.currentBalance)}</span></td>
                        <td><span className="fw-bold text-danger fs-6">{toLocalCurrency(item.prepaymentExpected)}</span></td>
                        <td><span className="fw-bold text-danger fs-6">{toLocalCurrency(item.projectedBalance)}</span></td>
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
                      <td><strong><span className="fw-bold text-danger fs-6">{toLocalCurrency(totalCurrentLiabilities)}</span></strong></td>
                      <td></td>
                      <td><strong><span className="fw-bold text-danger fs-6">{toLocalCurrency(totalProjectedLiabilities)}</span></strong></td>
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
                          <div className="col-6 text-end"><strong><span className="fw-bold text-danger fs-6">{toLocalCurrency(item.currentBalance)}</span></strong></div>
                        </div>
                        <div className="row mb-1">
                          <div className="col-6 text-muted">Projected (1Y):</div>
                          <div className="col-6 text-end"><strong><span className="fw-bold text-danger fs-6">{toLocalCurrency(item.projectedBalance)}</span></strong></div>
                        </div>
                        <div className="row">
                          <div className="col-6 text-muted">Prepayment/Year:</div>
                          <div className="col-6 text-end"><span className="fw-bold text-danger fs-6">{toLocalCurrency(item.prepaymentExpected)}</span></div>
                        </div>
                      </div>
                    </Card.Body>
                  </Card>
                ))}
                <div className="p-3 m-2 rounded">
                  <div className="row small">
                    <div className="col-6"><strong>Total Current:</strong></div>
                    <div className="col-6 text-end"><strong><span className="fw-bold text-danger fs-6">{toLocalCurrency(totalCurrentLiabilities)}</span></strong></div>
                  </div>
                  <div className="row small">
                    <div className="col-6"><strong>Total Projected (1Y):</strong></div>
                    <div className="col-6 text-end"><strong><span className="fw-bold text-danger fs-6">{toLocalCurrency(totalProjectedLiabilities)}</span></strong></div>
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
