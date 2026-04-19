"use client";

import { useState } from "react";
import { UserButton, SignInButton, useUser } from "@clerk/nextjs";
import Link from "next/link";

export default function WaitlistPage() {
  const { isSignedIn, isLoaded } = useUser();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle"); // idle | loading | success | error
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("loading");

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong.");

      setStatus("success");
      setMessage("You're on the list! We'll reach out once a spot opens up.");
      setEmail("");
    } catch (err) {
      setStatus("error");
      setMessage(err.message);
    }
  };


  return (
    <div className="studio" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Nav */}
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '60px' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="eyebrow" style={{ padding: '6px 14px' }}>Golden Triad</div>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {isLoaded && (
            <>
              {isSignedIn ? (
                <UserButton afterSignOutUrl="/" />
              ) : (
                <SignInButton mode="modal">
                  <button className="primary-action" style={{ background: 'transparent', color: 'var(--ink)', border: '1px solid var(--line)', boxShadow: 'none' }}>Sign In</button>
                </SignInButton>
              )}
            </>
          )}
        </div>
      </nav>


      {/* Main Content */}
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyCenter: 'center', padding: '0 20px' }}>
        <div className="surface workspace-content" style={{ maxWidth: '640px', margin: '0 auto', padding: '48px', textAlign: 'center' }}>
          <div className="stack" style={{ gap: '32px' }}>
            <div className="brand-block">
              <div className="eyebrow" style={{ margin: '0 auto 12px' }}>Private Beta</div>
              <h1 className="brand-title">Access is currently invite‑only.</h1>
              <p className="brand-copy" style={{ maxWidth: '420px', margin: '16px auto 0' }}>
                We're scaling the Golden Triad infrastructure carefully to ensure elite performance. 
                Join the waitlist to be notified when more capacity is added.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="stack" style={{ gap: '16px', maxWidth: '400px', margin: '0 auto', width: '100%' }}>
              <div className="field">
                <input
                  type="email"
                  placeholder="Enter your email"
                  style={{ textAlign: 'center' }}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={status === "loading" || status === "success"}
                />
              </div>
              <button
                type="submit"
                className="primary-action"
                style={{ width: '100%', justifyContent: 'center' }}
                disabled={status === "loading" || status === "success"}
              >
                {status === "loading" ? "Joining..." : status === "success" ? "You're on the list!" : "Join Waitlist"}
              </button>
              
              {message && (
                <div className={status === "error" ? "error-box" : "secondary-note"} style={{ marginTop: '8px' }}>
                  {message}
                </div>
              )}
            </form>

            <div style={{ paddingTop: '20px', borderTop: '1px solid var(--line)', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
              <div>
                <div className="label">Scale</div>
                <div className="mini">1M+ Runs</div>
              </div>
              <div>
                <div className="label">Compute</div>
                <div className="mini">Global Edge</div>
              </div>
              <div>
                <div className="label">Model</div>
                <div className="mini">Triad R1</div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer style={{ marginTop: 'auto', padding: '40px 0', textAlign: 'center' }} className="muted">
        &copy; 2026 Golden Triad Agentic System
      </footer>
    </div>
  );
}

