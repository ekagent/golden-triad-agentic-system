"use client";

import { useState } from "react";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";

const PACKAGES = [
  { id: "starter", name: "Starter Pack", credits: 50, price: "5.00", popular: false },
  { id: "boost", name: "Boost Pack", credits: 120, price: "10.00", popular: true },
  { id: "pro", name: "Pro Pack", credits: 350, price: "25.00", popular: false },
];

export default function PricingTable() {
  const [selectedPack, setSelectedPack] = useState(PACKAGES[1]);
  const [status, setStatus] = useState("");

  const initialOptions = {
    clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || "test",
    currency: "USD",
    intent: "capture",
  };

  return (
    <div className="pricing-container" style={{ padding: "2rem", maxWidth: "800px", margin: "0 auto", textAlign: "center" }}>
      <h2>Top-Up Compute Credits</h2>
      <p className="muted">Directly inject liquidity to authorize agentic task pipelines. 1 Credit = 1 execution iteration.</p>
      
      {status && <div style={{ padding: "1rem", background: "var(--color-bg)", margin: "1rem 0", borderRadius: "8px" }}>{status}</div>}

      <div style={{ display: "flex", gap: "1rem", justifyContent: "center", margin: "2rem 0", flexWrap: "wrap" }}>
        {PACKAGES.map((pkg) => (
          <div 
            key={pkg.id} 
            onClick={() => setSelectedPack(pkg)}
            style={{ 
              padding: "1.5rem", 
              border: selectedPack.id === pkg.id ? "2px solid var(--color-primary)" : "1px solid var(--color-border)",
              borderRadius: "12px",
              cursor: "pointer",
              width: "200px",
              position: "relative"
            }}
            className="surface"
          >
            {pkg.popular && <span style={{ position: "absolute", top: "-10px", left: "50%", transform: "translateX(-50%)", background: "var(--color-primary)", color: "#fff", fontSize: "0.75rem", padding: "2px 8px", borderRadius: "8px" }}>POPULAR</span>}
            <h3>{pkg.name}</h3>
            <div style={{ fontSize: "2rem", margin: "1rem 0" }}>${pkg.price}</div>
            <div className="muted">{pkg.credits} Credits</div>
          </div>
        ))}
      </div>

      <div style={{ maxWidth: "400px", margin: "0 auto" }}>
        <PayPalScriptProvider options={initialOptions}>
            <PayPalButtons
                style={{ layout: "vertical" }}
                createOrder={async () => {
                   const res = await fetch("/api/billing/paypal/create-order", {
                       method: "POST",
                       headers: { "Content-Type": "application/json" },
                       body: JSON.stringify({ amount: selectedPack.price })
                   });
                   const order = await res.json();
                   return order.id;
                }}
                onApprove={async (data, actions) => {
                   const res = await fetch("/api/billing/paypal/capture-order", {
                       method: "POST",
                       headers: { "Content-Type": "application/json" },
                       body: JSON.stringify({ orderID: data.orderID, credits: selectedPack.credits })
                   });
                   const capture = await res.json();
                   if (capture.success) {
                       setStatus(`Success! Transferred ${capture.credits} credits to your account.`);
                   } else {
                       setStatus(`Capture failed: ${capture.error}`);
                   }
                }}
            />
        </PayPalScriptProvider>
      </div>
    </div>
  );
}
