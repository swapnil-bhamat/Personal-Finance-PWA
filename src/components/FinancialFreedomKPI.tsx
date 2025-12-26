import React, { useMemo, useState } from "react";
import { Card, Row, Col, Badge } from "react-bootstrap";
import { toLocalCurrency } from "../utils/numberUtils";
import { 
  FaFlagCheckered, 
  FaSeedling, 
  FaWalking, 
  FaRunning, 
  FaPlane, 
  FaRocket, 
  FaGem, 
  FaCheck,
  FaLock,
} from "react-icons/fa";

// Detailed levels with criteria for tooltips
const levels = [
  { 
    id: 1, 
    label: "Clarity", 
    icon: FaFlagCheckered, 
    desc: "Knowing where you stand",
    criteria: "Track Income & Expenses",
    // Returns { current, target, unit, passed }
    getMath: (d: any) => ({
        current: d.income > 0 && d.expenses > 0 ? "Tracking" : "Not Tracking",
        target: "Tracking",
        label: "Income & Expenses",
        passed: d.income > 0 && d.expenses > 0
    })
  },
  { 
    id: 2, 
    label: "Solvency", 
    icon: FaSeedling, 
    desc: "Income > Expenses",
    criteria: "Monthly Income > Expenses",
    getMath: (d: any) => ({
        current: toLocalCurrency(d.income),
        target: toLocalCurrency(d.expenses),
        label: "Income vs Expenses",
        passed: d.income > d.expenses
    })
  },
  { 
    id: 3, 
    label: "Breathing Room", 
    icon: FaWalking, 
    desc: "Positive Net Worth",
    criteria: "Assets > Liabilities",
    getMath: (d: any) => ({
        current: toLocalCurrency(d.assets),
        target: toLocalCurrency(d.liabilities),
        label: "Assets vs Liabilities",
        passed: d.assets > d.liabilities
    })
  },
  { 
    id: 4, 
    label: "Stability", 
    icon: FaRunning, 
    desc: "3 Months Emergency Fund",
    criteria: "Emergency Fund > 3x Expenses",
    getMath: (d: any) => ({
        current: toLocalCurrency(d.emergencyFund),
        target: `${toLocalCurrency(d.expenses)} * 3 = ${toLocalCurrency(d.expenses * 3)}`,
        label: "Emergency Fund vs 3x Needs",
        passed: d.emergencyFund >= d.expenses * 3
    })
  },
  { 
    id: 5, 
    label: "Flexibility", 
    icon: FaPlane, 
    desc: "6 Months Emergency Fund",
    criteria: "Emergency Fund > 6x Expenses",
    getMath: (d: any) => ({
        current: toLocalCurrency(d.emergencyFund),
        target: `${toLocalCurrency(d.expenses)} * 6 = ${toLocalCurrency(d.expenses * 6)}`,
        label: "Emergency Fund vs 6x Needs",
        passed: d.emergencyFund >= d.expenses * 6
    })
  },
  { 
    id: 6, 
    label: "Financial Independence", 
    icon: FaRocket, 
    desc: "Assets cover Expenses (3.5% Rule)",
    criteria: "Investments > 343x Monthly Expenses", // 12 / 0.035 ≈ 342.8
    getMath: (d: any) => ({
        current: toLocalCurrency(d.assets - d.liabilities),
        target: `${toLocalCurrency(d.expenses)} * 343 = ${toLocalCurrency(d.expenses * 343)}`,
        label: "Assets vs 3.5% SWR Target",
        passed: (d.assets - d.liabilities) >= d.expenses * 343
    })
  },
  { 
    id: 7, 
    label: "Abundant Wealth", 
    icon: FaGem, 
    desc: "Unlimited options",
    criteria: "Investments > 600x Monthly Expenses",
    getMath: (d: any) => ({
        current: toLocalCurrency(d.assets - d.liabilities),
        target: `${toLocalCurrency(d.expenses)} * 600 = ${toLocalCurrency(d.expenses * 600)}`,
        label: "Assets vs 50x Annual Needs",
        passed: (d.assets - d.liabilities) >= d.expenses * 600
    })
  },
];

