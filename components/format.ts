export const usd = (cents: number) =>
  (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: cents % 100 ? 2 : 0 });

export const miles = (n: number) => `${n.toLocaleString("en-US")} mi`;
