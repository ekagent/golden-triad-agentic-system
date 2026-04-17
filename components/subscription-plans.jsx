"use client";

import { useState, useEffect } from "react";

function PlanCard({ plan, active, currentPlanId, onSubscribe, subscribing }) {
  const isCurrentPlan = currentPlanId === plan.id;

  return (
    <div className="surface" style={{
      padding: "24px",
      borderRadius: "22px",
      border: plan.popular ? "2px solid var(--accent)" : "1px solid var(--line)",
      position: "relative",
      display: "flex",
      flexDirection: "column",
      gap: "14px",
      animation: "fade-up 420ms ease both",
      flex: "1 1 220px",
      minWidth: "220px"
    }}>
      {plan.popular && (
        <span style={{
          position: "absolute", top: "-11px", left: "50%", transform: "translateX(-50%)",
          background: "linear-gradient(135deg, #0f6f4f, #145b43)",
          color: "#fff", fontSize: "0.68rem", fontWeight: 700,
          padding: "3px 12px", borderRadius: "999px",
          textTransform: "uppercase", letterSpacing: "0.06em"
        }}>Recommended</span>
      )}

      <div>
        <h3 style={{ margin: 0, fontSize: "1.15rem" }}>{plan.name}</h3>
        <div style={{ display: "flex", alignItems: "baseline", gap: "4px", marginTop: "8px" }}>
          <span style={{ fontSize: "2rem", fontWeight: 700 }}>${plan.price}</span>
          <span style={{ fontSize: "0.82rem", color: "var(--ink-soft)" }}>/month</span>
        </div>
      </div>

      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "8px" }}>
        {plan.features.map((f, i) => (
          <li key={i} style={{ fontSize: "0.82rem", color: "var(--ink-soft)", display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ color: "var(--accent)", fontSize: "0.9rem" }}>✓</span> {f}
          </li>
        ))}
      </ul>

      <div style={{ marginTop: "auto", paddingTop: "8px" }}>
        {isCurrentPlan ? (
          <div style={{
            textAlign: "center", padding: "10px",
            borderRadius: "999px", border: "1px solid var(--accent)",
            color: "var(--accent)", fontSize: "0.85rem", fontWeight: 600
          }}>Current Plan</div>
        ) : (
          <button
            onClick={() => onSubscribe(plan.id)}
            disabled={subscribing}
            className="primary-action"
            style={{
              width: "100%", textAlign: "center", padding: "11px",
              borderRadius: "999px", fontSize: "0.85rem"
            }}
          >
            {subscribing ? "Processing…" : active ? "Switch Plan" : "Subscribe"}
          </button>
        )}
      </div>
    </div>
  );
}

export default function SubscriptionPlans() {
  const [plans, setPlans] = useState([]);
  const [active, setActive] = useState(null);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    fetch("/api/billing/subscriptions")
      .then(r => r.json())
      .then(d => {
        setPlans(d.plans || []);
        setActive(d.activeSubscription || null);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSubscribe = async (planId) => {
    setSubscribing(true);
    setStatus("");
    try {
      const res = await fetch("/api/billing/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId })
      });
      const data = await res.json();
      if (data.approvalUrl) {
        window.location.href = data.approvalUrl;
      } else {
        setStatus("Failed to initiate subscription. Check PayPal configuration.");
      }
    } catch (e) {
      setStatus(`Error: ${e.message}`);
    } finally {
      setSubscribing(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm("Are you sure you want to cancel your subscription? You will keep your remaining credits.")) return;
    setCancelling(true);
    try {
      const res = await fetch("/api/billing/subscriptions", { method: "DELETE" });
      if (res.ok) {
        setActive(null);
        setStatus("Subscription cancelled. Your remaining credits are still available.");
      }
    } catch (e) {
      setStatus(`Error: ${e.message}`);
    } finally {
      setCancelling(false);
    }
  };

  if (loading) return <p className="muted" style={{ textAlign: "center", padding: "20px" }}>Loading plans…</p>;

  return (
    <div style={{ marginTop: "2rem" }}>
      <h2 style={{ margin: "0 0 6px" }}>Monthly Subscriptions</h2>
      <p className="muted" style={{ marginBottom: "20px" }}>
        Subscribe for monthly auto-refill credits and premium features.
      </p>

      {status && (
        <div style={{
          padding: "12px 16px", borderRadius: "14px", marginBottom: "16px",
          background: "var(--accent-soft)", color: "var(--accent)", fontSize: "0.85rem",
          animation: "fade-up 300ms ease"
        }}>
          {status}
        </div>
      )}

      {/* Active subscription banner */}
      {active && (
        <div className="surface" style={{
          padding: "18px 22px", borderRadius: "18px", marginBottom: "20px",
          border: "1px solid rgba(15,111,79,0.2)",
          display: "flex", justifyContent: "space-between", alignItems: "center"
        }}>
          <div>
            <div style={{ fontWeight: 600 }}>Active: {active.planName}</div>
            <div className="muted" style={{ fontSize: "0.78rem", marginTop: "4px" }}>
              {active.credits} credits/month · Renews {new Date(active.periodEnd).toLocaleDateString()}
            </div>
          </div>
          <button
            onClick={handleCancel}
            disabled={cancelling}
            style={{
              background: "none", border: "1px solid rgba(159,45,28,0.2)",
              borderRadius: "12px", padding: "8px 16px", cursor: "pointer",
              fontSize: "0.82rem", color: "var(--danger)", transition: "all 150ms"
            }}
          >
            {cancelling ? "Cancelling…" : "Cancel Subscription"}
          </button>
        </div>
      )}

      {/* Plan cards */}
      <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
        {plans.map(plan => (
          <PlanCard
            key={plan.id}
            plan={plan}
            active={!!active}
            currentPlanId={active?.planId || null}
            onSubscribe={handleSubscribe}
            subscribing={subscribing}
          />
        ))}
      </div>
    </div>
  );
}
