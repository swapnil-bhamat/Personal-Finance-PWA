import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../services/db";
import type { AssetPurpose } from "../services/db";
import { Card } from "react-bootstrap";
import { Sankey, Tooltip, ResponsiveContainer } from "recharts";

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="d-flex align-items-center gap-2 mb-2">
      <span
        style={{
          display: "inline-block",
          width: 16,
          height: 16,
          borderRadius: 4,
          backgroundColor: color,
        }}
      />
      <span>{label}</span>
    </div>
  );
}

export default function CashFlowDiagram() {
  const data = useLiveQuery(async () => {
    const incomes = await db.income.toArray();
    const cashFlows = await db.cashFlow.toArray();
    const purposes = await db.assetPurposes.toArray();
    const goals = await db.goals.toArray();

    const totalIncome = incomes.reduce(
      (sum, i) => sum + Number(i.monthly || 0),
      0
    );

    // 🔹 Build purpose lookup
    const purposeMap: Record<number, AssetPurpose> = {};
    purposes.forEach((p) => {
      if (p.id) purposeMap[p.id] = p;
    });

    // 🔹 Aggregate flows
    const purposeTotals: Record<number, number> = {};
    cashFlows.forEach((flow) => {
      purposeTotals[flow.assetPurpose_id] =
        (purposeTotals[flow.assetPurpose_id] || 0) + flow.monthly;
    });

    const goalTotals: Record<number, number> = {};
    cashFlows.forEach((flow) => {
      if (flow.goal_id) {
        goalTotals[flow.goal_id] =
          (goalTotals[flow.goal_id] || 0) + flow.monthly;
      }
    });

    // 🔹 Format labels
    const formatNodeLabel = (name: string, amount: number) => {
      const pct =
        totalIncome > 0 ? ((amount / totalIncome) * 100).toFixed(1) : "0";
      return `${name} (₹${amount.toLocaleString("en-IN")} — ${pct}%)`;
    };

    // 🔹 Category colors (brighter palette)
    const categories = [
      { key: "Need", color: "#FF4C4C" },
      { key: "Want", color: "#FFB347" },
      { key: "Savings", color: "#4CAF50" },
    ];

    const nodes: { key: string; name: string; color?: string }[] = [
      {
        key: "income",
        name: formatNodeLabel("Income", totalIncome),
        color: "#4285F4",
      },
    ];

    // Categories
    categories.forEach((c) => {
      const total = purposes
        .filter((p) => p.type.toLowerCase() === c.key.toLowerCase())
        .reduce((sum, p) => sum + (purposeTotals[p.id!] || 0), 0);
      nodes.push({
        key: `cat-${c.key.toLowerCase()}`,
        name: formatNodeLabel(c.key, total),
        color: c.color,
      });
    });

    // Purposes
    purposes.forEach((p) => {
      const amt = purposeTotals[p.id!] || 0;
      nodes.push({
        key: `purpose-${p.id}`,
        name: formatNodeLabel(p.name, amt),
        color:
          p.type === "need"
            ? "#FF6B6B"
            : p.type === "want"
            ? "#FFD166"
            : "#06D6A0",
      });
    });

    // Goals
    goals.forEach((g) => {
      const amt = goalTotals[g.id!] || 0;
      nodes.push({
        key: `goal-${g.id}`,
        name: formatNodeLabel(g.name, amt),
        color: "#1ABC9C",
      });
    });

    const nodeIndex = (key: string) => nodes.findIndex((n) => n.key === key);

    const links: { source: number; target: number; value: number }[] = [];

    categories.forEach((c) => {
      const total = purposes
        .filter((p) => p.type.toLowerCase() === c.key.toLowerCase())
        .reduce((sum, p) => sum + (purposeTotals[p.id!] || 0), 0);
      if (total > 0) {
        links.push({
          source: nodeIndex("income"),
          target: nodeIndex(`cat-${c.key.toLowerCase()}`),
          value: total,
        });
      }
    });

    purposes.forEach((p) => {
      if (purposeTotals[p.id!] > 0) {
        links.push({
          source: nodeIndex(`cat-${p.type.toLowerCase()}`),
          target: nodeIndex(`purpose-${p.id}`),
          value: purposeTotals[p.id!],
        });
      }
    });

    cashFlows.forEach((flow) => {
      if (flow.goal_id) {
        const purpose = purposeMap[flow.assetPurpose_id];
        const goal = goals.find((g) => g.id === flow.goal_id);
        if (purpose && goal) {
          links.push({
            source: nodeIndex(`purpose-${purpose.id}`),
            target: nodeIndex(`goal-${goal.id}`),
            value: flow.monthly,
          });
        }
      }
    });

    const sankeyNodes = nodes.map(({ key, ...rest }) => rest);

    return { nodes: sankeyNodes, links, categories };
  }, []);

  if (!data) return null;

  const isMobile = window.innerWidth < 600;

  return (
    <Card className="mb-4 shadow-sm">
      <Card.Header as="h6">Cash Flow Diagram</Card.Header>
      <Card.Body style={{ height: isMobile ? 400 : "65vh", minHeight: 350, padding: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <Sankey
            width={isMobile ? 340 : 960}
            height={isMobile ? 340 : 500}
            data={data}
            nodePadding={isMobile ? 12 : 40}
            node={{
              fill: "#ddd",
              stroke: "#555",
              strokeWidth: 0.6,
              fontSize: isMobile ? 11 : 14,
            }}
            link={{
              stroke: "url(#linkGradient)",
              strokeOpacity: 0.4,
            }}
            margin={{
              left: isMobile ? 5 : 50,
              right: isMobile ? 5 : 50,
              top: 20,
              bottom: 20,
            }}
          >
            {/* Gradient for links */}
            <defs>
              <linearGradient id="linkGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#8884d8" />
                <stop offset="100%" stopColor="#82ca9d" />
              </linearGradient>
            </defs>

            <Tooltip
              wrapperStyle={{ fontSize: isMobile ? 11 : 14 }}
              formatter={(value: number) =>
                `₹${value.toLocaleString("en-IN", {
                  maximumFractionDigits: 2,
                })}`
              }
            />
          </Sankey>
        </ResponsiveContainer>

        {/* Legend */}
        <div
          className="mt-3 d-flex flex-wrap justify-content-center gap-3"
          style={{ fontSize: isMobile ? 11 : 14 }}
        >
          <LegendItem color="#4285F4" label="Income" />
          <LegendItem color="#FF4C4C" label="Need" />
          <LegendItem color="#FFB347" label="Want" />
          <LegendItem color="#4CAF50" label="Savings" />
          <LegendItem color="#1ABC9C" label="Goals" />
        </div>
      </Card.Body>
    </Card>
  );
}
