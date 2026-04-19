"use client";

import { useState } from "react";
import { UserButton, SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";
import Link from "next/link";

export default function WaitlistPage() {
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
    <div className="min-h-screen bg-[#050505] text-white flex flex-col font-sans selection:bg-indigo-500/30">
      {/* Background Glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 blur-[120px] rounded-full" />
      </div>

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-6 max-w-7xl mx-auto w-full">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-110 transition-transform">
            <span className="text-sm font-bold">G</span>
          </div>
          <span className="text-xl font-bold tracking-tight">Golden Triad</span>
        </Link>
        <div className="flex items-center gap-4">
          <SignedIn>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>
          <SignedOut>
            <SignInButton mode="modal">
              <button className="px-5 py-2 text-sm font-medium hover:text-indigo-400 transition-colors">Sign In</button>
            </SignInButton>
          </SignedOut>
        </div>
      </nav>

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 -mt-20">
        <div className="max-w-2xl w-full text-center space-y-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-indigo-400 uppercase tracking-wider backdrop-blur-sm animate-pulse">
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
              Private Beta Active
            </div>
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white to-white/40 leading-tight">
              Access is currently <br /> invite-only.
            </h1>
            <p className="text-lg text-white/50 max-w-lg mx-auto leading-relaxed">
              We're scaling the Golden Triad infrastructure carefully to ensure elite performance for every agent. Join the elite waitlist for early access.
            </p>
          </div>

          <div className="max-w-md mx-auto relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200" />
            
            <form onSubmit={handleSubmit} className="relative bg-[#0A0A0A] border border-white/10 p-2 rounded-2xl shadow-2xl flex flex-col md:flex-row gap-2">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 bg-transparent px-6 py-4 focus:outline-none text-white placeholder-white/20"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={status === "loading" || status === "success"}
              />
              <button
                type="submit"
                disabled={status === "loading" || status === "success"}
                className={`px-8 py-4 rounded-xl font-bold transition-all ${
                  status === "success" 
                  ? "bg-green-500/20 text-green-400 border border-green-500/20" 
                  : "bg-gradient-to-r from-indigo-600 to-purple-600 hover:shadow-lg hover:shadow-indigo-500/40 active:scale-95"
                }`}
              >
                {status === "loading" ? "Joining..." : status === "success" ? "You're in!" : "Join Waitlist"}
              </button>
            </form>
          </div>

          {message && (
            <p className={`text-sm font-medium ${status === "error" ? "text-red-400" : "text-indigo-400"}`}>
              {message}
            </p>
          )}

          <div className="pt-8 grid grid-cols-2 md:grid-cols-3 gap-8 opacity-40 grayscale group-hover:grayscale-0 transition-all duration-700">
             <div className="flex flex-col items-center">
                <span className="text-xs uppercase tracking-widest font-bold mb-1">Scale</span>
                <span className="text-sm font-mono">1M+ runs</span>
             </div>
             <div className="flex flex-col items-center">
                <span className="text-xs uppercase tracking-widest font-bold mb-1">Global</span>
                <span className="text-sm font-mono">Edge Compute</span>
             </div>
             <div className="hidden md:flex flex-col items-center">
                <span className="text-xs uppercase tracking-widest font-bold mb-1">Model</span>
                <span className="text-sm font-mono">Triad-Intelligence</span>
             </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-12 text-center text-white/20 text-sm">
        &copy; 2026 Golden Triad Agentic System. All rights reserved.
      </footer>

      <style jsx global>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
