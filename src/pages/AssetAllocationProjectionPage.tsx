import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Button, Card, Row, Col } from "react-bootstrap";
import { db } from "../services/db";
import { toLocalCurrency } from "../utils/numberUtils";
import BasePage from "../components/BasePage";
import { BaseRecord, Column } from "../types/BasePage.types";
import { AssetAllocationProjectionForm } from "../components/AssetAllocationProjectionForm";
import AssetAllocationGraphModal from "../components/AssetAllocationGraphModal";
import { MdAutoGraph } from "react-icons/md";

export interface AllocationRecord extends BaseRecord {
  assetClassId: number;
  subClassId: number;
  name: string;
  className: string;
  monthlyInvestment: number;
  lumpsumExpected: number;
  redemptionExpected: number;
  expectedReturns: number;
  existingAllocation: number;
  projectedAllocation: number;
  isTotal?: boolean;
}

const calculateProjection = ({
  existingAllocation,
  monthlyInvestment,
  lumpsumExpected,
  redemptionExpected,
  expectedReturns,
}: Pick<
  AllocationRecord,
  | "existingAllocation"
  | "monthlyInvestment"
  | "lumpsumExpected"
  | "redemptionExpected"
  | "expectedReturns"
>): number => {
  const monthlyRate = expectedReturns / 12 / 100;
  const months = 12;

  // Calculate future value of existing allocation
  const existingFV = existingAllocation * Math.pow(1 + monthlyRate, months);

  // Calculate future value of monthly investments (SIP)
  const sipFV =
    monthlyInvestment * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate);

  // Add lumpsum and subtract redemptions
  const finalValue = existingFV + sipFV + lumpsumExpected - redemptionExpected;

  return parseInt(String(Math.max(0, finalValue)));
};

