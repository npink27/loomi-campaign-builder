export type CampaignGoal = "Conversion" | "LTV" | "Engagement";

export type Product = {
  id: string;
  name: string;
  category: string;
  price: number;
  margin: number;
  inventory: number;
  views: number;
  cartAdds: number;
  purchases: number;
};

export type Customer = {
  id: string;
  segment: "new" | "active" | "vip" | "at_risk";
  sessions30d: number;
  productViews30d: number;
  cartAdds30d: number;
  purchases30d: number;
  totalRevenue: number;
  lastSeenDaysAgo: number;
};

export type MockConnectorData = {
  source: string;
  syncedAt: string;
  customers: Customer[];
  products: Product[];
};

const products: Product[] = [
  {
    id: "sku_101",
    name: "Loomi Lightweight Hoodie",
    category: "Apparel",
    price: 78,
    margin: 0.55,
    inventory: 120,
    views: 4100,
    cartAdds: 585,
    purchases: 201,
  },
  {
    id: "sku_102",
    name: "Loomi Everyday Jogger",
    category: "Apparel",
    price: 62,
    margin: 0.51,
    inventory: 88,
    views: 3500,
    cartAdds: 454,
    purchases: 154,
  },
  {
    id: "sku_103",
    name: "Loomi Cloud Tee",
    category: "Basics",
    price: 38,
    margin: 0.57,
    inventory: 240,
    views: 6200,
    cartAdds: 721,
    purchases: 341,
  },
  {
    id: "sku_104",
    name: "Loomi Trail Cap",
    category: "Accessories",
    price: 32,
    margin: 0.62,
    inventory: 300,
    views: 2800,
    cartAdds: 264,
    purchases: 110,
  },
];

const customers: Customer[] = [
  {
    id: "cust_001",
    segment: "vip",
    sessions30d: 11,
    productViews30d: 24,
    cartAdds30d: 6,
    purchases30d: 3,
    totalRevenue: 780,
    lastSeenDaysAgo: 1,
  },
  {
    id: "cust_002",
    segment: "active",
    sessions30d: 7,
    productViews30d: 15,
    cartAdds30d: 4,
    purchases30d: 1,
    totalRevenue: 210,
    lastSeenDaysAgo: 2,
  },
  {
    id: "cust_003",
    segment: "new",
    sessions30d: 3,
    productViews30d: 10,
    cartAdds30d: 2,
    purchases30d: 0,
    totalRevenue: 0,
    lastSeenDaysAgo: 3,
  },
  {
    id: "cust_004",
    segment: "at_risk",
    sessions30d: 2,
    productViews30d: 7,
    cartAdds30d: 3,
    purchases30d: 0,
    totalRevenue: 120,
    lastSeenDaysAgo: 16,
  },
  {
    id: "cust_005",
    segment: "active",
    sessions30d: 6,
    productViews30d: 14,
    cartAdds30d: 3,
    purchases30d: 1,
    totalRevenue: 165,
    lastSeenDaysAgo: 4,
  },
  {
    id: "cust_006",
    segment: "new",
    sessions30d: 4,
    productViews30d: 12,
    cartAdds30d: 2,
    purchases30d: 0,
    totalRevenue: 0,
    lastSeenDaysAgo: 1,
  },
  {
    id: "cust_007",
    segment: "at_risk",
    sessions30d: 1,
    productViews30d: 5,
    cartAdds30d: 1,
    purchases30d: 0,
    totalRevenue: 92,
    lastSeenDaysAgo: 21,
  },
  {
    id: "cust_008",
    segment: "vip",
    sessions30d: 9,
    productViews30d: 20,
    cartAdds30d: 5,
    purchases30d: 2,
    totalRevenue: 520,
    lastSeenDaysAgo: 2,
  },
];

export async function mockBloomreachConnector(): Promise<MockConnectorData> {
  await new Promise((resolve) => setTimeout(resolve, 700));

  return {
    source: "Bloomreach MCP (mocked)",
    syncedAt: new Date().toISOString(),
    customers,
    products,
  };
}
