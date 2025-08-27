export const toLocalCurrency = (num: number | undefined | string): string => {
  return num
    ? `₹${num?.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`
    : "₹0";
};
