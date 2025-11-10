import { useState, FormEvent, useEffect } from "react";
import type { AssetProjection, LiabilityProjection } from "../services/db";
import { db } from "../services/db";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import Modal from "react-bootstrap/Modal";
import Table from "react-bootstrap/Table";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Alert from "react-bootstrap/Alert";
import Card from "react-bootstrap/Card";
import Tabs from "react-bootstrap/Tabs";
import Tab from "react-bootstrap/Tab";
import { useLiveQuery } from "dexie-react-hooks";
import { BsPencil } from "react-icons/bs";
import { toLocalCurrency } from "../utils/numberUtils";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Badge } from "react-bootstrap";

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
  isFutureLoan?: boolean; // Flag to identify future loans
}

interface AssetFormData {
  newMonthlyInvestment: number;
  lumpsumExpected: number;
  redemptionExpected: number;
  comment: string;
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
  newEmi: number;
  prepaymentExpected: number;
  comment: string;
}

export default function AssetAllocationProjectionPage() {
  const [activeTab, setActiveTab] = useState<string>("assets");
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [showLiabilityModal, setShowLiabilityModal] = useState(false);
  const [editingAssetRecord, setEditingAssetRecord] =
    useState<ProjectionData | null>(null);
  const [editingLiabilityRecord, setEditingLiabilityRecord] =
    useState<LiabilityProjectionData | null>(null);
  const [assetFormData, setAssetFormData] = useState<AssetFormData>({
    newMonthlyInvestment: 0,
    lumpsumExpected: 0,
    redemptionExpected: 0,
    comment: "",
  });
  const [liabilityFormData, setLiabilityFormData] = useState<LiabilityFormData>(
    {
      newEmi: 0,
      prepaymentExpected: 0,
      comment: "",
      loanType_id: 0,
      loanAmount: 0,
      emi: 0,
      startDate: "",
      totalMonths: 0,
    }
  );
  const [isAddingFutureLoan, setIsAddingFutureLoan] = useState(false);
  const [alert, setAlert] = useState<{
    type: "success" | "danger";
    message: string;
  } | null>(null);

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
        const years = 1; // Projection for 1 year

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
        
        // For future loans, calculate months from start date to end of projection year
        let monthsToProject = 12;
        if (startDate) {
          const [day, month, year] = startDate.split("-").map(Number);
          const start = new Date(year, month - 1, day);
          const now = new Date();
          const endOfYear = new Date(now.getFullYear(), 11, 31); // Dec 31 of current year
          
          if (start > endOfYear) {
            // Loan starts after projection period
            return 0;
          }
          
          // Calculate months from start date to end of year
          const monthsDiff = 
            (endOfYear.getFullYear() - start.getFullYear()) * 12 +
            (endOfYear.getMonth() - start.getMonth());
          monthsToProject = Math.max(0, Math.min(12, monthsDiff + 1));
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
      const projectionMap = new Map<number, typeof liabilitiesProjection[0]>();
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
        const liability = lp.liability_id !== undefined && lp.liability_id !== null ? getLiability(lp.liability_id) : null;
        const loanType = liability ? getLoanType(liability.loanType_id) : null;

        return {
          ...lp,
          loanTypeName: loanType?.name || "Unknown",
          interestRate: loanType?.interestRate || 0,
          currentBalance: liability?.balance || 0,
          currentEmi: liability?.emi || 0,
          isFutureLoan: false,
          projectedBalance: calculateProjectedBalance(
            liability?.balance || 0,
            liability?.emi || 0,
            lp.newEmi,
            lp.prepaymentExpected,
            loanType?.interestRate || 0
          ),
        };
      });

      // Process future loans
      const futureData = futureLoans.map((lp) => {
        const loanType = lp.loanType_id !== undefined && lp.loanType_id !== null ? getLoanType(lp.loanType_id) : null;
        const loanAmount = lp.loanAmount || 0;
        const emi = lp.emi || 0;

        return {
          ...lp,
          loanTypeName: loanType?.name || "Unknown",
          interestRate: loanType?.interestRate || 0,
          currentBalance: loanAmount,
          currentEmi: emi,
          isFutureLoan: true,
          projectedBalance: calculateProjectedBalance(
            loanAmount,
            emi,
            lp.newEmi,
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

  // Handle Asset Projection
  const handleEditAsset = (record: ProjectionData) => {
    setEditingAssetRecord(record);
    setAssetFormData({
      newMonthlyInvestment: record.newMonthlyInvestment,
      lumpsumExpected: record.lumpsumExpected,
      redemptionExpected: record.redemptionExpected,
      comment: record.comment || "",
    });
    setShowAssetModal(true);
  };

  const handleSubmitAsset = async (e: FormEvent) => {
    e.preventDefault();
    try {
      if (editingAssetRecord) {
        await db.assetsProjection.update(editingAssetRecord.id, assetFormData);
        setAlert({
          type: "success",
          message: "Asset projection updated successfully",
        });
      }
      setShowAssetModal(false);
      setAssetFormData({
        newMonthlyInvestment: 0,
        lumpsumExpected: 0,
        redemptionExpected: 0,
        comment: "",
      });
      setEditingAssetRecord(null);
    } catch (error) {
      setAlert({
        type: "danger",
        message: "Failed to update asset projection",
      });
      console.error(error);
    }
  };

  // Helper function to convert DD-MM-YYYY to YYYY-MM-DD for date input
  const convertToDateInputFormat = (dateStr: string | undefined): string => {
    if (!dateStr || dateStr.trim() === "") return "";
    const parts = dateStr.split("-");
    if (parts.length !== 3) return "";
    const [day, month, year] = parts;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  };

  // Helper function to convert YYYY-MM-DD to DD-MM-YYYY for storage
  const convertFromDateInputFormat = (dateStr: string): string => {
    if (!dateStr || dateStr.trim() === "") return "";
    const parts = dateStr.split("-");
    if (parts.length !== 3) return "";
    const [year, month, day] = parts;
    return `${day.padStart(2, "0")}-${month.padStart(2, "0")}-${year}`;
  };

  // Handle Liability Projection
  const handleEditLiability = (record: LiabilityProjectionData) => {
    setEditingLiabilityRecord(record);
    setIsAddingFutureLoan(record.isFutureLoan || false);
    setLiabilityFormData({
      liability_id: record.liability_id,
      loanType_id: record.loanType_id || record.isFutureLoan ? record.loanType_id : 0,
      loanAmount: record.loanAmount || (record.isFutureLoan ? record.currentBalance : 0),
      emi: record.emi || (record.isFutureLoan ? record.currentEmi : 0),
      startDate: record.startDate || "",
      totalMonths: record.totalMonths || 0,
      newEmi: record.newEmi,
      prepaymentExpected: record.prepaymentExpected,
      comment: record.comment || "",
    });
    setShowLiabilityModal(true);
  };

  // Handle Add Future Loan
  const handleAddFutureLoan = () => {
    setEditingLiabilityRecord(null);
    setIsAddingFutureLoan(true);
    setLiabilityFormData({
      liability_id: undefined,
      loanType_id: 0,
      loanAmount: 0,
      emi: 0,
      startDate: "",
      totalMonths: 0,
      newEmi: 0,
      prepaymentExpected: 0,
      comment: "",
    });
    setShowLiabilityModal(true);
  };

  const handleSubmitLiability = async (e: FormEvent) => {
    e.preventDefault();
    try {
      if (isAddingFutureLoan) {
        // Validate future loan fields
        if (!liabilityFormData.loanType_id || !liabilityFormData.loanAmount || !liabilityFormData.emi || !liabilityFormData.startDate) {
          setAlert({
            type: "danger",
            message: "Please fill all required fields for future loan",
          });
          return;
        }
        
        // Add new future loan
        const newFutureLoan: Omit<LiabilityProjection, 'id'> = {
          liability_id: undefined,
          loanType_id: liabilityFormData.loanType_id,
          loanAmount: liabilityFormData.loanAmount,
          emi: liabilityFormData.emi,
          startDate: liabilityFormData.startDate,
          totalMonths: liabilityFormData.totalMonths || 0,
          newEmi: liabilityFormData.newEmi,
          prepaymentExpected: liabilityFormData.prepaymentExpected,
          comment: liabilityFormData.comment,
        };
        await db.liabilitiesProjection.add(newFutureLoan as LiabilityProjection);
        setAlert({
          type: "success",
          message: "Future loan added successfully",
        });
      } else if (editingLiabilityRecord) {
        // Update existing projection
        await db.liabilitiesProjection.update(
          editingLiabilityRecord.id,
          liabilityFormData
        );
        setAlert({
          type: "success",
          message: "Liability projection updated successfully",
        });
      }
      setShowLiabilityModal(false);
      setLiabilityFormData({
        newEmi: 0,
        prepaymentExpected: 0,
        comment: "",
        loanType_id: 0,
        loanAmount: 0,
        emi: 0,
        startDate: "",
        totalMonths: 0,
      });
      setEditingLiabilityRecord(null);
      setIsAddingFutureLoan(false);
    } catch (error) {
      setAlert({
        type: "danger",
        message: isAddingFutureLoan 
          ? "Failed to add future loan" 
          : "Failed to update liability projection",
      });
      console.error(error);
    }
  };

  // Calculate totals for Networth
  const totalCurrentAssets =
    assetProjectionData?.reduce(
      (sum, item) => sum + item.currentAllocation,
      0
    ) || 0;
  const totalProjectedAssets =
    assetProjectionData?.reduce((sum, item) => sum + item.projectedValue, 0) ||
    0;
  // For current liabilities, exclude future loans that haven't started yet
  const totalCurrentLiabilities =
    liabilityProjectionData?.reduce(
      (sum, item) => {
        // Future loans that haven't started yet don't affect current networth
        if (item.isFutureLoan && item.startDate) {
          const [day, month, year] = item.startDate.split("-").map(Number);
          const startDate = new Date(year, month - 1, day);
          const now = new Date();
          if (startDate > now) {
            return sum; // Loan hasn't started yet
          }
        }
        return sum + item.currentBalance;
      },
      0
    ) || 0;
  // For projected liabilities, include all loans (future loans that will start during the year)
  const totalProjectedLiabilities =
    liabilityProjectionData?.reduce(
      (sum, item) => sum + item.projectedBalance,
      0
    ) || 0;
  const currentNetworth = totalCurrentAssets - totalCurrentLiabilities;
  const projectedNetworth = totalProjectedAssets - totalProjectedLiabilities;
  const networthChange = projectedNetworth - currentNetworth;
  const networthChangePercent =
    currentNetworth > 0
      ? ((projectedNetworth - currentNetworth) / currentNetworth) * 100
      : 0;

  // Prepare data for pie charts
  const CURRENT_COLORS = [
    "#1f77b4",
    "#2ca02c",
    "#ff7f0e",
    "#d62728",
    "#9467bd",
    "#8c564b",
    "#e377c2",
    "#7f7f7f",
    "#bcbd22",
    "#17becf",
  ];

  const PROJECTED_COLORS = [
    "#3498db",
    "#27ae60",
    "#f39c12",
    "#e74c3c",
    "#9b59b6",
    "#795548",
    "#ff69b4",
    "#95a5a6",
    "#cddc39",
    "#00bcd4",
  ];

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

  const CustomPieChartLabel = function (props: Record<string, unknown>) {
    const cx =
      typeof props.cx === "number"
        ? props.cx
        : typeof props.cx === "string"
        ? parseFloat(props.cx)
        : 0;
    const cy =
      typeof props.cy === "number"
        ? props.cy
        : typeof props.cy === "string"
        ? parseFloat(props.cy)
        : 0;
    const midAngle =
      typeof props.midAngle === "number"
        ? props.midAngle
        : typeof props.midAngle === "string"
        ? parseFloat(props.midAngle)
        : 0;
    const innerRadius =
      typeof props.innerRadius === "number"
        ? props.innerRadius
        : typeof props.innerRadius === "string"
        ? parseFloat(props.innerRadius)
        : 0;
    const outerRadius =
      typeof props.outerRadius === "number"
        ? props.outerRadius
        : typeof props.outerRadius === "string"
        ? parseFloat(props.outerRadius)
        : 0;
    const percent =
      typeof props.percent === "number"
        ? props.percent
        : typeof props.percent === "string"
        ? parseFloat(props.percent)
        : 0;
    if (!percent || percent <= 0.05) return null;

    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor="middle"
        dominantBaseline="central"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  // Render Asset Projection Tab
  const renderAssetProjection = () => {
    // Show loading state
    if (
      assetSubClasses === undefined ||
      assetsHoldings === undefined ||
      assetsProjection === undefined
    ) {
      return (
        <div className="text-center p-5">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-2">Loading asset projection data...</p>
        </div>
      );
    }

    // Show empty state
    if (!assetProjectionData || assetProjectionData.length === 0) {
      return (
        <Card className="shadow">
          <Card.Body className="text-center p-5">
            <h5>No Asset Projection Data</h5>
            <p className="text-muted">
              Asset projection data is not available. Please ensure data is
              loaded.
            </p>
          </Card.Body>
        </Card>
      );
    }

    return (
      <>
        <Row className="mb-2">
          <Col md={6} className="mb-2">
            <Card className="h-100 shadow">
              <Card.Header as="h5">Current Allocation Projection</Card.Header>
              <Card.Body>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={assetChartData}
                      dataKey="currentValue"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={CustomPieChartLabel}
                    >
                      {assetChartData.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={CURRENT_COLORS[index % CURRENT_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => toLocalCurrency(value as number)}
                    />
                    <Legend
                      className="d-none d-lg-block"
                      formatter={(value) => {
                        const item = assetChartData.find(
                          (d) => d.name === value
                        );
                        return item?.currentValue ? value : "";
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </Card.Body>
              <Card.Footer className="text-center">
                <strong>
                  Total: {toLocalCurrency(totalCurrentAssetsForChart)}
                </strong>
              </Card.Footer>
            </Card>
          </Col>
          <Col md={6} className="mb-2">
            <Card className="h-100 shadow">
              <Card.Header as="h5">Projected Allocation</Card.Header>
              <Card.Body>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={assetChartData}
                      dataKey="projectedValue"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={CustomPieChartLabel}
                    >
                      {assetChartData.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={
                            PROJECTED_COLORS[index % PROJECTED_COLORS.length]
                          }
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => toLocalCurrency(value as number)}
                    />
                    <Legend
                      className="d-none d-lg-block"
                      formatter={(value) => {
                        const item = assetChartData.find(
                          (d) => d.name === value
                        );
                        return item?.projectedValue ? value : "";
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </Card.Body>
              <Card.Footer className="text-center">
                <strong>
                  Total: {toLocalCurrency(totalProjectedAssetsForChart)}
                </strong>
                {"  "}
                <Badge bg={cagr >= 0 ? "success" : "danger"}>
                  CAGR: {cagr.toFixed(2)}%
                </Badge>
              </Card.Footer>
            </Card>
          </Col>
        </Row>

        {/* Mobile Card View */}
        <div className="d-lg-none">
          {assetProjectionData?.map((record: ProjectionData) => (
            <Card key={record.id} className="mb-3 shadow-sm">
              <Card.Body>
                <div className="d-flex justify-content-between align-items-start mb-3">
                  <div>
                    <h6 className="mb-1">{record.assetSubClassName}</h6>
                    <div className="small text-muted">
                      Expected Returns: {record.expectedReturns}%
                    </div>
                  </div>
                  <Button
                    variant="outline-primary"
                    size="sm"
                    className="d-flex align-items-center gap-1"
                    onClick={() => handleEditAsset(record)}
                  >
                    <BsPencil size={14} />
                    <span>Edit</span>
                  </Button>
                </div>

                <Row className="g-3">
                  <Col xs={6}>
                    <div className="small text-muted">Current Allocation</div>
                    <div className="fw-bold text-success">
                      {toLocalCurrency(record.currentAllocation)}
                    </div>
                  </Col>
                  <Col xs={6}>
                    <div className="small text-muted">Projected Value</div>
                    <div className="fw-bold text-success">
                      {toLocalCurrency(record.projectedValue)}
                    </div>
                  </Col>
                  <Col xs={6}>
                    <div className="small text-muted">Current Monthly</div>
                    <div className="fw-bold text-success">
                      {toLocalCurrency(record.currentMonthlyInvestment)}
                    </div>
                  </Col>
                  <Col xs={6}>
                    <div className="small text-muted">New Monthly</div>
                    <div className="fw-bold text-warning">
                      {toLocalCurrency(record.newMonthlyInvestment)}
                    </div>
                  </Col>
                  <Col xs={6}>
                    <div className="small text-muted">Lumpsum Expected</div>
                    <div className="fw-bold text-warning">
                      {toLocalCurrency(record.lumpsumExpected)}
                    </div>
                  </Col>
                  <Col xs={6}>
                    <div className="small text-muted">Redemption Expected</div>
                    <div className="fw-bold text-warning">
                      {toLocalCurrency(record.redemptionExpected)}
                    </div>
                  </Col>
                </Row>

                {record.comment && (
                  <div className="mt-3 pt-3 border-top">
                    <div className="small text-muted mb-1">Comment</div>
                    <div className="fw-bold text-warning">{record.comment}</div>
                  </div>
                )}
              </Card.Body>
            </Card>
          ))}
        </div>

        {/* Desktop Table View */}
        <div className="d-none d-lg-block">
          <Table striped bordered hover>
            <thead className="table-dark">
              <tr>
                <th>Asset Sub Class</th>
                <th>Expected Returns (%)</th>
                <th>Current Allocation</th>
                <th>Current Monthly Investment</th>
                <th>New Monthly Investment</th>
                <th>Lumpsum Expected</th>
                <th>Redemption Expected</th>
                <th>Comment</th>
                <th>Projected Value</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {assetProjectionData?.map((record: ProjectionData) => (
                <tr key={record.id}>
                  <td>{record.assetSubClassName}</td>
                  <td>{record.expectedReturns}</td>
                  <td className="align-middle fw-bold text-success fs-6">
                    {toLocalCurrency(record.currentAllocation)}
                  </td>
                  <td className="align-middle fw-bold text-success fs-6">
                    {toLocalCurrency(record.currentMonthlyInvestment)}
                  </td>
                  <td className="align-middle fw-bold text-warning fs-6">
                    {toLocalCurrency(record.newMonthlyInvestment)}
                  </td>
                  <td className="align-middle fw-bold text-warning fs-6">
                    {toLocalCurrency(record.lumpsumExpected)}
                  </td>
                  <td className="align-middle fw-bold text-warning fs-6">
                    {toLocalCurrency(record.redemptionExpected)}
                  </td>
                  <td className="text-warning fw-bold fs-6">
                    {record.comment}
                  </td>
                  <td className="align-middle fw-bold text-success fs-6">
                    {toLocalCurrency(record.projectedValue)}
                  </td>
                  <td>
                    <Button
                      variant="outline-primary"
                      size="sm"
                      className="d-flex align-items-center gap-1"
                      onClick={() => handleEditAsset(record)}
                    >
                      <BsPencil size={14} />
                      <span>Edit</span>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      </>
    );
  };

  // Render Liability Projection Tab
  const renderLiabilityProjection = () => (
    <>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5>Liability Projections</h5>
        <Button
          variant="success"
          onClick={handleAddFutureLoan}
          className="d-flex align-items-center gap-2"
        >
          <span>+</span>
          <span>Add Future Loan</span>
        </Button>
      </div>
      {/* Mobile Card View */}
      <div className="d-lg-none">
        {liabilityProjectionData?.map((record: LiabilityProjectionData) => (
          <Card key={record.id} className="mb-3 shadow-sm">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-start mb-3">
                <div>
                  <div className="d-flex align-items-center gap-2 mb-1">
                    <h6 className="mb-0">{record.loanTypeName}</h6>
                    {record.isFutureLoan && (
                      <Badge bg="info">Future Loan</Badge>
                    )}
                  </div>
                  <div className="small text-muted">
                    Interest Rate: {record.interestRate}%
                  </div>
                  {record.isFutureLoan && record.startDate && (
                    <div className="small text-muted">
                      Start Date: {record.startDate}
                    </div>
                  )}
                </div>
                <Button
                  variant="outline-primary"
                  size="sm"
                  className="d-flex align-items-center gap-1"
                  onClick={() => handleEditLiability(record)}
                >
                  <BsPencil size={14} />
                  <span>Edit</span>
                </Button>
              </div>

              <Row className="g-3">
                <Col xs={6}>
                  <div className="small text-muted">Current Balance</div>
                  <div className="fw-bold text-danger">
                    {toLocalCurrency(record.currentBalance)}
                  </div>
                </Col>
                <Col xs={6}>
                  <div className="small text-muted">Projected Balance</div>
                  <div className="fw-bold text-danger">
                    {toLocalCurrency(record.projectedBalance)}
                  </div>
                </Col>
                <Col xs={6}>
                  <div className="small text-muted">Current EMI</div>
                  <div className="fw-bold text-danger">
                    {toLocalCurrency(record.currentEmi)}
                  </div>
                </Col>
                <Col xs={6}>
                  <div className="small text-muted">New EMI</div>
                  <div className="fw-bold text-warning">
                    {toLocalCurrency(record.newEmi)}
                  </div>
                </Col>
                <Col xs={6}>
                  <div className="small text-muted">Prepayment Expected</div>
                  <div className="fw-bold text-warning">
                    {toLocalCurrency(record.prepaymentExpected)}
                  </div>
                </Col>
              </Row>

              {record.comment && (
                <div className="mt-3 pt-3 border-top">
                  <div className="small text-muted mb-1">Comment</div>
                  <div className="fw-bold text-warning">{record.comment}</div>
                </div>
              )}
            </Card.Body>
          </Card>
        ))}
      </div>

      {/* Desktop Table View */}
      <div className="d-none d-lg-block">
        <Table striped bordered hover>
          <thead className="table-dark">
            <tr>
              <th>Loan Type</th>
              <th>Interest Rate (%)</th>
              <th>Current Balance</th>
              <th>Current EMI</th>
              <th>New EMI</th>
              <th>Prepayment Expected</th>
              <th>Comment</th>
              <th>Projected Balance</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {liabilityProjectionData?.map((record: LiabilityProjectionData) => (
              <tr key={record.id}>
                <td>
                  <div className="d-flex align-items-center gap-2">
                    <span>{record.loanTypeName}</span>
                    {record.isFutureLoan && (
                      <Badge bg="info">Future</Badge>
                    )}
                  </div>
                  {record.isFutureLoan && record.startDate && (
                    <div className="small text-muted">
                      Start: {record.startDate}
                    </div>
                  )}
                </td>
                <td>{record.interestRate}</td>
                <td className="align-middle fw-bold text-danger fs-6">
                  {toLocalCurrency(record.currentBalance)}
                </td>
                <td className="align-middle fw-bold text-danger fs-6">
                  {toLocalCurrency(record.currentEmi)}
                </td>
                <td className="align-middle fw-bold text-warning fs-6">
                  {toLocalCurrency(record.newEmi)}
                </td>
                <td className="align-middle fw-bold text-warning fs-6">
                  {toLocalCurrency(record.prepaymentExpected)}
                </td>
                <td className="text-warning fw-bold fs-6">{record.comment}</td>
                <td className="align-middle fw-bold text-danger fs-6">
                  {toLocalCurrency(record.projectedBalance)}
                </td>
                <td>
                  <Button
                    variant="outline-primary"
                    size="sm"
                    className="d-flex align-items-center gap-1"
                    onClick={() => handleEditLiability(record)}
                  >
                    <BsPencil size={14} />
                    <span>Edit</span>
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
    </>
  );

  // Render Networth Projection Tab
  const renderNetworthProjection = () => (
    <>
      <Row className="mb-4">
        <Col md={6} className="mb-3">
          <Card className="h-100 shadow">
            <Card.Header as="h5">Current Networth</Card.Header>
            <Card.Body>
              <div className="text-center">
                <h3 className="mb-3">{toLocalCurrency(currentNetworth)}</h3>
                <Row className="g-3">
                  <Col xs={6}>
                    <div className="small text-muted">Current Assets</div>
                    <div className="fw-bold text-success">
                      {toLocalCurrency(totalCurrentAssets)}
                    </div>
                  </Col>
                  <Col xs={6}>
                    <div className="small text-muted">Current Liabilities</div>
                    <div className="fw-bold text-danger">
                      {toLocalCurrency(totalCurrentLiabilities)}
                    </div>
                  </Col>
                </Row>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={6} className="mb-3">
          <Card className="h-100 shadow">
            <Card.Header as="h5">Projected Networth</Card.Header>
            <Card.Body>
              <div className="text-center">
                <h3 className="mb-3">{toLocalCurrency(projectedNetworth)}</h3>
                <Row className="g-3">
                  <Col xs={6}>
                    <div className="small text-muted">Projected Assets</div>
                    <div className="fw-bold text-success">
                      {toLocalCurrency(totalProjectedAssets)}
                    </div>
                  </Col>
                  <Col xs={6}>
                    <div className="small text-muted">
                      Projected Liabilities
                    </div>
                    <div className="fw-bold text-danger">
                      {toLocalCurrency(totalProjectedLiabilities)}
                    </div>
                  </Col>
                </Row>
              </div>
            </Card.Body>
            <Card.Footer className="text-center">
              <Badge bg={networthChange >= 0 ? "success" : "danger"}>
                Change: {toLocalCurrency(networthChange)} (
                {networthChangePercent.toFixed(2)}%)
              </Badge>
            </Card.Footer>
          </Card>
        </Col>
      </Row>

      <Card className="shadow">
        <Card.Header as="h5">Networth Summary</Card.Header>
        <Card.Body>
          {/* Mobile Card View */}
          <div className="d-lg-none">
            <Card className="mb-3 shadow-sm">
              <Card.Body>
                <h6 className="fw-bold mb-3">Assets</h6>
                <Row className="g-3">
                  <Col xs={6}>
                    <div className="small text-muted">Current</div>
                    <div className="fw-bold text-success">
                      {toLocalCurrency(totalCurrentAssets)}
                    </div>
                  </Col>
                  <Col xs={6}>
                    <div className="small text-muted">Projected</div>
                    <div className="fw-bold text-success">
                      {toLocalCurrency(totalProjectedAssets)}
                    </div>
                  </Col>
                  <Col xs={6}>
                    <div className="small text-muted">Change</div>
                    <div
                      className={`fw-bold ${
                        totalProjectedAssets - totalCurrentAssets >= 0
                          ? "text-success"
                          : "text-danger"
                      }`}
                    >
                      {toLocalCurrency(
                        totalProjectedAssets - totalCurrentAssets
                      )}
                    </div>
                  </Col>
                  <Col xs={6}>
                    <div className="small text-muted">Change %</div>
                    <div
                      className={`fw-bold ${
                        totalProjectedAssets - totalCurrentAssets >= 0
                          ? "text-success"
                          : "text-danger"
                      }`}
                    >
                      {totalCurrentAssets > 0
                        ? (
                            ((totalProjectedAssets - totalCurrentAssets) /
                              totalCurrentAssets) *
                            100
                          ).toFixed(2)
                        : "0.00"}
                      %
                    </div>
                  </Col>
                </Row>
              </Card.Body>
            </Card>

            <Card className="mb-3 shadow-sm">
              <Card.Body>
                <h6 className="fw-bold mb-3">Liabilities</h6>
                <Row className="g-3">
                  <Col xs={6}>
                    <div className="small text-muted">Current</div>
                    <div className="fw-bold text-danger">
                      {toLocalCurrency(totalCurrentLiabilities)}
                    </div>
                  </Col>
                  <Col xs={6}>
                    <div className="small text-muted">Projected</div>
                    <div className="fw-bold text-danger">
                      {toLocalCurrency(totalProjectedLiabilities)}
                    </div>
                  </Col>
                  <Col xs={6}>
                    <div className="small text-muted">Change</div>
                    <div
                      className={`fw-bold ${
                        totalCurrentLiabilities - totalProjectedLiabilities >= 0
                          ? "text-success"
                          : "text-danger"
                      }`}
                    >
                      {toLocalCurrency(
                        totalCurrentLiabilities - totalProjectedLiabilities
                      )}
                    </div>
                  </Col>
                  <Col xs={6}>
                    <div className="small text-muted">Change %</div>
                    <div
                      className={`fw-bold ${
                        totalCurrentLiabilities - totalProjectedLiabilities >= 0
                          ? "text-success"
                          : "text-danger"
                      }`}
                    >
                      {totalCurrentLiabilities > 0
                        ? (
                            ((totalCurrentLiabilities -
                              totalProjectedLiabilities) /
                              totalCurrentLiabilities) *
                            100
                          ).toFixed(2)
                        : "0.00"}
                      %
                    </div>
                  </Col>
                </Row>
              </Card.Body>
            </Card>

            <Card className="mb-3 shadow-sm border-primary">
              <Card.Body>
                <h6 className="fw-bold mb-3 text-primary">Networth</h6>
                <Row className="g-3">
                  <Col xs={6}>
                    <div className="small text-muted">Current</div>
                    <div className="fw-bold">
                      {toLocalCurrency(currentNetworth)}
                    </div>
                  </Col>
                  <Col xs={6}>
                    <div className="small text-muted">Projected</div>
                    <div className="fw-bold">
                      {toLocalCurrency(projectedNetworth)}
                    </div>
                  </Col>
                  <Col xs={6}>
                    <div className="small text-muted">Change</div>
                    <div
                      className={`fw-bold ${
                        networthChange >= 0 ? "text-success" : "text-danger"
                      }`}
                    >
                      {toLocalCurrency(networthChange)}
                    </div>
                  </Col>
                  <Col xs={6}>
                    <div className="small text-muted">Change %</div>
                    <div
                      className={`fw-bold ${
                        networthChange >= 0 ? "text-success" : "text-danger"
                      }`}
                    >
                      {networthChangePercent.toFixed(2)}%
                    </div>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </div>

          {/* Desktop Table View */}
          <div className="d-none d-lg-block">
            <Table striped bordered hover>
              <thead className="table-dark">
                <tr>
                  <th>Category</th>
                  <th>Current</th>
                  <th>Projected</th>
                  <th>Change</th>
                  <th>Change %</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="fw-bold">Assets</td>
                  <td className="text-success fw-bold">
                    {toLocalCurrency(totalCurrentAssets)}
                  </td>
                  <td className="text-success fw-bold">
                    {toLocalCurrency(totalProjectedAssets)}
                  </td>
                  <td
                    className={
                      totalProjectedAssets - totalCurrentAssets >= 0
                        ? "text-success"
                        : "text-danger"
                    }
                  >
                    {toLocalCurrency(totalProjectedAssets - totalCurrentAssets)}
                  </td>
                  <td>
                    {totalCurrentAssets > 0
                      ? (
                          ((totalProjectedAssets - totalCurrentAssets) /
                            totalCurrentAssets) *
                          100
                        ).toFixed(2)
                      : "0.00"}
                    %
                  </td>
                </tr>
                <tr>
                  <td className="fw-bold">Liabilities</td>
                  <td className="text-danger fw-bold">
                    {toLocalCurrency(totalCurrentLiabilities)}
                  </td>
                  <td className="text-danger fw-bold">
                    {toLocalCurrency(totalProjectedLiabilities)}
                  </td>
                  <td
                    className={
                      totalCurrentLiabilities - totalProjectedLiabilities >= 0
                        ? "text-success"
                        : "text-danger"
                    }
                  >
                    {toLocalCurrency(
                      totalCurrentLiabilities - totalProjectedLiabilities
                    )}
                  </td>
                  <td>
                    {totalCurrentLiabilities > 0
                      ? (
                          ((totalCurrentLiabilities -
                            totalProjectedLiabilities) /
                            totalCurrentLiabilities) *
                          100
                        ).toFixed(2)
                      : "0.00"}
                    %
                  </td>
                </tr>
                <tr className="table-primary">
                  <td className="fw-bold">Networth</td>
                  <td className="fw-bold">
                    {toLocalCurrency(currentNetworth)}
                  </td>
                  <td className="fw-bold">
                    {toLocalCurrency(projectedNetworth)}
                  </td>
                  <td
                    className={
                      networthChange >= 0 ? "text-success" : "text-danger"
                    }
                  >
                    {toLocalCurrency(networthChange)}
                  </td>
                  <td
                    className={
                      networthChange >= 0 ? "text-success" : "text-danger"
                    }
                  >
                    {networthChangePercent.toFixed(2)}%
                  </td>
                </tr>
              </tbody>
            </Table>
          </div>
        </Card.Body>
      </Card>
    </>
  );

  return (
    <Container fluid className="flex-grow-1 overflow-auto">
      {alert && (
        <Alert variant={alert.type} onClose={() => setAlert(null)} dismissible>
          {alert.message}
        </Alert>
      )}

      <Tabs
        activeKey={activeTab}
        onSelect={(k) => setActiveTab(k || "assets")}
        className="mb-3"
      >
        <Tab eventKey="assets" title="Assets Projection">
          {renderAssetProjection()}
        </Tab>
        <Tab eventKey="liability" title="Liability Projection">
          {renderLiabilityProjection()}
        </Tab>
        <Tab eventKey="networth" title="Networth Projection">
          {renderNetworthProjection()}
        </Tab>
      </Tabs>

      {/* Asset Modal */}
      <Modal show={showAssetModal} onHide={() => setShowAssetModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Edit Asset Projection</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmitAsset}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>New Monthly Investment</Form.Label>
              <Form.Control
                type="number"
                value={assetFormData.newMonthlyInvestment}
                onChange={(e) =>
                  setAssetFormData((prev) => ({
                    ...prev,
                    newMonthlyInvestment: Number(e.target.value),
                  }))
                }
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Lumpsum Expected</Form.Label>
              <Form.Control
                type="number"
                value={assetFormData.lumpsumExpected}
                onChange={(e) =>
                  setAssetFormData((prev) => ({
                    ...prev,
                    lumpsumExpected: Number(e.target.value),
                  }))
                }
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Redemption Expected</Form.Label>
              <Form.Control
                type="number"
                value={assetFormData.redemptionExpected}
                onChange={(e) =>
                  setAssetFormData((prev) => ({
                    ...prev,
                    redemptionExpected: Number(e.target.value),
                  }))
                }
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Comment</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={assetFormData.comment}
                onChange={(e) =>
                  setAssetFormData((prev) => ({
                    ...prev,
                    comment: e.target.value,
                  }))
                }
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button
              variant="secondary"
              onClick={() => setShowAssetModal(false)}
            >
              Close
            </Button>
            <Button variant="primary" type="submit">
              Save Changes
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Liability Modal */}
      <Modal
        show={showLiabilityModal}
        onHide={() => {
          setShowLiabilityModal(false);
          setIsAddingFutureLoan(false);
          setEditingLiabilityRecord(null);
        }}
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>
            {isAddingFutureLoan
              ? "Add Future Loan"
              : editingLiabilityRecord?.isFutureLoan
              ? "Edit Future Loan"
              : "Edit Liability Projection"}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmitLiability}>
          <Modal.Body>
            {isAddingFutureLoan || editingLiabilityRecord?.isFutureLoan ? (
              <>
                <Form.Group className="mb-3">
                  <Form.Label>Loan Type *</Form.Label>
                  <Form.Select
                    value={liabilityFormData.loanType_id || 0}
                    onChange={(e) =>
                      setLiabilityFormData((prev) => ({
                        ...prev,
                        loanType_id: Number(e.target.value),
                      }))
                    }
                    required
                  >
                    <option value={0}>Select Loan Type</option>
                    {loanTypes?.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.name}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Loan Amount *</Form.Label>
                  <Form.Control
                    type="number"
                    value={liabilityFormData.loanAmount || 0}
                    onChange={(e) =>
                      setLiabilityFormData((prev) => ({
                        ...prev,
                        loanAmount: Number(e.target.value),
                      }))
                    }
                    required
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>EMI *</Form.Label>
                  <Form.Control
                    type="number"
                    value={liabilityFormData.emi || 0}
                    onChange={(e) =>
                      setLiabilityFormData((prev) => ({
                        ...prev,
                        emi: Number(e.target.value),
                      }))
                    }
                    required
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Start Date (DD-MM-YYYY) *</Form.Label>
                  <Form.Control
                    type="date"
                    value={convertToDateInputFormat(liabilityFormData.startDate)}
                    onChange={(e) =>
                      setLiabilityFormData((prev) => ({
                        ...prev,
                        startDate: convertFromDateInputFormat(e.target.value),
                      }))
                    }
                    required
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Total Months</Form.Label>
                  <Form.Control
                    type="number"
                    value={liabilityFormData.totalMonths || 0}
                    onChange={(e) =>
                      setLiabilityFormData((prev) => ({
                        ...prev,
                        totalMonths: Number(e.target.value),
                      }))
                    }
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>New EMI (0 to keep current EMI)</Form.Label>
                  <Form.Control
                    type="number"
                    value={liabilityFormData.newEmi}
                    onChange={(e) =>
                      setLiabilityFormData((prev) => ({
                        ...prev,
                        newEmi: Number(e.target.value),
                      }))
                    }
                    required
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Prepayment Expected</Form.Label>
                  <Form.Control
                    type="number"
                    value={liabilityFormData.prepaymentExpected}
                    onChange={(e) =>
                      setLiabilityFormData((prev) => ({
                        ...prev,
                        prepaymentExpected: Number(e.target.value),
                      }))
                    }
                    required
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Comment</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    value={liabilityFormData.comment}
                    onChange={(e) =>
                      setLiabilityFormData((prev) => ({
                        ...prev,
                        comment: e.target.value,
                      }))
                    }
                  />
                </Form.Group>
              </>
            ) : (
              <>
                <Form.Group className="mb-3">
                  <Form.Label>New EMI (0 to keep current)</Form.Label>
                  <Form.Control
                    type="number"
                    value={liabilityFormData.newEmi}
                    onChange={(e) =>
                      setLiabilityFormData((prev) => ({
                        ...prev,
                        newEmi: Number(e.target.value),
                      }))
                    }
                    required
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Prepayment Expected</Form.Label>
                  <Form.Control
                    type="number"
                    value={liabilityFormData.prepaymentExpected}
                    onChange={(e) =>
                      setLiabilityFormData((prev) => ({
                        ...prev,
                        prepaymentExpected: Number(e.target.value),
                      }))
                    }
                    required
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Comment</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    value={liabilityFormData.comment}
                    onChange={(e) =>
                      setLiabilityFormData((prev) => ({
                        ...prev,
                        comment: e.target.value,
                      }))
                    }
                  />
                </Form.Group>
              </>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button
              variant="secondary"
              onClick={() => {
                setShowLiabilityModal(false);
                setIsAddingFutureLoan(false);
                setEditingLiabilityRecord(null);
              }}
            >
              Close
            </Button>
            <Button variant="primary" type="submit">
              {isAddingFutureLoan ? "Add Future Loan" : "Save Changes"}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
}
