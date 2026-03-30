/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Shield, ShieldCheck, ShieldAlert, ShieldX, Loader2, Info, Globe, Lock, Unlock, AlertTriangle, CheckCircle2, Search } from "lucide-react";
import GlassCard from "./components/GlassCard";
import ThemeToggle from "./components/ThemeToggle";
import Modal from "./components/Modal";
import { GoogleGenAI, Type } from "@google/genai";

const getApiKey = () => {
  return import.meta.env.VITE_GEMINI_API_KEY || (typeof process !== 'undefined' ? process.env.GEMINI_API_KEY : "") || "";
};

// Initialize lazily to prevent top-level crashes if key is missing
let aiInstance: GoogleGenAI | null = null;
const getAi = () => {
  if (!aiInstance) {
    const key = getApiKey();
    if (key) {
      aiInstance = new GoogleGenAI({ apiKey: key });
    }
  }
  return aiInstance;
};

interface SafetyResult {
  url: string;
  domain: string;
  status: "safe" | "warning" | "dangerous";
  score: number;
  details: {
    ssl: boolean;
    malware: boolean;
    phishing: boolean;
    reputation: string;
  };
  summary: string;
}

export default function App() {
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<SafetyResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const [isTermsOpen, setIsTermsOpen] = useState(false);
  const [promoIndex, setPromoIndex] = useState(0);

  const promoPhrases = [
    "#1 BEST WEBSITE SCANNER",
    "TRUSTED BY MILLIONS",
    "REAL-TIME AI ANALYSIS",
    "STAY SAFE ONLINE",
    "INSTANT SECURITY CHECK"
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setPromoIndex((prev) => (prev + 1) % promoPhrases.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const scanWebsite = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!url) return;

    let normalizedUrl = url.trim();
    if (!/^https?:\/\//i.test(normalizedUrl)) {
      normalizedUrl = `https://${normalizedUrl}`;
    }

    // Basic domain validation
    try {
      const urlObj = new URL(normalizedUrl);
      if (!urlObj.hostname.includes(".")) {
        throw new Error("Invalid domain format");
      }
    } catch (err) {
      setError("Please enter a valid website URL (e.g., google.com)");
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      const ai = getAi();
      if (!ai) {
        setError("Gemini API key is missing. Please set VITE_GEMINI_API_KEY in your Vercel environment variables.");
        setIsLoading(false);
        return;
      }
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Analyze the safety of this website: ${normalizedUrl}. 
        1. Use Google Search to check its reputation, safety warnings, and presence on threat intelligence lists (e.g., VirusTotal, PhishTank, CERT.pl warning lists, Google Safe Browsing).
        2. Specifically check if it is a known phishing, malware, or scam site.
        3. Evaluate SSL status and domain age if possible.
        4. Return the result in JSON format.`,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              exists: { type: Type.BOOLEAN, description: "Whether the website is a known existing site" },
              status: { type: Type.STRING, enum: ["safe", "warning", "dangerous"] },
              score: { type: Type.NUMBER, description: "Safety score from 0 to 100 (0 is most dangerous, 100 is perfectly safe)" },
              ssl: { type: Type.BOOLEAN },
              malware: { type: Type.BOOLEAN, description: "True if malware risk is detected" },
              phishing: { type: Type.BOOLEAN, description: "True if phishing risk is detected" },
              reputation: { type: Type.STRING },
              summary: { type: Type.STRING, description: "A brief 1-sentence summary of the safety check" }
            },
            required: ["exists", "status", "score", "ssl", "malware", "phishing", "reputation", "summary"]
          }
        }
      });

      const data = JSON.parse(response.text);

      if (!data.exists) {
        setError("This website does not appear to exist or is not recognized.");
        setIsLoading(false);
        return;
      }

      setResult({
        url: normalizedUrl,
        domain: new URL(normalizedUrl).hostname,
        status: data.status,
        score: data.score,
        details: {
          ssl: data.ssl,
          malware: !data.malware,
          phishing: data.phishing,
          reputation: data.reputation,
        },
        summary: data.summary
      });
    } catch (err) {
      console.error("Safety check failed:", err);
      setError("Failed to analyze the website. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "safe": return "text-green-500 bg-green-500/10 border-green-500/20";
      case "warning": return "text-amber-500 bg-amber-500/10 border-amber-500/20";
      case "dangerous": return "text-red-500 bg-red-500/10 border-red-500/20";
      default: return "text-slate-500 bg-slate-500/10 border-slate-500/20";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "safe": return <ShieldCheck size={24} />;
      case "warning": return <ShieldAlert size={24} />;
      case "dangerous": return <ShieldX size={24} />;
      default: return <Shield size={24} />;
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-black text-slate-900 dark:text-slate-100 font-sans selection:bg-blue-500/30 transition-colors duration-500">
      {/* Animated Background */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 animate-gradient bg-gradient-to-br from-indigo-500/5 via-blue-500/5 to-teal-500/5 dark:from-indigo-900/10 dark:via-blue-900/10 dark:to-teal-900/10" />
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-indigo-400/10 dark:bg-indigo-600/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-teal-400/10 dark:bg-teal-600/10 rounded-full blur-[120px] animate-pulse delay-700" />
      </div>

      <ThemeToggle />

      <main className="container mx-auto px-4 py-20 flex flex-col items-center justify-center min-h-screen">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="h-8 mb-4 overflow-hidden flex justify-center items-center">
            <AnimatePresence mode="wait">
              <motion.span
                key={promoIndex}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -20, opacity: 0 }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
                className="text-xs font-bold tracking-[0.2em] text-indigo-500 uppercase block"
              >
                {promoPhrases[promoIndex]}
              </motion.span>
            </AnimatePresence>
          </div>
          <div className="inline-flex items-center justify-center p-3 glass-panel mb-6 text-blue-500 shadow-xl shadow-blue-500/10">
            <Shield size={32} />
          </div>
          <h1 className="text-6xl md:text-8xl font-bold tracking-tighter mb-4 bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-blue-600 dark:from-indigo-400 dark:to-blue-400">
            Fullsafe
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-400 font-light">
            Check if a website is <span className="italic font-medium text-indigo-500">safe</span> to visit
          </p>
        </motion.div>

        <div className="w-full max-w-2xl space-y-8">
          <GlassCard>
            <form onSubmit={scanWebsite} className="space-y-6">
              <div className="relative group">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                  <Search size={20} />
                </div>
                <input
                  type="text"
                  required
                  placeholder="Enter website URL (e.g. google.com)"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-full glass-input py-4 pl-12 pr-4 rounded-xl text-lg"
                />
              </div>

              {error && (
                <motion.p 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-red-500 text-sm flex items-center gap-2 px-2"
                >
                  <AlertTriangle size={14} />
                  {error}
                </motion.p>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full glow-button py-4 rounded-xl text-white font-semibold text-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/20"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    Deep Scanning & AI Analysis...
                  </>
                ) : (
                  <>
                    Scan Website
                    <ShieldCheck size={20} />
                  </>
                )}
              </button>
            </form>
          </GlassCard>

          <AnimatePresence mode="wait">
            {result && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="space-y-6"
              >
                <GlassCard className="relative overflow-hidden">
                  <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
                    {/* Score Circle */}
                    <div className="relative flex-shrink-0">
                      <svg className="w-32 h-32 transform -rotate-90">
                        <circle
                          cx="64"
                          cy="64"
                          r="58"
                          stroke="currentColor"
                          strokeWidth="8"
                          fill="transparent"
                          className="text-slate-200 dark:text-slate-800"
                        />
                        <circle
                          cx="64"
                          cy="64"
                          r="58"
                          stroke="currentColor"
                          strokeWidth="8"
                          fill="transparent"
                          strokeDasharray={364.4}
                          strokeDashoffset={364.4 - (364.4 * result.score) / 100}
                          strokeLinecap="round"
                          className={`transition-all duration-1000 ease-out ${
                            result.status === 'safe' ? 'text-green-500' :
                            result.status === 'warning' ? 'text-amber-500' :
                            'text-red-500'
                          }`}
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-3xl font-bold">{result.score}</span>
                        <span className="text-[10px] uppercase font-bold text-slate-500">Safety Score</span>
                      </div>
                    </div>

                    <div className="flex-1 space-y-4 text-center md:text-left">
                      <div>
                        <h2 className="text-2xl font-bold truncate">{result.domain}</h2>
                        <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border mt-2 text-sm font-bold uppercase tracking-wider ${getStatusColor(result.status)}`}>
                          {getStatusIcon(result.status)}
                          {result.status}
                        </div>
                      </div>

                      <p className="text-slate-600 dark:text-slate-400 text-sm italic">
                        "{result.summary}"
                      </p>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 glass-panel flex items-center gap-3">
                          {result.details.ssl ? <Lock size={18} className="text-green-500" /> : <Unlock size={18} className="text-amber-500" />}
                          <div className="text-left">
                            <p className="text-[10px] text-slate-500 uppercase font-bold">SSL Status</p>
                            <p className="text-xs font-medium">{result.details.ssl ? "Encrypted" : "Unsecured"}</p>
                          </div>
                        </div>
                        <div className="p-3 glass-panel flex items-center gap-3">
                          {result.details.malware ? <CheckCircle2 size={18} className="text-green-500" /> : <AlertTriangle size={18} className="text-red-500" />}
                          <div className="text-left">
                            <p className="text-[10px] text-slate-500 uppercase font-bold">Malware</p>
                            <p className="text-xs font-medium">{result.details.malware ? "Clean" : "Detected"}</p>
                          </div>
                        </div>
                        <div className="p-3 glass-panel flex items-center gap-3">
                          {result.details.phishing ? <AlertTriangle size={18} className="text-red-500" /> : <CheckCircle2 size={18} className="text-green-500" />}
                          <div className="text-left">
                            <p className="text-[10px] text-slate-500 uppercase font-bold">Phishing</p>
                            <p className="text-xs font-medium">{result.details.phishing ? "Suspicious" : "Safe"}</p>
                          </div>
                        </div>
                        <div className="p-3 glass-panel flex items-center gap-3">
                          <Globe size={18} className="text-blue-500" />
                          <div className="text-left">
                            <p className="text-[10px] text-slate-500 uppercase font-bold">Reputation</p>
                            <p className="text-xs font-medium">{result.details.reputation}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </GlassCard>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="flex flex-col items-center gap-1.5 justify-center text-slate-500 text-[10px] text-center max-w-xs mx-auto"
                >
                  <div className="flex items-center gap-2">
                    <Search size={10} />
                    <span>Checking VirusTotal, CERT.pl, PhishTank, and more...</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Info size={10} />
                    <span>AI-powered security analysis completed</span>
                  </div>
                  <span className="opacity-60 italic">*results may be inaccurate</span>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <footer className="mt-20 text-center space-y-4">
          <p className="text-slate-500 text-sm max-w-md mx-auto leading-relaxed">
            Fullsafe is a security analysis tool designed for educational and lawful website verification.
            Always exercise caution when visiting unfamiliar links.
          </p>
          <div className="flex items-center justify-center gap-6 text-slate-400">
            <button 
              onClick={() => setIsPrivacyOpen(true)}
              className="hover:text-indigo-500 transition-colors cursor-pointer"
            >
              Privacy
            </button>
            <button 
              onClick={() => setIsTermsOpen(true)}
              className="hover:text-indigo-500 transition-colors cursor-pointer"
            >
              Terms
            </button>
          </div>
        </footer>

        <Modal
          isOpen={isPrivacyOpen}
          onClose={() => setIsPrivacyOpen(false)}
          title="Privacy Policy"
        >
          <div className="space-y-4 text-slate-600 dark:text-slate-400">
            <p>
              At Fullsafe, we prioritize your privacy. This policy outlines how we handle information when you use our website safety checker.
            </p>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">1. Information Collection</h3>
            <p>
              We do not collect personal information. We only process the URLs you submit for the purpose of safety analysis.
            </p>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">2. Data Usage</h3>
            <p>
              Submitted URLs are analyzed using AI models to provide safety scores and risk assessments. This data is not stored permanently on our servers.
            </p>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">3. Third-Party Services</h3>
            <p>
              We use Google Gemini AI for safety analysis. Please refer to Google's privacy policy for information on how they handle data.
            </p>
          </div>
        </Modal>

        <Modal
          isOpen={isTermsOpen}
          onClose={() => setIsTermsOpen(false)}
          title="Terms of Service"
        >
          <div className="space-y-4 text-slate-600 dark:text-slate-400">
            <p>
              By using Fullsafe, you agree to the following terms and conditions.
            </p>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">1. Acceptable Use</h3>
            <p>
              You agree to use Fullsafe only for lawful purposes and in a way that does not infringe the rights of others.
            </p>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">2. Disclaimer</h3>
            <p>
              Fullsafe provides AI-powered safety assessments. These results are for informational purposes only and may not be 100% accurate. We are not responsible for any actions taken based on these results.
            </p>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">3. Limitation of Liability</h3>
            <p>
              In no event shall Fullsafe be liable for any damages arising out of the use or inability to use our services.
            </p>
          </div>
        </Modal>
      </main>
    </div>
  );
}
