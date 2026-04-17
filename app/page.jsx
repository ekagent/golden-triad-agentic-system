import { SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { getHealthSnapshot } from "@/lib/health";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const health = await getHealthSnapshot();
  const { userId } = await auth();

  const providers = health?.providers || {};
  const activeProviders = Object.values(providers).filter(p => p.configured).length;

  return (
    <main style={{ minHeight: "100vh", overflow: "hidden" }}>

      {/* ───── Sticky Nav ───── */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 50,
        backdropFilter: "blur(18px)", WebkitBackdropFilter: "blur(18px)",
        background: "rgba(252,248,240,0.72)",
        borderBottom: "1px solid var(--line)",
        padding: "0 32px", height: "56px",
        display: "flex", alignItems: "center", justifyContent: "space-between"
      }}>
        <span style={{ fontWeight: 700, fontSize: "0.95rem", letterSpacing: "-0.02em" }}>◈ Golden Triad</span>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {userId ? (
            <>
              <Link href="/dashboard" style={{
                padding: "7px 18px", borderRadius: "999px",
                background: "var(--accent)", color: "#fff",
                fontSize: "0.82rem", fontWeight: 600, textDecoration: "none"
              }}>Dashboard</Link>
              <UserButton />
            </>
          ) : (
            <>
              <SignInButton mode="modal">
                <button style={{
                  background: "none", border: "1px solid var(--line)",
                  borderRadius: "999px", padding: "7px 18px",
                  cursor: "pointer", fontSize: "0.82rem", color: "var(--ink)"
                }}>Sign In</button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button style={{
                  background: "var(--accent)", border: "none",
                  borderRadius: "999px", padding: "7px 18px",
                  cursor: "pointer", fontSize: "0.82rem", color: "#fff", fontWeight: 600
                }}>Get Started</button>
              </SignUpButton>
            </>
          )}
        </div>
      </nav>

      {/* ───── Hero ───── */}
      <section style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        textAlign: "center", padding: "80px 24px 60px",
        position: "relative"
      }}>
        {/* Glow effect */}
        <div style={{
          position: "absolute", top: "-120px", left: "50%", transform: "translateX(-50%)",
          width: "500px", height: "500px", borderRadius: "50%",
          background: "radial-gradient(circle, rgba(15,111,79,0.15), transparent 70%)",
          pointerEvents: "none", filter: "blur(40px)"
        }} />

        <div style={{
          display: "inline-flex", alignItems: "center", gap: "6px",
          padding: "5px 14px", borderRadius: "999px",
          border: "1px solid var(--line)", background: "var(--panel)",
          fontSize: "0.72rem", fontWeight: 500, color: "var(--ink-soft)",
          textTransform: "uppercase", letterSpacing: "0.08em",
          marginBottom: "20px", animation: "fade-up 400ms ease both"
        }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", display: "inline-block" }} />
          Live · {activeProviders} providers online
        </div>

        <h1 style={{
          fontSize: "clamp(2.4rem, 5.5vw, 4rem)", fontWeight: 800,
          lineHeight: 1.08, letterSpacing: "-0.04em",
          margin: "0 0 18px", maxWidth: "720px",
          animation: "fade-up 500ms ease both 100ms"
        }}>
          The Agentic System<br />
          <span style={{ color: "var(--accent)" }}>That Thinks in Triads</span>
        </h1>

        <p style={{
          fontSize: "1.15rem", color: "var(--ink-soft)",
          maxWidth: "520px", lineHeight: 1.55, margin: "0 0 32px",
          animation: "fade-up 500ms ease both 200ms"
        }}>
          Three AI providers. One Golden Rule. Zero single points of failure.
          Execute complex tasks with intelligent model routing and built-in redundancy.
        </p>

        <div style={{ display: "flex", gap: "10px", animation: "fade-up 500ms ease both 300ms" }}>
          {userId ? (
            <Link href="/dashboard" className="primary-action" style={{ textDecoration: "none", padding: "13px 32px", fontSize: "0.92rem" }}>
              Open Dashboard →
            </Link>
          ) : (
            <>
              <SignUpButton mode="modal">
                <button className="primary-action" style={{ padding: "13px 32px", fontSize: "0.92rem" }}>
                  Start Free →
                </button>
              </SignUpButton>
              <Link href="#how-it-works" style={{
                padding: "13px 24px", borderRadius: "999px",
                border: "1px solid var(--line)", fontSize: "0.92rem",
                color: "var(--ink)", textDecoration: "none", fontWeight: 500
              }}>
                How It Works
              </Link>
            </>
          )}
        </div>
      </section>

      {/* ───── Live Stats Bar ───── */}
      <section style={{
        display: "flex", justifyContent: "center", gap: "32px",
        padding: "0 24px 48px", flexWrap: "wrap",
        animation: "fade-up 600ms ease both 400ms"
      }}>
        {[
          { label: "AI Providers", value: activeProviders, suffix: " active" },
          { label: "Model Routing", value: "Golden", suffix: " Rule" },
          { label: "Uptime", value: "99.9", suffix: "%" },
          { label: "Avg Latency", value: "<2", suffix: "s" },
        ].map(stat => (
          <div key={stat.label} style={{
            textAlign: "center", padding: "18px 24px",
            background: "var(--panel)", borderRadius: "18px",
            border: "1px solid var(--line)", minWidth: "140px"
          }}>
            <div style={{ fontSize: "1.5rem", fontWeight: 700, letterSpacing: "-0.02em" }}>
              {stat.value}<span style={{ fontSize: "0.85rem", fontWeight: 400, color: "var(--ink-soft)" }}>{stat.suffix}</span>
            </div>
            <div style={{ fontSize: "0.72rem", color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: "0.08em", marginTop: "4px", fontFamily: "var(--font-mono), monospace" }}>{stat.label}</div>
          </div>
        ))}
      </section>

      {/* ───── How It Works ───── */}
      <section id="how-it-works" style={{ padding: "60px 24px", maxWidth: "920px", margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <span className="eyebrow">Architecture</span>
          <h2 style={{ fontSize: "2rem", fontWeight: 700, margin: "8px 0 0", letterSpacing: "-0.03em" }}>Tri-Provider Intelligence</h2>
          <p style={{ color: "var(--ink-soft)", maxWidth: "480px", margin: "12px auto 0", lineHeight: 1.55 }}>
            Every task runs through a three-layer agentic loop with automatic failover.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "16px" }}>
          {[
            { icon: "◈", step: "01", title: "Golden Lane", desc: "Primary provider handles your task with optimal cost-performance balance. Powered by the Golden Rule algorithm." },
            { icon: "◆", step: "02", title: "Direct Lanes", desc: "Two backup providers ready for instant failover. Zero downtime, zero single points of failure." },
            { icon: "▸", step: "03", title: "Agentic Loop", desc: "Thought → Action → Observation cycle runs until the task is solved. Intelligent iteration, not brute force." },
          ].map(item => (
            <div key={item.step} className="surface" style={{
              padding: "28px 24px", borderRadius: "22px",
              display: "flex", flexDirection: "column", gap: "12px"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "1.2rem", opacity: 0.6 }}>{item.icon}</span>
                <span style={{ fontSize: "0.68rem", fontWeight: 700, color: "var(--accent)", fontFamily: "var(--font-mono), monospace", textTransform: "uppercase", letterSpacing: "0.1em" }}>Step {item.step}</span>
              </div>
              <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 600 }}>{item.title}</h3>
              <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--ink-soft)", lineHeight: 1.55 }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ───── Features Grid ───── */}
      <section style={{ padding: "40px 24px 60px", maxWidth: "920px", margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "36px" }}>
          <span className="eyebrow">Platform</span>
          <h2 style={{ fontSize: "2rem", fontWeight: 700, margin: "8px 0 0", letterSpacing: "-0.03em" }}>Everything You Need</h2>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "14px" }}>
          {[
            { icon: "🔐", title: "Secure Auth", desc: "Enterprise-grade authentication with Clerk" },
            { icon: "💳", title: "Pay-Per-Use", desc: "Credit packs via PayPal or crypto" },
            { icon: "🔄", title: "Subscriptions", desc: "Hobby, Pro & Agency monthly plans" },
            { icon: "🔑", title: "API Access", desc: "Programmatic access with Bearer tokens" },
            { icon: "📊", title: "Usage Analytics", desc: "Charts, consumption trends & top users" },
            { icon: "🔔", title: "Smart Alerts", desc: "Low-credit notifications and reminders" },
            { icon: "⚡", title: "Rate Limiting", desc: "Tiered limits with Redis sliding window" },
            { icon: "🛡️", title: "Caching", desc: "Redis response cache saves credits on repeats" },
            { icon: "🔗", title: "Integrations", desc: "GitHub & Jira tool use built-in" },
          ].map(f => (
            <div key={f.title} style={{
              padding: "20px", borderRadius: "18px",
              border: "1px solid var(--line)",
              background: "var(--panel)",
              transition: "all 200ms ease"
            }}>
              <span style={{ fontSize: "1.3rem" }}>{f.icon}</span>
              <div style={{ fontWeight: 600, fontSize: "0.88rem", marginTop: "8px" }}>{f.title}</div>
              <div style={{ fontSize: "0.78rem", color: "var(--ink-soft)", marginTop: "4px", lineHeight: 1.45 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ───── Pricing Preview ───── */}
      <section style={{ padding: "40px 24px 60px", maxWidth: "920px", margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "36px" }}>
          <span className="eyebrow">Pricing</span>
          <h2 style={{ fontSize: "2rem", fontWeight: 700, margin: "8px 0 0", letterSpacing: "-0.03em" }}>Transparent Pricing</h2>
          <p style={{ color: "var(--ink-soft)", maxWidth: "400px", margin: "12px auto 0" }}>
            Start free. Scale as you grow. No hidden fees.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
          {[
            { name: "Hobby", price: "$15", credits: "200", features: ["Standard queue", "Email support"] },
            { name: "Professional", price: "$49", credits: "800", popular: true, features: ["Priority queue", "API access", "Integrations"] },
            { name: "Agency", price: "$199", credits: "4,000", features: ["All integrations", "Custom models", "Dedicated support"] },
          ].map(plan => (
            <div key={plan.name} className="surface" style={{
              padding: "28px 24px", borderRadius: "22px",
              border: plan.popular ? "2px solid var(--accent)" : "1px solid var(--line)",
              position: "relative"
            }}>
              {plan.popular && (
                <span style={{
                  position: "absolute", top: "-11px", left: "50%", transform: "translateX(-50%)",
                  background: "linear-gradient(135deg, #0f6f4f, #145b43)",
                  color: "#fff", fontSize: "0.65rem", fontWeight: 700,
                  padding: "3px 12px", borderRadius: "999px",
                  textTransform: "uppercase", letterSpacing: "0.06em"
                }}>Recommended</span>
              )}
              <div style={{ fontSize: "0.82rem", fontWeight: 500, color: "var(--ink-soft)" }}>{plan.name}</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: "4px", margin: "6px 0 4px" }}>
                <span style={{ fontSize: "2rem", fontWeight: 700 }}>{plan.price}</span>
                <span style={{ fontSize: "0.78rem", color: "var(--ink-soft)" }}>/mo</span>
              </div>
              <div style={{ fontSize: "0.78rem", color: "var(--accent)", fontWeight: 600 }}>{plan.credits} credits/month</div>
              <ul style={{ listStyle: "none", padding: 0, margin: "14px 0 0", display: "flex", flexDirection: "column", gap: "6px" }}>
                {plan.features.map(f => (
                  <li key={f} style={{ fontSize: "0.78rem", color: "var(--ink-soft)", display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ color: "var(--accent)", fontSize: "0.8rem" }}>✓</span> {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* ───── CTA ───── */}
      <section style={{
        padding: "60px 24px 80px", textAlign: "center",
        background: "linear-gradient(180deg, transparent, rgba(15,111,79,0.05))"
      }}>
        <h2 style={{ fontSize: "1.8rem", fontWeight: 700, margin: "0 0 12px", letterSpacing: "-0.03em" }}>
          Ready to Build with Agents?
        </h2>
        <p style={{ color: "var(--ink-soft)", maxWidth: "420px", margin: "0 auto 24px", lineHeight: 1.55 }}>
          Join developers using the Golden Triad to execute complex AI tasks with zero downtime.
        </p>
        {userId ? (
          <Link href="/dashboard" className="primary-action" style={{ textDecoration: "none", padding: "14px 36px", fontSize: "0.95rem" }}>
            Go to Dashboard →
          </Link>
        ) : (
          <SignUpButton mode="modal">
            <button className="primary-action" style={{ padding: "14px 36px", fontSize: "0.95rem" }}>
              Get Started Free →
            </button>
          </SignUpButton>
        )}
      </section>

      {/* ───── Footer ───── */}
      <footer style={{
        padding: "24px 32px", borderTop: "1px solid var(--line)",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        fontSize: "0.75rem", color: "var(--ink-soft)"
      }}>
        <span>© {new Date().getFullYear()} Golden Triad Agentic System</span>
        <div style={{ display: "flex", gap: "16px" }}>
          <span style={{ fontFamily: "var(--font-mono), monospace", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            System: {Object.values(providers).some(p => p.configured) ? "Operational" : "Degraded"} ·
            {" "}{activeProviders} providers
          </span>
        </div>
      </footer>
    </main>
  );
}
