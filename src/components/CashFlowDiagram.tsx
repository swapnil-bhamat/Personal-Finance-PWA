import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../services/db";
import type { AssetPurpose } from "../services/db";
import { Card } from "react-bootstrap";
import { Sankey, Tooltip, ResponsiveContainer } from "recharts";
import { toLocalCurrency } from "../utils/numberUtils";

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

    const purposeMap: Record<number, AssetPurpose> = {};
    purposes.forEach((p) => {
      if (p.id) purposeMap[p.id] = p;
    });

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

    const formatNodeLabel = (name: string, amount: number) => {
      const pct =
        totalIncome > 0 ? ((amount / totalIncome) * 100).toFixed(1) : "0";
      return `${name} ${toLocalCurrency(amount)} — ${pct}%`;
    };

    const categories = [
      { key: "Need", color: "#FF4C4C" },
      { key: "Want", color: "#FFB347" },
      { key: "Savings", color: "#4CAF50" },
    ];

    const nodes: {
      key: string;
      name: string;
      color?: string;
      type?: string;
    }[] = [
      // Individual income sources
      ...incomes.map((income) => ({
        key: `income-${income.id}`,
        name: formatNodeLabel(
          income.item || "Income",
          Number(income.monthly || 0)
        ),
        color: "#4285F4",
        type: "income",
      })),
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
        type: "category",
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
        type: "purpose",
      });
    });

    // Goals
    goals.forEach((g) => {
      const amt = goalTotals[g.id!] || 0;
      nodes.push({
        key: `goal-${g.id}`,
        name: formatNodeLabel(g.name, amt),
        color: "#1ABC9C",
        type: "goal",
      });
    });

    const nodeIndex = (key: string) => nodes.findIndex((n) => n.key === key);

    const links: {
      source: number;
      target: number;
      value: number;
      color?: string;
    }[] = [];

    // income sources → categories
    incomes.forEach((income) => {
      const incomeAmount = Number(income.monthly || 0);
      if (incomeAmount > 0) {
        categories.forEach((c) => {
          const categoryTotal = purposes
            .filter((p) => p.type.toLowerCase() === c.key.toLowerCase())
            .reduce((sum, p) => sum + (purposeTotals[p.id!] || 0), 0);

          // Calculate proportional distribution of this income to the category
          const proportion = totalIncome > 0 ? categoryTotal / totalIncome : 0;
          const value = incomeAmount * proportion;

          if (value > 0) {
            links.push({
              source: nodeIndex(`income-${income.id}`),
              target: nodeIndex(`cat-${c.key.toLowerCase()}`),
              value: value,
              color: c.color,
            });
          }
        });
      }
    });

    // category → purposes
    purposes.forEach((p) => {
      if (purposeTotals[p.id!] > 0) {
        const catColor =
          p.type === "need"
            ? "#FF4C4C"
            : p.type === "want"
            ? "#FFB347"
            : "#4CAF50";
        links.push({
          source: nodeIndex(`cat-${p.type.toLowerCase()}`),
          target: nodeIndex(`purpose-${p.id}`),
          value: purposeTotals[p.id!],
          color: catColor,
        });
      }
    });

    // purposes → goals
    cashFlows.forEach((flow) => {
      if (flow.goal_id) {
        const purpose = purposeMap[flow.assetPurpose_id];
        const goal = goals.find((g) => g.id === flow.goal_id);
        if (purpose && goal) {
          const catColor =
            purpose.type === "need"
              ? "#FF4C4C"
              : purpose.type === "want"
              ? "#FFB347"
              : "#4CAF50";
          links.push({
            source: nodeIndex(`purpose-${purpose.id}`),
            target: nodeIndex(`goal-${goal.id}`),
            value: flow.monthly,
            color: catColor,
          });
        }
      }
    });

    const sankeyNodes = nodes.map(({ name, color, type }) => ({
      name,
      color,
      type,
    }));

    return { nodes: sankeyNodes, links, categories };
  }, []);

  if (!data) return null;

  const isMobile = window.innerWidth < 600;

  type CustomNodeProps = {
    x: number;
    y: number;
    height: number;
    index: number;
  };

  const CustomNode = (props: CustomNodeProps) => {
    const { x, y, height, index } = props;
    const node = data.nodes[index];

    if (isMobile) {
      // 🔹 Only rectangles on mobile
      return (
        <rect
          x={x}
          y={y}
          width={6}
          height={height}
          fill={node.color}
          stroke="currentColor"
          strokeWidth={node.type === "goal" ? 2 : 1}
          strokeOpacity={node.type === "goal" ? 0.5 : 0.3}
          rx={3}
        />
      );
    }

    // Desktop: render labels
    const label = node.name;
    const maxChars = 20;
    let line1 = label;
    let line2 = "";

    if (label.length > maxChars) {
      const words = label.split(" ");
      line1 = "";
      line2 = "";
      for (const w of words) {
        if ((line1 + " " + w).trim().length <= maxChars) {
          line1 = (line1 + " " + w).trim();
        } else {
          line2 = (line2 + " " + w).trim();
        }
      }
    }

    const isGoal = node.type === "goal";

    return (
      <g>
        <rect
          x={x}
          y={y}
          width={8}
          height={height}
          fill={node.color}
          stroke="currentColor"
          strokeWidth={isGoal ? 2 : 1}
          strokeOpacity={isGoal ? 0.5 : 0.3}
          rx={3}
        />
        <text
          x={isGoal ? x - 10 : x + 10} // 🔹 move left if goal
          y={y + height / 2}
          textAnchor={isGoal ? "end" : "start"} // 🔹 align text correctly
          dominantBaseline="middle"
          fontSize={13}
          className="sankey-text"
          style={{
            fill: "currentColor",
            filter: "drop-shadow(0px 1px 1px rgba(0,0,0,0.3))",
          }}
        >
          <tspan dy="-0.4em">{line1}</tspan>
          {line2 && (
            <tspan x={isGoal ? x - 10 : x + 10} dy="1.2em">
              {line2}
            </tspan>
          )}
        </text>
      </g>
    );
  };

  type CustomLinkProps = {
    sourceX: number;
    targetX: number;
    sourceY: number;
    targetY: number;
    linkWidth: number;
    index: number;
  };

  const CustomLink = (props: CustomLinkProps) => {
    const { sourceX, targetX, sourceY, targetY, linkWidth, index } = props;
    const link = data.links[index];
    return (
      <path
        d={`M${sourceX},${sourceY}
           C ${(sourceX + targetX) / 2},${sourceY}
             ${(sourceX + targetX) / 2},${targetY}
             ${targetX},${targetY}`}
        stroke={link.color || "#999"}
        strokeWidth={Math.max(1, linkWidth)}
        fill="none"
        opacity={0.4}
      />
    );
  };

  return (
    <Card className="mb-4 shadow-sm">
      <Card.Header as="h6">Cash Flow Diagram</Card.Header>
      <Card.Body
        style={{
          height: isMobile ? 400 : "65vh",
          minHeight: 350,
          padding: isMobile ? "4px" : "0", // 🔹 tighter padding on mobile
        }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <Sankey
            width={isMobile ? 340 : 920}
            height={isMobile ? 320 : 500}
            data={data}
            nodePadding={isMobile ? 6 : 24} // 🔹 less padding on mobile
            nodeWidth={isMobile ? 6 : 8}
            node={CustomNode}
            link={CustomLink}
            iterations={64}
            margin={{
              left: isMobile ? 5 : 20,
              right: isMobile ? 20 : 20, // 🔹 reduced right padding on mobile
              top: 10,
              bottom: 10,
            }}
          >
            <Tooltip
              wrapperStyle={{ fontSize: isMobile ? 11 : 14 }}
              formatter={(value: number) => toLocalCurrency(value)}
            />
          </Sankey>
        </ResponsiveContainer>
      </Card.Body>
    </Card>
  );
}
