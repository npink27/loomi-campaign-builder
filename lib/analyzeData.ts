import type { MockConnectorData } from "@/lib/mockData";

export type SignalSummary = {
  audienceSize: number;
  conversionRate: number;
  aov: number;
  cartAbandoners: number;
  maturityLevel: "Early" | "Developing" | "Advanced";
};

export function analyzeSignals(data: MockConnectorData): SignalSummary {
  const customerCount = data.customers.length;
  const totalViews = data.products.reduce((sum, item) => sum + item.views, 0);
  const totalPurchases = data.products.reduce((sum, item) => sum + item.purchases, 0);
  const totalRevenue = data.products.reduce(
    (sum, item) => sum + item.price * item.purchases,
    0,
  );
  const abandoners = data.customers.filter(
    (customer) => customer.cartAdds30d > customer.purchases30d,
  ).length;

  const conversionRate = totalViews > 0 ? (totalPurchases / totalViews) * 100 : 0;
  const aov = totalPurchases > 0 ? totalRevenue / totalPurchases : 0;

  let maturityLevel: SignalSummary["maturityLevel"] = "Early";
  if (conversionRate >= 4.5 && abandoners <= Math.max(1, Math.round(customerCount * 0.2))) {
    maturityLevel = "Advanced";
  } else if (conversionRate >= 3 || abandoners <= Math.max(1, Math.round(customerCount * 0.4))) {
    maturityLevel = "Developing";
  }

  return {
    audienceSize: customerCount,
    conversionRate: Number(conversionRate.toFixed(2)),
    aov: Number(aov.toFixed(2)),
    cartAbandoners: abandoners,
    maturityLevel,
  };
}
