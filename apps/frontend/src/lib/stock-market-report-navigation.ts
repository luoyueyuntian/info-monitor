export function buildStockReportReturnQuery(input: {
  reportDate?: string | null;
  reportFocus?: string | null;
}) {
  return {
    returnTo: "stock-report",
    reportDate: input.reportDate || undefined,
    reportFocus: input.reportFocus || undefined,
  };
}
