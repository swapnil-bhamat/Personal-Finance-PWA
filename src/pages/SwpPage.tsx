import { Box } from "@mui/material";
import React, { useState } from "react";
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

interface YearData {
    age: number;
    bucket1Start: number;
    bucket2Start: number;
    b2ToB1Transfer: number;
    yearsTransferred: number;
    withdrawal: number;
    sipAdded: number;
    bucket1End: number;
    bucket2End: number;
    totalAssets: number;
    b2Return: number;
    b212Met: boolean;
}

// Historical BSE 500 returns (approx past 30 years)
const historicalReturns = [
    15.2, 16.8, 18.5, 14.3, 20.1, 12.7, 9.8, 7.3, 25.4, 18.9,
    16.2, 19.5, 15.8, -37.4, 81.2, 15.6, -24.6, 26.7, 7.1, 32.5,
    -4.1, 1.5, 28.2, 5.0, 14.4, 15.1, 22.3, 6.7, 12.9, 11.5
];

const SwpPage: React.FC = () => {
    // Inputs
    const [bucket1Initial, setBucket1Initial] = useState<number>(3000000);
    const [bucket2Initial, setBucket2Initial] = useState<number>(10300000);
    const [monthlyWithdrawal, setMonthlyWithdrawal] = useState<number>(50000);
    const [bucket1Xirr, setBucket1Xirr] = useState<number>(6.5);
    const [inflation, setInflation] = useState<number>(6.5);
    const [sipMonthly, setSipMonthly] = useState<number>(50000);
    const [maxSIPYears, setMaxSIPYears] = useState<number>(0);
    const [currentAge, setCurrentAge] = useState<number>(35);
    const [deathAge, setDeathAge] = useState<number>(100);

    const [projection, setProjection] = useState<YearData[]>([]);
    const [swpSuccess, setSwpSuccess] = useState<boolean>(true);

    const generateProjection = () => {
        const years = deathAge - currentAge;
        let bucket1 = bucket1Initial;
        let bucket2 = bucket2Initial;
        const annualWithdrawalBase = monthlyWithdrawal * 12;
        const data: YearData[] = [];
        let success = true;

        for (let year = 0; year <= years; year++) {
            const age = currentAge + year;
            const annualWithdrawal =
            annualWithdrawalBase * Math.pow(1 + inflation / 100, year);

            const bucket1Start = bucket1;
            const bucket2Start = bucket2;

            // Determine withdrawal split
            const b1Withdraw = Math.min(bucket1, annualWithdrawal);
            const b2Withdraw = Math.max(annualWithdrawal - bucket1, 0);

            // SIP logic: add SIP if Bucket2 alone cannot cover its withdrawal portion and within max SIP years
            let sipAdded = 0;
            if (bucket2 < b2Withdraw && year < maxSIPYears) {
            sipAdded = sipMonthly * 12;
            bucket2 += sipAdded;
            }

            // SWP success check BEFORE returns and transfers
            if (bucket1 + bucket2 < annualWithdrawal) {
            success = false;
            }

            // Apply withdrawals
            bucket1 -= b1Withdraw;
            bucket2 -= b2Withdraw;

            // Apply returns on Bucket2 after withdrawals
            const b2ReturnAmount = bucket2 * (historicalReturns[year % historicalReturns.length] / 100);
            bucket2 += b2ReturnAmount;

            // Opportunistic top-up from B2 → B1 if 12%+ return and SIP not used
            let b2ToB1Transfer = 0;
            let yearsTransferred = 0;
            let b212Met = false;

            // Use bucket2 BEFORE returns to calculate 12% return check accurately
            const preReturnBucket2 = bucket2 - b2ReturnAmount;
            if (sipAdded === 0 && b2ReturnAmount / preReturnBucket2 >= 0.12) {
            b2ToB1Transfer = annualWithdrawal;
            yearsTransferred = 1;
            b212Met = true;
            bucket1 += b2ToB1Transfer;
            bucket2 -= b2ToB1Transfer;
            }

            data.push({
            age,
            bucket1Start,
            bucket2Start,
            b2ToB1Transfer,
            yearsTransferred,
            withdrawal: annualWithdrawal,
            sipAdded,
            bucket1End: bucket1,
            bucket2End: bucket2,
            totalAssets: bucket1 + bucket2,
            b2Return: b2ReturnAmount,
            b212Met,
            });
        }

        setProjection(data);
        setSwpSuccess(success);
    };

    return (
        <Box sx={{ overflow: "auto" }}>
            <h1>2-Bucket SWP Projection</h1>

            <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                <div>
                <label>Bucket 1 Initial (₹): </label>
                <input
                    type="number"
                    value={bucket1Initial}
                    onChange={(e) => setBucket1Initial(Number(e.target.value))}
                />
                </div>
                <div>
                <label>Bucket 2 Initial (₹): </label>
                <input
                    type="number"
                    value={bucket2Initial}
                    onChange={(e) => setBucket2Initial(Number(e.target.value))}
                />
                </div>
                <div>
                <label>Monthly Withdrawal (₹): </label>
                <input
                    type="number"
                    value={monthlyWithdrawal}
                    onChange={(e) => setMonthlyWithdrawal(Number(e.target.value))}
                />
                </div>
                <div>
                <label>Bucket1 XIRR (%): </label>
                <input
                    type="number"
                    value={bucket1Xirr}
                    onChange={(e) => setBucket1Xirr(Number(e.target.value))}
                />
                </div>
                <div>
                <label>Inflation (%): </label>
                <input
                    type="number"
                    value={inflation}
                    onChange={(e) => setInflation(Number(e.target.value))}
                />
                </div>
                <div>
                <label>SIP Monthly (₹): </label>
                <input
                    type="number"
                    value={sipMonthly}
                    onChange={(e) => setSipMonthly(Number(e.target.value))}
                />
                </div>
                <div>
                <label>Max SIP Years: </label>
                <input
                    type="number"
                    value={maxSIPYears}
                    onChange={(e) => setMaxSIPYears(Number(e.target.value))}
                />
                </div>
                <div>
                <label>Current Age: </label>
                <input
                    type="number"
                    value={currentAge}
                    onChange={(e) => setCurrentAge(Number(e.target.value))}
                />
                </div>
                <div>
                <label>Death Age: </label>
                <input
                    type="number"
                    value={deathAge}
                    onChange={(e) => setDeathAge(Number(e.target.value))}
                />
                </div>
            </div>

            <button style={{ marginTop: 20 }} onClick={generateProjection}>
                Generate Projection
            </button>

            {projection.length > 0 && (
                <>
                <div style={{ marginTop: 20 }}>
                    {swpSuccess ? (
                    <span style={{ color: "green", fontWeight: "bold" }}>
                        ✅ SWP Likely Successful
                    </span>
                    ) : (
                    <span style={{ color: "red", fontWeight: "bold" }}>
                        ❌ SWP May Fail
                    </span>
                    )}
                </div>

                <h2>Projection Table</h2>
                <table border={1} cellPadding={5}>
                    <thead>
                    <tr>
                        <th>Age</th>
                        <th>Bucket 1 Start</th>
                        <th>Bucket 2 Start</th>
                        <th>B2 → B1 Transfer</th>
                        <th>Years Transferred</th>
                        <th>Withdrawal</th>
                        <th>SIP Added</th>
                        <th>Bucket 1 End</th>
                        <th>Bucket 2 End</th>
                        <th>Total Assets</th>
                        <th>B2 Return</th>
                        <th>B2 12% Met</th>
                    </tr>
                    </thead>
                    <tbody>
                    {projection.map((row, idx) => (
                        <tr key={idx}>
                        <td>{row.age}</td>
                        <td>{Math.round(row.bucket1Start)}</td>
                        <td>{Math.round(row.bucket2Start)}</td>
                        <td>{Math.round(row.b2ToB1Transfer)}</td>
                        <td>{row.yearsTransferred}</td>
                        <td>{Math.round(row.withdrawal)}</td>
                        <td>{Math.round(row.sipAdded)}</td>
                        <td>{Math.round(row.bucket1End)}</td>
                        <td>{Math.round(row.bucket2End)}</td>
                        <td>{Math.round(row.totalAssets)}</td>
                        <td>{Math.round(row.b2Return)}</td>
                        <td>{row.b212Met ? "Yes" : "No"}</td>
                        </tr>
                    ))}
                    </tbody>
                </table>

                <h2>Projection Graph</h2>
                <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={projection}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="age" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line
                        type="monotone"
                        dataKey="bucket1End"
                        name="Bucket1 Balance"
                        stroke="#8884d8"
                    />
                    <Line
                        type="monotone"
                        dataKey="bucket2End"
                        name="Bucket2 Balance"
                        stroke="#82ca9d"
                    />
                    <Line
                        type="monotone"
                        dataKey="withdrawal"
                        name="Annual Withdrawal"
                        stroke="#ff7300"
                    />
                    </LineChart>
                </ResponsiveContainer>
                </>
            )}
        </Box>
    );
};

export default SwpPage;
