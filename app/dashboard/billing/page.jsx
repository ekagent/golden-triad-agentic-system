import PricingTable from "@/components/pricing-table";
import SubscriptionPlans from "@/components/subscription-plans";
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
          <div style={{ fontSize: "1.5rem", fontWeight: "bold", color: "var(--accent)" }}>
            {balance.credits} Credits
          </div>
          <div className="muted" style={{ fontSize: "0.85rem" }}>Tier: {balance.tier}</div>
        </div>
      </header>
      
      <SubscriptionPlans />

      <div style={{ margin: "2.5rem 0", borderTop: "1px solid var(--line)", position: "relative" }}>
        <span style={{
          position: "absolute", top: "-10px", left: "50%", transform: "translateX(-50%)",
          background: "var(--bg)", padding: "0 14px", fontSize: "0.78rem",
          color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: "0.06em"
        }}>or pay as you go</span>
      </div>

      <PricingTable />
    </div>
  );
}
