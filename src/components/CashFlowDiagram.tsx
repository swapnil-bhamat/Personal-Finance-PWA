import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../services/db";

import { Card } from "react-bootstrap";
import { Sankey, Tooltip, ResponsiveContainer } from "recharts";
import { toLocalCurrency } from "../utils/numberUtils";

export default function CashFlowDiagram() {
  const data = useLiveQuery(async () => {
    const incomes = await db.income.toArray();
    const cashFlows = await db.cashFlow.toArray();
    const purposes = await db.assetPurposes.toArray();
    const goals = await db.goals.toArray();
    const accounts = await db.accounts.toArray();
    const holders = await db.holders.toArray();

    const nodesMap = new Map<string, { name: string; color: string; type: string }>();
    const linksMap = new Map<string, { source: string; target: string; value: number; color?: string }>();

    cashFlows.forEach((cf) => {
      // Determine Source Node
      let sourceKey = "unassigned-source";
      let sourceName = "Unassigned Source";
      let sourceColor = "#999999";
      let sourceType = "source";

      if (cf.fromAccountId || cf.income_id) {
        const acc = cf.fromAccountId ? accounts.find((a) => a.id === cf.fromAccountId) : null;
        const inc = cf.income_id ? incomes.find((i) => i.id === cf.income_id) : null;

        const holderId = acc?.holders_id || inc?.holders_id;
        const holder = holders.find((h) => h.id === holderId);

        const incAcc = inc ? accounts.find((a) => a.id === inc.accounts_id) : null;
        const bankName = acc?.bank || incAcc?.bank || "Unknown Bank";

        const incItemStr = inc && inc.item ? ` - ${inc.item}` : "";

        sourceKey = `src-${acc?.id || "none"}-${inc?.id || "none"}`;
        sourceName = `${holder?.name || "Unknown"} - ${bankName}${incItemStr}`;
        sourceColor = inc ? "#4CAF50" : "#4285F4"; // Green if it has income, Blue otherwise
        sourceType = inc ? "income" : "bank";
      }

      // Determine Target Node
      const purpose = purposes.find((p) => p.id === cf.assetPurpose_id);
      let targetColor = "#FFB347"; // Default Orange
      if (purpose) {
        const pType = purpose.type.toLowerCase();
        if (pType === "need") targetColor = "#FF6B6B"; // Red
        else if (pType === "want") targetColor = "#FFD166"; // Yellow
        else if (pType === "savings") targetColor = "#06D6A0"; // Green
      }

      let targetKey = `item-${cf.item}`;
      let targetName = `Item: ${cf.item || "Unknown"}`;
      let targetType = "item";

      if (cf.goal_id) {
        const goal = goals.find((g) => g.id === cf.goal_id);
        targetKey = `goal-${cf.goal_id}`;
        targetName = goal ? `Goal: ${goal.name}` : "Unknown Goal";
        targetColor = targetColor !== "#FFB347" ? targetColor : "#1ABC9C"; // Teal fallback for Goals
        targetType = "goal";
      } else if (cf.fromAccountId && cf.accounts_id && cf.fromAccountId !== cf.accounts_id) {
        // Transfer to another bank
        const acc = accounts.find((a) => a.id === cf.accounts_id);
        const holder = holders.find((h) => h.id === acc?.holders_id);
        targetKey = `account-${cf.accounts_id}`;
        targetName = acc ? `${holder?.name} - ${acc.bank}` : "Unknown Bank";
        targetColor = targetColor !== "#FFB347" ? targetColor : "#4285F4"; // Blue fallback for Bank Transfers
        targetType = "bank";
      }

      // Add Source Node
      if (!nodesMap.has(sourceKey)) {
        nodesMap.set(sourceKey, { name: sourceName, color: sourceColor, type: sourceType });
      }

      // Add Target Node
      if (!nodesMap.has(targetKey)) {
        nodesMap.set(targetKey, { name: targetName, color: targetColor, type: targetType });
      }

      // Add Link
      const linkKey = `${sourceKey}->${targetKey}`;
      if (!linksMap.has(linkKey)) {
        linksMap.set(linkKey, { source: sourceKey, target: targetKey, value: 0, color: targetColor });
      }
      linksMap.get(linkKey)!.value += Number(cf.monthly || 0);
    });

    const nodeValues = new Map<string, { in: number; out: number }>();
    linksMap.forEach((link) => {
      const s = nodeValues.get(link.source) || { in: 0, out: 0 };
      s.out += link.value;
      nodeValues.set(link.source, s);

      const t = nodeValues.get(link.target) || { in: 0, out: 0 };
      t.in += link.value;
      nodeValues.set(link.target, t);
    });

    const nodesList = Array.from(nodesMap.entries()).map(([key, data]) => {
      const vals = nodeValues.get(key) || { in: 0, out: 0 };
      const totalAmt = Math.max(vals.in, vals.out);
      return {
        key,
        name: `${data.name} (${toLocalCurrency(totalAmt)})`,
        color: data.color,
        type: data.type,
      };
    });

    const sankeyNodes = nodesList.map((n) => ({
      name: n.name,
      color: n.color,
      type: n.type,
    }));

    const links = Array.from(linksMap.values()).map((link) => ({
      source: nodesList.findIndex((n) => n.key === link.source),
      target: nodesList.findIndex((n) => n.key === link.target),
      value: link.value,
      color: link.color,
    }));

    // If there's no data or nodes, return empty to prevent Recharts error
    if (sankeyNodes.length === 0 || links.length === 0) {
      return { nodes: [], links: [] };
    }

    return { nodes: sankeyNodes, links };
  }, []);

  if (!data) return null;

  const isMobile = window.innerWidth < 600;

  const CustomNode = (props: any) => {
    const { x, y, height, index, payload } = props;
    const node = data.nodes[index];

    // If node has no outbound links, it is on the far right
    const hasOutbound = payload?.sourceLinks && payload.sourceLinks.length > 0;
    const isRightSide = !hasOutbound;

    const label = node.name;
    const maxChars = 35;
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

    return (
      <g>
        <rect
          x={x}
          y={y}
          width={8}
          height={height}
          fill={node.color}
          stroke="currentColor"
          strokeWidth={1}
          strokeOpacity={0.3}
          rx={3}
        />
        <text
          x={isRightSide ? x - 12 : x + 12}
          y={y + height / 2}
          textAnchor={isRightSide ? "end" : "start"}
          dominantBaseline="middle"
          fontSize={12}
          className="sankey-text"
          style={{
            fill: "currentColor",
            filter: "drop-shadow(0px 1px 1px rgba(0,0,0,0.3))",
            fontWeight: 500,
          }}
        >
          <tspan dy="-0.4em">{line1}</tspan>
          {line2 && (
            <tspan x={isRightSide ? x - 12 : x + 12} dy="1.2em">
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

  const nodeCount = data.nodes.length;
  // Dynamically calculate height to give enough space for small nodes and prevent overlap
  const chartHeight = Math.max(isMobile ? 500 : 500, nodeCount * 45);

  return (
    <Card className="mb-4 shadow-sm">
      <Card.Header as="h6">Cash Flow Diagram</Card.Header>
      <Card.Body
        style={{
          padding: "10px",
          overflowX: "auto",
          overflowY: "hidden", // Prevent vertical scroll flicker
        }}
      >
        <div
          style={{
            minWidth: "1000px",
            height: chartHeight,
          }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <Sankey
              data={data}
              nodePadding={isMobile ? 20 : 30}
              nodeWidth={8}
              node={CustomNode}
              link={CustomLink}
              iterations={64}
              margin={{
                left: 260, // Substantially increased margin to prevent long label cutoff
                right: 260,
                top: 20,
                bottom: 20,
              }}
            >
              <Tooltip
                wrapperStyle={{ fontSize: 13 }}
                formatter={(value: number | undefined) => toLocalCurrency(value)}
              />
            </Sankey>
          </ResponsiveContainer>
        </div>
      </Card.Body>
    </Card>
  );
}