export default function AssetAllocationProjectionPage() {
  // Use memo for raw data to prevent unnecessary updates
  const rawAssetClasses = useLiveQuery(() => db.assetClasses.toArray());
  const rawAssetSubClasses = useLiveQuery(() => db.assetSubClasses.toArray());
  const rawAssetsHoldings = useLiveQuery(() => db.assetsHoldings.toArray());

  const assetClasses = useMemo(() => rawAssetClasses ?? [], [rawAssetClasses]);
  const assetSubClasses = useMemo(
    () => rawAssetSubClasses ?? [],
    [rawAssetSubClasses]
  );
  const assetsHoldings = useMemo(
    () => rawAssetsHoldings ?? [],
    [rawAssetsHoldings]
  );

  // State to track edited records
  const [editedRecords, setEditedRecords] = useState<
    Map<number, AllocationRecord>
  >(new Map());

  // Convert data for table display
  const tableData = useMemo<AllocationRecord[]>(() => {
    const data: AllocationRecord[] = [];
    let idCounter = 1;

    assetClasses.forEach((assetClass) => {
      const subClasses = assetSubClasses.filter(
        (sub) => sub.assetClasses_id === assetClass.id
      );

      subClasses.forEach((subClass) => {
        const holdings = assetsHoldings.filter(
          (h) => h.assetSubClasses_id === subClass.id
        );

        // Check if we have an edited version of this record
        const existingRecord = editedRecords.get(idCounter);

        if (existingRecord) {
          // Use the edited values
          data.push({
            ...existingRecord,
            projectedAllocation: calculateProjection(existingRecord),
          });
          idCounter++;
          return;
        }

        const existingAllocation = holdings.reduce(
          (sum, h) => sum + (h.existingAllocation || 0),
          0
        );
        const monthlyInvestment = holdings.reduce(
          (sum, h) => sum + (h.sip || 0),
          0
        );

        const row: AllocationRecord = {
          id: idCounter++,
          assetClassId: assetClass.id,
          subClassId: subClass.id,
          name: subClass.name,
          className: assetClass.name,
          existingAllocation,
          monthlyInvestment,
          lumpsumExpected: 0,
          redemptionExpected: 0,
          expectedReturns: subClass.expectedReturns,
          projectedAllocation: calculateProjection({
            existingAllocation,
            monthlyInvestment,
            lumpsumExpected: 0,
            redemptionExpected: 0,
            expectedReturns: subClass.expectedReturns,
          }),
        };

        data.push(row);
      });

      // Process totals if needed in the future
    });

    return data;
  }, [assetClasses, assetSubClasses, assetsHoldings, editedRecords]);

  // Generate chart data
  const { currentPieData, projectedPieData } = useMemo(() => {
    const currentByClass = new Map<number, number>();
    const projectedByClass = new Map<number, number>();

    tableData
      .filter((row) => !row.isTotal)
      .forEach((row) => {
        const currentTotal = currentByClass.get(row.assetClassId) || 0;
        currentByClass.set(
          row.assetClassId,
          currentTotal + row.existingAllocation
        );

        const projectedTotal = projectedByClass.get(row.assetClassId) || 0;
        projectedByClass.set(
          row.assetClassId,
          projectedTotal + row.projectedAllocation
        );
      });

    type ChartData = {
      name: string;
      value: number;
    };

    const mapToChartData = (map: Map<number, number>): ChartData[] =>
      Array.from(map.entries())
        .map(([classId, value]) => ({
          name: assetClasses.find((ac) => ac.id === classId)?.name || "",
          value,
        }))
        .filter((d) => d.value > 0);

    return {
      currentPieData: mapToChartData(currentByClass),
      projectedPieData: mapToChartData(projectedByClass),
    };
  }, [tableData, assetClasses]);

  const handleAdd = async (record: Partial<AllocationRecord>) => {
    console.log(
      "Add action is not supported directly. Please edit existing rows.",
      record
    );
  };

  const handleEdit = async (record: AllocationRecord) => {
    console.log(
      "Edit action is not supported directly. Please edit existing rows.",
      record
    );

    await setTimeout(() => {
      setEditedRecords((prev) => new Map(prev).set(record.id, record));
    }, 0);
  };

  const handleDelete = async (record: AllocationRecord) => {
    console.log(
      "Delete action is not supported directly. Please edit existing rows.",
      record
    );
  };

  const columns: Column<AllocationRecord>[] = [
    {
      field: "name",
      headerName: "Asset Class / Sub Class",
      width: "20%",
      style: { width: "20%" },
    },
    {
      field: "existingAllocation",
      headerName: "Current Allocation",
      renderCell: (value) => toLocalCurrency(String(value.existingAllocation)),
    },
    {
      field: "monthlyInvestment",
      headerName: "Monthly Investment",
      renderCell: (value) => toLocalCurrency(String(value.monthlyInvestment)),
    },
    {
      field: "lumpsumExpected",
      headerName: "Lumpsum Expected",
      renderCell: (value) => toLocalCurrency(String(value.lumpsumExpected)),
    },
    {
      field: "redemptionExpected",
      headerName: "Redemption Expected",
      renderCell: (value) => toLocalCurrency(String(value.redemptionExpected)),
    },
    {
      field: "expectedReturns",
      headerName: "Expected Returns (%)",
      renderCell: (value) => String(value.expectedReturns),
    },
    {
      field: "projectedAllocation",
      headerName: "Projected Value",
      renderCell: (value) => toLocalCurrency(value.projectedAllocation),
    },
  ];

  const [showGraphs, setShowGraphs] = useState(false);

  const extraActions = (
    <Button variant="outline-success" onClick={() => setShowGraphs(true)}>
      <MdAutoGraph />
    </Button>
  );

  // Calculate totals
  const totalCurrentAssets = useMemo(
    () => tableData.reduce((sum, row) => sum + row.existingAllocation, 0),
    [tableData]
  );

  const totalProjectedAssets = useMemo(
    () => tableData.reduce((sum, row) => sum + row.projectedAllocation, 0),
    [tableData]
  );

  const projectedGrowth = totalProjectedAssets - totalCurrentAssets;
  const growthPercentage = (projectedGrowth / totalCurrentAssets) * 100;

  return (
    <>
      <Row className="mb-2">
        <Col md={4} className="mb-2">
          <Card className="h-100">
            <Card.Body>
              <Card.Title>Total Current Assets</Card.Title>
              <Card.Text className="h3 text-primary">
                {toLocalCurrency(totalCurrentAssets)}
              </Card.Text>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4} className="mb-2">
          <Card className="h-100">
            <Card.Body>
              <Card.Title>Projected Value</Card.Title>
              <Card.Text className="h3 text-info">
                {toLocalCurrency(totalProjectedAssets)}
              </Card.Text>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4} className="mb-2">
          <Card className="h-100">
            <Card.Body>
              <Card.Title>Projected Growth</Card.Title>
              <Card.Text className="h3 text-success">
                {toLocalCurrency(projectedGrowth)}
                <small className="text-muted ms-2">
                  ({growthPercentage.toFixed(2)}%)
                </small>
              </Card.Text>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <BasePage<AllocationRecord>
        title="Asset Allocation Projection"
        data={tableData}
        columns={columns}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        FormComponent={AssetAllocationProjectionForm}
        validateForm={() => true}
        extraActions={extraActions}
      />

      <AssetAllocationGraphModal
        show={showGraphs}
        onHide={() => setShowGraphs(false)}
        currentPieData={currentPieData}
        projectedPieData={projectedPieData}
      />
    </>
  );
}
