"use client";

import React, { useState, useCallback } from "react";

type DNSRecordType = "A" | "AAAA" | "CNAME" | "MX" | "TXT" | "NS";

interface DNSRecord {
  name: string;
  type: string;
  ttl: number;
  data: string;
  priority?: number;
}

interface DNSLookupResponse {
  success: boolean;
  domain: string;
  recordType: string;
  records: DNSRecord[];
  queryTime: number;
  provider: string;
  error?: string;
}

const RECORD_TYPES: { value: DNSRecordType; label: string; description: string }[] = [
  { value: "A", label: "A", description: "IPv4 Address" },
  { value: "AAAA", label: "AAAA", description: "IPv6 Address" },
  { value: "CNAME", label: "CNAME", description: "Canonical Name" },
  { value: "MX", label: "MX", description: "Mail Exchange" },
  { value: "TXT", label: "TXT", description: "Text Record" },
  { value: "NS", label: "NS", description: "Name Server" },
];

const DNS_PROVIDERS = [
  { value: "cloudflare", label: "Cloudflare DNS" },
  { value: "google", label: "Google DNS" },
];

const DnsLookupSimulator: React.FC = () => {
  const [domain, setDomain] = useState("");
  const [recordType, setRecordType] = useState<DNSRecordType>("A");
  const [provider, setProvider] = useState("cloudflare");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DNSLookupResponse | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

  const performLookup = useCallback(async () => {
    if (!domain.trim()) {
      setResult({
        success: false,
        domain: "",
        recordType,
        records: [],
        queryTime: 0,
        provider,
        error: "Please enter a domain name",
      });
      return;
    }

    setLoading(true);
    setResult(null);
    setCopiedIndex(null);
    setCopiedAll(false);

    try {
      const params = new URLSearchParams({
        domain: domain.trim(),
        type: recordType,
        provider,
      });

      const response = await fetch(`/api/dns-lookup?${params}`);
      const data: DNSLookupResponse = await response.json();
      setResult(data);
    } catch (error) {
      setResult({
        success: false,
        domain: domain.trim(),
        recordType,
        records: [],
        queryTime: 0,
        provider,
        error: error instanceof Error ? error.message : "Network error occurred",
      });
    } finally {
      setLoading(false);
    }
  }, [domain, recordType, provider]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !loading) {
      performLookup();
    }
  };

  const copyToClipboard = async (text: string, index?: number) => {
    try {
      await navigator.clipboard.writeText(text);
      if (index !== undefined) {
        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex(null), 2000);
      } else {
        setCopiedAll(true);
        setTimeout(() => setCopiedAll(false), 2000);
      }
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const copyAllRecords = () => {
    if (!result?.records.length) return;

    const text = result.records
      .map((r) => {
        let line = `${r.name} ${r.ttl} ${r.type} `;
        if (r.priority !== undefined) {
          line += `${r.priority} `;
        }
        line += r.data;
        return line;
      })
      .join("\n");

    copyToClipboard(text);
  };

  const formatTTL = (ttl: number): string => {
    if (ttl < 60) return `${ttl}s`;
    if (ttl < 3600) return `${Math.floor(ttl / 60)}m ${ttl % 60}s`;
    if (ttl < 86400) {
      const hours = Math.floor(ttl / 3600);
      const mins = Math.floor((ttl % 3600) / 60);
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
    const days = Math.floor(ttl / 86400);
    const hours = Math.floor((ttl % 86400) / 3600);
    return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
  };

  const clearResults = () => {
    setDomain("");
    setResult(null);
    setCopiedIndex(null);
    setCopiedAll(false);
  };

  const getRecordTypeColor = (type: string): string => {
    const colors: Record<string, string> = {
      A: "bg-green-500/20 text-green-400 border-green-500/30",
      AAAA: "bg-blue-500/20 text-blue-400 border-blue-500/30",
      CNAME: "bg-purple-500/20 text-purple-400 border-purple-500/30",
      MX: "bg-orange-500/20 text-orange-400 border-orange-500/30",
      TXT: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
      NS: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
    };
    return colors[type] || "bg-gray-500/20 text-gray-400 border-gray-500/30";
  };

  return (
    <div className="md:mt-8 mt-4 text-white">
      <div className="flex-1 flex items-center justify-center">
        <div className="w-full bg-[#FFFFFF1A] rounded-2xl shadow-lg p-8">
          <div className="md:w-[950px] mx-auto space-y-6">
            {/* Input Section */}
            <div className="space-y-4">
              <div className="flex flex-col md:flex-row gap-4">
                {/* Domain Input */}
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-2 text-white/80">
                    Domain Name
                  </label>
                  <input
                    type="text"
                    value={domain}
                    onChange={(e) => setDomain(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="example.com"
                    className="w-full bg-black/20 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                    disabled={loading}
                  />
                </div>

                {/* Record Type Dropdown */}
                <div className="md:w-48">
                  <label className="block text-sm font-medium mb-2 text-white/80">
                    Record Type
                  </label>
                  <select
                    value={recordType}
                    onChange={(e) => setRecordType(e.target.value as DNSRecordType)}
                    className="w-full bg-black/20 border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors cursor-pointer"
                    disabled={loading}
                  >
                    {RECORD_TYPES.map((type) => (
                      <option key={type.value} value={type.value} className="bg-[#1a1a1a]">
                        {type.label} - {type.description}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Provider Dropdown */}
                <div className="md:w-44">
                  <label className="block text-sm font-medium mb-2 text-white/80">
                    DNS Provider
                  </label>
                  <select
                    value={provider}
                    onChange={(e) => setProvider(e.target.value)}
                    className="w-full bg-black/20 border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors cursor-pointer"
                    disabled={loading}
                  >
                    {DNS_PROVIDERS.map((p) => (
                      <option key={p.value} value={p.value} className="bg-[#1a1a1a]">
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                <button
                  onClick={performLookup}
                  disabled={loading}
                  className="px-6 py-2 bg-primary hover:bg-primary/80 rounded-lg text-sm transition-colors text-black font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <svg
                        className="animate-spin h-4 w-4"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Looking up...
                    </>
                  ) : (
                    <>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                        />
                      </svg>
                      Lookup
                    </>
                  )}
                </button>
                <button
                  onClick={clearResults}
                  disabled={loading}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded-lg text-sm transition-colors text-white font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Results Section */}
            {result && (
              <div className="space-y-4">
                {/* Query Info */}
                <div className="flex flex-wrap items-center gap-4 text-sm text-white/70 bg-black/10 p-3 rounded-lg">
                  <span>
                    <span className="text-white/50">Domain:</span>{" "}
                    <span className="text-white font-mono">{result.domain || "—"}</span>
                  </span>
                  <span>
                    <span className="text-white/50">Type:</span>{" "}
                    <span className={`px-2 py-0.5 rounded border text-xs font-medium ${getRecordTypeColor(result.recordType)}`}>
                      {result.recordType}
                    </span>
                  </span>
                  <span>
                    <span className="text-white/50">Provider:</span>{" "}
                    <span className="capitalize">{result.provider}</span>
                  </span>
                  <span>
                    <span className="text-white/50">Query Time:</span>{" "}
                    <span>{result.queryTime}ms</span>
                  </span>
                </div>

                {/* Error Display */}
                {!result.success && result.error && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400">
                    <div className="flex items-start gap-3">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 mt-0.5 flex-shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <div>
                        <p className="font-medium">Lookup Failed</p>
                        <p className="text-sm mt-1 text-red-400/80">{result.error}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Success - No Records */}
                {result.success && result.records.length === 0 && (
                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 text-yellow-400">
                    <div className="flex items-start gap-3">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 mt-0.5 flex-shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <div>
                        <p className="font-medium">No Records Found</p>
                        <p className="text-sm mt-1 text-yellow-400/80">
                          No {result.recordType} records were found for this domain.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Records Table */}
                {result.success && result.records.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-white">
                        DNS Records ({result.records.length})
                      </h3>
                      <button
                        onClick={copyAllRecords}
                        className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors flex items-center gap-2"
                      >
                        {copiedAll ? (
                          <>
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-4 w-4 text-green-400"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                            Copied!
                          </>
                        ) : (
                          <>
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-4 w-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                              />
                            </svg>
                            Copy All
                          </>
                        )}
                      </button>
                    </div>

                    <div className="bg-black/20 rounded-lg border border-white/10 overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-white/5 text-white/70 text-left">
                              <th className="px-4 py-3 font-medium">Name</th>
                              <th className="px-4 py-3 font-medium">Type</th>
                              <th className="px-4 py-3 font-medium">TTL</th>
                              {result.recordType === "MX" && (
                                <th className="px-4 py-3 font-medium">Priority</th>
                              )}
                              <th className="px-4 py-3 font-medium">Value</th>
                              <th className="px-4 py-3 font-medium w-16"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5">
                            {result.records.map((record, index) => (
                              <tr key={index} className="hover:bg-white/5 transition-colors">
                                <td className="px-4 py-3 font-mono text-xs text-white/90">
                                  {record.name}
                                </td>
                                <td className="px-4 py-3">
                                  <span
                                    className={`px-2 py-0.5 rounded border text-xs font-medium ${getRecordTypeColor(record.type)}`}
                                  >
                                    {record.type}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-white/70">
                                  <span className="font-mono text-xs">{formatTTL(record.ttl)}</span>
                                  <span className="text-white/40 ml-1 text-xs">({record.ttl}s)</span>
                                </td>
                                {result.recordType === "MX" && (
                                  <td className="px-4 py-3 text-white/70 font-mono text-xs">
                                    {record.priority ?? "—"}
                                  </td>
                                )}
                                <td className="px-4 py-3 font-mono text-xs text-white/90 break-all max-w-xs">
                                  {record.data}
                                </td>
                                <td className="px-4 py-3">
                                  <button
                                    onClick={() => copyToClipboard(record.data, index)}
                                    className="p-1.5 hover:bg-white/10 rounded transition-colors"
                                    title="Copy value"
                                  >
                                    {copiedIndex === index ? (
                                      <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        className="h-4 w-4 text-green-400"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={2}
                                          d="M5 13l4 4L19 7"
                                        />
                                      </svg>
                                    ) : (
                                      <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        className="h-4 w-4 text-white/50 hover:text-white"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={2}
                                          d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                                        />
                                      </svg>
                                    )}
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Initial State */}
            {!result && !loading && (
              <div className="bg-black/10 border border-white/10 rounded-lg p-8 text-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-12 w-12 mx-auto text-white/30 mb-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                  />
                </svg>
                <p className="text-white/50 mb-2">Enter a domain name to look up DNS records</p>
                <p className="text-white/30 text-sm">
                  Supports A, AAAA, CNAME, MX, TXT, and NS record types
                </p>
              </div>
            )}

            {/* Info Section */}
            <div className="text-xs text-white/40 bg-black/10 p-4 rounded-lg space-y-2">
              <p className="font-medium text-white/60">About DNS Record Types:</p>
              <ul className="grid md:grid-cols-2 gap-2">
                <li><span className="text-green-400 font-medium">A</span> — Maps domain to IPv4 address</li>
                <li><span className="text-blue-400 font-medium">AAAA</span> — Maps domain to IPv6 address</li>
                <li><span className="text-purple-400 font-medium">CNAME</span> — Alias pointing to another domain</li>
                <li><span className="text-orange-400 font-medium">MX</span> — Mail server records with priority</li>
                <li><span className="text-yellow-400 font-medium">TXT</span> — Text records (SPF, DKIM, verification)</li>
                <li><span className="text-cyan-400 font-medium">NS</span> — Authoritative name servers</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DnsLookupSimulator;
