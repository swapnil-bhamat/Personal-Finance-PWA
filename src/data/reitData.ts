export interface Dividend {
  amount: number;
  date: string;
}

export interface REIT {
  reit_name: string;
  start_price: number;
  end_price: number;
  total_dividends: number;
  total_returns: number;
  dividends: Dividend[];
  // Calculated/Added fields
  id: string;
  currentPrice: number;
  calculatedYield: number; // Annual yield percentage
  wale: string; // Weighted Average Lease Expiry (editable)
}

const rawData = [
  {
    dividends: [
      { amount: 5.8, date: "2025-08-05" },
      { amount: 5.68, date: "2025-05-03" },
      { amount: 5.9, date: "2025-02-01" },
      { amount: 5.83, date: "2024-10-29" },
      { amount: 5.6, date: "2024-08-02" },
      { amount: 5.22, date: "2024-05-06" },
      { amount: 5.2, date: "2024-02-12" },
      { amount: 5.53, date: "2023-11-03" },
      { amount: 5.38, date: "2023-08-03" },
      { amount: 5.61, date: "2023-05-06" },
      { amount: 5.31, date: "2023-02-03" },
      { amount: 5.46, date: "2022-11-01" },
      { amount: 5.33, date: "2022-07-29" },
      { amount: 5.26, date: "2022-05-09" },
      { amount: 5.2, date: "2022-02-07" },
      { amount: 5.66, date: "2021-11-10" },
      { amount: 5.64, date: "2021-08-05" },
      { amount: 5.6, date: "2021-05-07" },
      { amount: 4.55, date: "2021-02-22" },
      { amount: 5.5, date: "2020-11-10" },
      { amount: 5.83, date: "2020-08-14" },
      { amount: 6.89, date: "2020-05-28" },
      { amount: 6.1, date: "2020-02-24" },
      { amount: 6, date: "2019-11-19" },
      { amount: 5.4, date: "2019-08-21" },
    ],
    end_price: 427.17,
    reit_name: "Embassy Office Parks REIT",
    start_price: 358.45,
    total_dividends: 139.48,
    total_returns: 7.09,
  },
  {
    dividends: [
      { amount: 5.79, date: "2025-08-07" },
      { amount: 6.44, date: "2025-05-06" },
      { amount: 5.32, date: "2025-01-29" },
      { amount: 5.15, date: "2024-10-30" },
      { amount: 5.04, date: "2024-08-02" },
      { amount: 4.77, date: "2024-05-09" },
      { amount: 4.8, date: "2024-02-06" },
      { amount: 4.79, date: "2023-11-06" },
      { amount: 4.8, date: "2023-07-31" },
      { amount: 4.81, date: "2023-05-10" },
      { amount: 4.8, date: "2023-02-06" },
      { amount: 4.75, date: "2022-11-21" },
      { amount: 4.74, date: "2022-08-16" },
      { amount: 4.61, date: "2022-05-18" },
      { amount: 4.64, date: "2022-02-16" },
      { amount: 4.6, date: "2021-11-18" },
      { amount: 4.6, date: "2021-08-19" },
      { amount: 4.81, date: "2021-05-21" },
      { amount: 4.78, date: "2021-02-18" },
    ],
    end_price: 458.99,
    reit_name: "Mindspace Business Parks REIT",
    start_price: 334.18,
    total_dividends: 94.04,
    total_returns: 9.91,
  },
  {
    dividends: [
      { amount: 2.23, date: "2025-08-04" },
      { amount: 2, date: "2025-05-16" },
      { amount: 2.2, date: "2025-02-07" },
      { amount: 2.01, date: "2024-11-21" },
      { amount: 2.15, date: "2024-08-07" },
      { amount: 2.09, date: "2024-05-17" },
      { amount: 2, date: "2024-02-14" },
      { amount: 2.98, date: "2023-11-17" },
    ],
    end_price: 139.53,
    reit_name: "Nexus Select Trust",
    start_price: 133.13,
    total_dividends: 17.66,
    total_returns: 6.72,
  },
  {
    dividends: [
      { amount: 5.25, date: "2025-08-06" },
      { amount: 5.25, date: "2025-05-08" },
      { amount: 4.9, date: "2025-02-04" },
      { amount: 4.6, date: "2024-11-09" },
      { amount: 4.5, date: "2024-08-15" },
      { amount: 4.75, date: "2024-05-24" },
      { amount: 4.75, date: "2024-02-20" },
      { amount: 4.4, date: "2023-11-14" },
      { amount: 3.85, date: "2023-08-23" },
      { amount: 5, date: "2023-05-26" },
      { amount: 5, date: "2023-02-15" },
      { amount: 5.1, date: "2022-11-16" },
      { amount: 5.1, date: "2022-08-12" },
      { amount: 5.1, date: "2022-05-26" },
      { amount: 5, date: "2022-02-21" },
      { amount: 6, date: "2021-11-17" },
      { amount: 6, date: "2021-08-18" },
    ],
    end_price: 308.42,
    reit_name: "Brookfield India REIT",
    start_price: 268.41,
    total_dividends: 84.55,
    total_returns: 8.26,
  },
];

export const getREITData = (): REIT[] => {
  return rawData.map((item, index) => {
    // Calculate Annual Yield based on last 4 dividends
    // Assuming dividends are sorted by date descending (which they seem to be)
    const last4Dividends = item.dividends.slice(0, 4);
    const annualDividend = last4Dividends.reduce((sum, d) => sum + d.amount, 0);
    const calculatedYield = (annualDividend / item.end_price) * 100;

    return {
      ...item,
      id: `reit-${index}`,
      currentPrice: item.end_price,
      calculatedYield,
      wale: "5-7 Years", // Default placeholder
    };
  });
};
