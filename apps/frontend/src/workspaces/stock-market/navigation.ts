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

export function buildStockMarketReportRoute(input: {
  reportDate?: string | null;
  reportFocus?: string | null;
}) {
  return {
    path: "/workspace/stock-market/reports",
    query: {
      date: input.reportDate || undefined,
      focus: input.reportFocus || undefined,
    },
  };
}