function determineLevel(data: any) {
    if (!levels[0].getMath(data).passed) return 1;
    
    for (let i = 1; i < levels.length; i++) {
        const math = levels[i].getMath(data);
        if (!math.passed) {
            return levels[i].id;
        }
    }
    return 7;
}

export default function FinancialFreedomKPI({
  income,
  assets,
  liabilities,
  emergencyFund,
  expenses,
}: {
  income: number;
  assets: number;
  liabilities: number;
  emergencyFund: number;
  expenses: number;
}) {
  const data = { income, assets, liabilities, emergencyFund, expenses };
  
  const currentLevelId = useMemo(() => determineLevel(data), [income, assets, liabilities, emergencyFund, expenses]);
  
  // State for interaction
  const [selectedLevelId, setSelectedLevelId] = useState<number | null>(null);

  // If nothing selected, show current level logic
  const activeDisplayId = selectedLevelId || currentLevelId;
  const activeLevelInfo = levels.find(l => l.id === activeDisplayId) || levels[0];
  const activeMath = activeLevelInfo.getMath(data);
  const isSelectedCompleted = activeDisplayId < currentLevelId;
  const isSelectedCurrent = activeDisplayId === currentLevelId;

  return (
    <Card className="mb-4 shadow border-0 overflow-hidden">
      <div 
        className="position-absolute w-100 h-100" 
        style={{ 
          background: `linear-gradient(135deg, ${getGradient(currentLevelId)})`, 
          opacity: 0.1, 
          pointerEvents: "none" 
        }} 
      />
      
      <Card.Header as="h5" className="bg-transparent border-bottom-0 pb-0 pt-4 px-4">
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
            <span>Financial Freedom Tracker</span>
            <span className="badge bg-primary rounded-pill">Current Level: {currentLevelId}</span>
        </div>
      </Card.Header>
      
      <Card.Body className="px-3 px-md-4 pb-4 pt-2">
        {/* Responsive Stepper Container */}
        <div className="position-relative mb-5 mx-0 mx-md-2" style={{ overflowX: 'auto', overflowY: 'hidden', paddingBottom: '24px' }}>
            <div style={{ minWidth: '600px' }}> {/* Force width for horizontal scroll on mobile */}
                {/* Steps with Flex Connectors */}
                <div className="d-flex align-items-center justify-content-between position-relative" style={{ zIndex: 1 }}>
                    {levels.map((level, index) => {
                        const isCompleted = level.id < currentLevelId;
                        const isCurrent = level.id === currentLevelId;
                        const isFuture = level.id > currentLevelId;
                        const isSelected = level.id === activeDisplayId;
                        const isLast = index === levels.length - 1;
                        
                        // Determine connector color (to the right of this node)
                        // If this node is completed, and the NEXT node is at least current (or completed), line is green/primary.
                        // Actually, simpler: line is active if the *next* node is reached (<= current).
                        const nextNodeReached = (index + 1 < levels.length) && (levels[index + 1].id <= currentLevelId);

                        return (
                            <React.Fragment key={level.id}>
                                <div 
                                    className="text-center position-relative" 
                                    style={{ cursor: 'pointer', zIndex: 2 }} // Ensure nodes are above lines if overlap (though flex shouldn't overlap)
                                    onClick={() => setSelectedLevelId(level.id)}
                                >
                                    <div 
                                        className={`
                                            rounded-circle d-flex align-items-center justify-content-center shadow-sm transition-all
                                            ${isCurrent ? 'bg-primary text-white ring-4' : ''}
                                            ${isCompleted ? 'bg-success text-white' : ''}
                                            ${isFuture ? 'bg-body-secondary text-muted border' : ''}
                                            ${isSelected && !isCurrent ? 'ring-2-primary' : ''}
                                        `}
                                        style={{ 
                                            width: '40px', 
                                            height: '40px',
                                            transition: 'all 0.3s ease',
                                            border: isSelected ? '2px solid var(--bs-primary)' : isFuture ? '2px solid var(--bs-border-color)' : 'none',
                                        }}
                                    >
                                        {isCompleted ? <FaCheck size={14} /> : 
                                         isCurrent ? <level.icon size={20} /> : 
                                         <FaLock size={12} />}
                                    </div>
                                    
                                    <div className={`small fw-bold ${isCurrent || isSelected ? 'text-primary' : 'text-muted'} text-nowrap position-absolute`} 
                                         style={{ 
                                             transform: 'translateX(-50%)', 
                                             left: '50%',
                                             top: '45px',
                                             width: '100px',
                                             textAlign: 'center',
                                             opacity: (isCurrent || isSelected) ? 1 : 0.6,
                                             pointerEvents: 'none'
                                         }}>
                                        {(isCurrent || isSelected) ? level.label : ''}
                                    </div>
                                </div>
                                
                                {!isLast && (
                                    <div 
                                        className={`flex-grow-1 mx-2 rounded ${nextNodeReached ? 'bg-primary' : 'bg-secondary-subtle'}`} 
                                        style={{ height: '4px', transition: 'background-color 0.5s ease' }} 
                                    />
                                )}
                            </React.Fragment>
                        );
                    })}
                </div>
            </div>
        </div>

        {/* Selected Level Detail Panel */}
        <div className="bg-body-tertiary rounded-3 p-4 mt-4 transition-all animation-fade-in">
             <Row className="align-items-center">
                 <Col xs={12} md={8}>
                     <h4 className="fw-bold mb-1 d-flex align-items-center gap-2">
                        {activeLevelInfo.icon && <activeLevelInfo.icon className="text-primary" />}
                        {activeLevelInfo.label}
                        {isSelectedCompleted ? 
                            <Badge bg="success" className="ms-2" style={{fontSize: '0.6em'}}>Completed</Badge> : 
                            (isSelectedCurrent ? 
                                <Badge bg="primary" className="ms-2" style={{fontSize: '0.6em'}}>In Progress</Badge> : 
                                <Badge bg="secondary" className="ms-2" style={{fontSize: '0.6em'}}>Locked</Badge>
                            )
                        }
                     </h4>
                     <p className="text-muted mb-3 mb-md-0">{activeLevelInfo.desc}</p>
                 </Col>
                 <Col xs={12} md={4}>
                     <div className="border-start-md px-md-3">
                         <div className="text-uppercase text-muted fw-bold small mb-2">{activeMath.label}</div>
                         <div className="d-flex flex-column align-items-end mb-2">
                             <div className="fw-bold fs-4 text-body-emphasis">{activeMath.current}</div>
                             <div className="small text-muted text-end">Target: {activeMath.target}</div>
                         </div>
                         {/* Simple visual bar for this specific metric */}
                         {typeof activeMath.current === 'string' && activeMath.current.includes("Tracking") ? null : (
                             <div className="progress" style={{height: '6px'}}>
                                 <div 
                                    className={`progress-bar ${activeMath.passed ? 'bg-success' : 'bg-primary'}`} 
                                    role="progressbar" 
                                    style={{width: activeMath.passed ? '100%' : '50%'}} // Approximate visual
                                 ></div>
                             </div>
                         )}
                         <div className="small mt-1 text-end">
                            {activeMath.passed ? (
                                <span className="text-success fw-bold"><FaCheck className="me-1"/>Criteria Met</span>
                            ) : (
                                <span className="text-warning-emphasis fw-bold">Target not met</span>
                            )}
                         </div>
                     </div>
                 </Col>
             </Row>
        </div>
      </Card.Body>
    </Card>
  );
}

function getGradient(level: number) {
    if (level <= 2) return "rgba(13, 110, 253, 0.2), rgba(255, 255, 255, 0)";
    if (level <= 4) return "rgba(25, 135, 84, 0.2), rgba(255, 255, 255, 0)";
    if (level <= 6) return "rgba(255, 193, 7, 0.2), rgba(255, 255, 255, 0)";
    return "rgba(220, 53, 69, 0.1), rgba(255, 255, 255, 0)"; 
}
