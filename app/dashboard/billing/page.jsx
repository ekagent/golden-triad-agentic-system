import PricingTable from "@/components/pricing-table";
import { getUserBalance } from "@/lib/storage";
import { auth } from "@clerk/nextjs/server";

export const dynamic = "force-dynamic";

export default async function BillingPage() {
  const { userId } = await auth();
  
  // Safe fetch if user is authenticated
  const balance = userId ? await getUserBalance(userId) : { credits: 0, tier: "free" };

  return (
    <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "2rem" }}>
      <header style={{ marginBottom: "2rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1>Billing & Usage Quotas</h1>
          <p className="muted">Manage your API Compute Credits.</p>
        </div>
        <div className="surface" style={{ padding: "1rem", borderRadius: "8px", textAlign: "right" }}>
          <div className="muted" style={{ fontSize: "0.85rem", textTransform: "uppercase" }}>Current Balance</div>
          <div style={{ fontSize: "1.5rem", fontWeight: "bold", color: "var(--color-primary)" }}>
            {balance.credits} Credits
          </div>
          <div className="muted" style={{ fontSize: "0.85rem" }}>Tier: {balance.tier}</div>
        </div>
      </header>
      
      <PricingTable />
    </div>
  );
}
