"use client";

import React, { useEffect, useState, useRef } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell
} from "recharts";
import {
  Building2, Calendar, Activity, DollarSign, TrendingUp, Clock, AlertTriangle, Send, Bot, User, ShieldCheck, Filter, Users, X, MessageSquare
} from "lucide-react";

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
const MONTHS = ["All", "2025-06", "2025-07", "2025-08", "2025-09", "2025-10", "2025-11", "2025-12"];

export default function Dashboard() {
  const [metrics, setMetrics] = useState<any>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>("All");
  const [selectedBranch, setSelectedBranch] = useState<string>("All");
  
  // Chat Widget State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState<{ role: "user" | "ai"; content: string }[]>([
    { role: "ai", content: "Hello Executive. I am your Intelligence Engine. Ask me about delays, branch targets, or rep performance." }
  ]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let url = "/api/metrics";
    const params = new URLSearchParams();
    if (selectedMonth !== "All") params.append("month", selectedMonth);
    if (selectedBranch !== "All") params.append("branch_id", selectedBranch);
    if (params.toString()) url += `?${params.toString()}`;

    fetch(url)
      .then(res => res.json())
      .then(data => setMetrics(data))
      .catch(err => console.error("Failed to load metrics", err));
  }, [selectedMonth, selectedBranch]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [chatHistory, isChatLoading, isChatOpen]);

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isChatLoading) return;
    
    const userMsg = chatInput;
    setChatInput("");
    setChatHistory(prev => [...prev, { role: "user", content: userMsg }]);
    setIsChatLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg })
      });
      const data = await res.json();
      setChatHistory(prev => [...prev, { role: "ai", content: data.reply || data.error }]);
    } catch (err) {
      setChatHistory(prev => [...prev, { role: "ai", content: "Error connecting to Intelligence Engine." }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  if (!metrics) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-950 text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Calculate aggregates for KPI Cards
  const totalActualRevenue = metrics.targetVsActual.reduce((acc: number, cur: any) => acc + cur.actual_revenue, 0);
  const totalTargetRevenue = metrics.targetVsActual.reduce((acc: number, cur: any) => acc + cur.target_revenue, 0);
  
  // Format for Bar Chart
  const branchChartData = metrics.targetVsActual.reduce((acc: any[], cur: any) => {
    const existing = acc.find((item: any) => item.branch === cur.branch_id);
    if (existing) {
      existing.actual += cur.actual_revenue;
      existing.target += cur.target_revenue;
    } else {
      acc.push({ branch: cur.branch_id, actual: cur.actual_revenue, target: cur.target_revenue });
    }
    return acc;
  }, []);

  // Format for Pie Chart
  const delayReasonsData = Object.entries(metrics.deliverySLA.delay_reasons_distribution).map(([name, value]) => ({ name, value }));

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 font-sans selection:bg-blue-900 pb-24">
      
      {/* Header & Global Filters */}
      <header className="sticky top-0 z-40 bg-gray-950/90 backdrop-blur-xl border-b border-gray-800 px-6 py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            <Building2 className="text-blue-500" />
            DealerPulse Intelligence
          </h1>
          <p className="text-gray-400 mt-1 flex items-center gap-2 text-sm">
            <Calendar className="w-4 h-4" /> Global Executive Dashboard
          </p>
        </div>
        
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2 bg-gray-900 border border-gray-700 px-3 py-1.5 rounded-lg">
            <Filter className="w-4 h-4 text-gray-400" />
            <select 
              className="bg-transparent text-white text-sm outline-none cursor-pointer"
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
            >
              {MONTHS.map(m => <option key={m} value={m} className="bg-gray-800">{m === "All" ? "All Months" : m}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2 bg-gray-900 border border-gray-700 px-3 py-1.5 rounded-lg">
            <Building2 className="w-4 h-4 text-gray-400" />
            <select 
              className="bg-transparent text-white text-sm outline-none cursor-pointer"
              value={selectedBranch}
              onChange={e => setSelectedBranch(e.target.value)}
            >
              <option value="All" className="bg-gray-800">All Branches</option>
              {metrics.availableBranches?.map((b: any) => (
                <option key={b.id} value={b.id} className="bg-gray-800">{b.name} ({b.id})</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2 bg-gray-900/50 px-4 py-2 rounded-full border border-green-900/30">
            <ShieldCheck className="text-green-500 w-4 h-4" />
            <span className="text-sm font-semibold text-green-400">System Healthy</span>
          </div>
        </div>
      </header>

      <div className="p-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-gray-900 border border-gray-800 p-5 rounded-2xl shadow-lg relative overflow-hidden group hover:border-gray-700 transition">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition">
            <DollarSign className="w-16 h-16" />
          </div>
          <p className="text-gray-400 text-sm font-medium mb-1">Total Revenue</p>
          <h3 className="text-3xl font-bold text-white">₹{(totalActualRevenue / 10000000).toFixed(2)}Cr</h3>
          <p className="text-xs text-gray-500 mt-2">vs Target ₹{(totalTargetRevenue / 10000000).toFixed(2)}Cr</p>
          <div className="w-full bg-gray-800 h-1.5 mt-3 rounded-full overflow-hidden">
            <div className="bg-blue-500 h-full" style={{ width: `${totalTargetRevenue ? Math.min((totalActualRevenue / totalTargetRevenue) * 100, 100) : 0}%` }} />
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 p-5 rounded-2xl shadow-lg relative overflow-hidden group hover:border-gray-700 transition">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition">
            <TrendingUp className="w-16 h-16" />
          </div>
          <p className="text-gray-400 text-sm font-medium mb-1">Conversion Rate</p>
          <h3 className="text-3xl font-bold text-white">{(metrics.leadFunnel.conversion_rate * 100).toFixed(1)}%</h3>
          <p className="text-xs text-gray-500 mt-2">Out of {metrics.leadFunnel.total_leads} scoped leads</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 p-5 rounded-2xl shadow-lg relative overflow-hidden group hover:border-gray-700 transition">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition">
            <Clock className="w-16 h-16" />
          </div>
          <p className="text-gray-400 text-sm font-medium mb-1">Avg Fulfillment SLA</p>
          <h3 className="text-3xl font-bold text-white">{metrics.deliverySLA.average_days_to_deliver.toFixed(1)} <span className="text-xl text-gray-400 font-normal">days</span></h3>
          <p className="text-xs text-gray-500 mt-2">Average time to delivery</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 p-5 rounded-2xl shadow-lg relative overflow-hidden group hover:border-gray-700 transition">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition">
            <AlertTriangle className="w-16 h-16" />
          </div>
          <p className="text-gray-400 text-sm font-medium mb-1">Total Delays</p>
          <h3 className="text-3xl font-bold text-amber-500">{metrics.deliverySLA.total_delayed_orders}</h3>
          <p className="text-xs text-gray-500 mt-2">Orders exceeding SLA</p>
        </div>
      </div>

      {/* Main Content Grid 1: Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Section 1: Revenue by Branch */}
        <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-lg">
          <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-400" /> Target vs Actual Revenue by Branch
          </h3>
          <div className="h-[350px]">
            {branchChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={branchChartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <XAxis dataKey="branch" stroke="#6b7280" />
                  <YAxis stroke="#6b7280" tickFormatter={(value) => `${value / 10000000}Cr`} />
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', color: '#fff' }}
                    formatter={(value: any) => [`₹${(Number(value) / 10000000).toFixed(2)} Cr`, undefined]}
                  />
                  <Legend />
                  <Bar dataKey="target" name="Target Revenue" fill="#374151" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="actual" name="Actual Revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">No data for selected filters</div>
            )}
          </div>
        </div>

        {/* Section 2: Fulfillment Bottlenecks */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-lg flex flex-col">
          <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-400" /> Delay Bottlenecks
          </h3>
          <div className="flex-1 min-h-[350px]">
            {delayReasonsData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={delayReasonsData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                    {delayReasonsData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', color: '#fff' }} />
                  <Legend verticalAlign="bottom" wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">No delays recorded</div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Grid 2: Drill-down & Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Actionable Insights Feed */}
        <div className="lg:col-span-1 bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-lg flex flex-col h-[500px]">
          <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-400" /> Actionable Insights Feed
          </h3>
          <div className="flex-1 overflow-y-auto pr-2 space-y-4">
            {metrics.alerts?.length > 0 ? (
              metrics.alerts.map((alert: any, idx: number) => (
                <div key={idx} className={`p-4 rounded-xl border ${alert.severity === 'high' ? 'bg-red-900/10 border-red-900/50' : 'bg-amber-900/10 border-amber-900/50'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-2 h-2 rounded-full ${alert.severity === 'high' ? 'bg-red-500 animate-pulse' : 'bg-amber-500'}`} />
                    <span className={`text-sm font-semibold ${alert.severity === 'high' ? 'text-red-400' : 'text-amber-400'}`}>{alert.type}</span>
                  </div>
                  <p className="text-gray-300 text-sm leading-relaxed">{alert.message}</p>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <ShieldCheck className="w-12 h-12 mb-3 text-green-900/50" />
                <p>No critical insights detected.</p>
              </div>
            )}
          </div>
        </div>

        {/* Drill-down: Rep Performance Table */}
        <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-lg h-[500px] flex flex-col">
          <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
            <Users className="w-5 h-5 text-green-400" /> Sales Rep Drill-down Scorecard
          </h3>
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-sm text-gray-400">
              <thead className="text-xs text-gray-500 uppercase bg-gray-950 border-b border-gray-800 sticky top-0">
                <tr>
                  <th className="px-6 py-4 rounded-tl-lg">Sales Rep</th>
                  <th className="px-6 py-4">Branch ID</th>
                  <th className="px-6 py-4">Leads Handled</th>
                  <th className="px-6 py-4">Conversion Rate</th>
                  <th className="px-6 py-4 rounded-tr-lg">Revenue Booked</th>
                </tr>
              </thead>
              <tbody>
                {metrics.salesRepScorecard?.length > 0 ? (
                  metrics.salesRepScorecard
                    .sort((a: any, b: any) => b.total_revenue_booked - a.total_revenue_booked)
                    .map((rep: any) => (
                    <tr key={rep.rep_id} className="border-b border-gray-800 hover:bg-gray-800/50 transition">
                      <td className="px-6 py-4 font-medium text-white">{rep.rep_name}</td>
                      <td className="px-6 py-4"><span className="bg-gray-800 px-2 py-1 rounded text-xs">{rep.branch_id}</span></td>
                      <td className="px-6 py-4">{rep.total_leads_handled}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span>{(rep.conversion_rate * 100).toFixed(1)}%</span>
                          <div className="w-16 h-1.5 bg-gray-800 rounded-full overflow-hidden hidden sm:block">
                            <div className={`h-full ${rep.conversion_rate > 0.2 ? 'bg-green-500' : 'bg-red-500'}`} style={{ width: `${rep.conversion_rate * 100}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-medium text-white">₹{(rep.total_revenue_booked / 100000).toFixed(2)}L</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">No sales reps found for selected filters.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

        {/* Footer */}
        <footer className="mt-8 text-center text-sm text-gray-500 pb-4">
          Built by <a href="https://manojtalks.in" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Manoj Kumar Kakarla</a>
        </footer>
      </div>

      {/* Floating Chat Widget */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
        {isChatOpen && (
          <div className="mb-4 w-96 max-w-[calc(100vw-3rem)] h-[600px] max-h-[80vh] bg-gray-950 border border-gray-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-5">
            <div className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center justify-between">
              <h3 className="text-md font-semibold text-white flex items-center gap-2">
                <Bot className="w-4 h-4 text-purple-400" /> Intelligence Engine
              </h3>
              <button 
                onClick={() => setIsChatOpen(false)}
                className="text-gray-400 hover:text-white p-1 rounded-md hover:bg-gray-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-gray-900/50 to-gray-950">
              {chatHistory.map((msg, i) => (
                <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'ai' && (
                    <div className="w-7 h-7 rounded-full bg-purple-900/50 flex items-center justify-center shrink-0 border border-purple-700/50">
                      <Bot className="w-3 h-3 text-purple-400" />
                    </div>
                  )}
                  
                  <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                    msg.role === 'user' 
                      ? 'bg-blue-600 text-white rounded-tr-sm' 
                      : 'bg-gray-800/80 border border-gray-700 text-gray-200 rounded-tl-sm'
                  }`}>
                    {msg.content.split('\n').map((line, j) => (
                      <p key={j} className="mb-2 last:mb-0" dangerouslySetInnerHTML={{ 
                        __html: line
                          .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>')
                          .replace(/^- (.*)/g, '<li class="ml-4">$1</li>') 
                      }} />
                    ))}
                  </div>

                  {msg.role === 'user' && (
                    <div className="w-7 h-7 rounded-full bg-blue-900/50 flex items-center justify-center shrink-0 border border-blue-700/50">
                      <User className="w-3 h-3 text-blue-400" />
                    </div>
                  )}
                </div>
              ))}
              {isChatLoading && (
                <div className="flex gap-3 justify-start">
                  <div className="w-7 h-7 rounded-full bg-purple-900/50 flex items-center justify-center shrink-0 border border-purple-700/50">
                    <Bot className="w-3 h-3 text-purple-400" />
                  </div>
                  <div className="bg-gray-800/80 border border-gray-700 text-gray-400 rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1 items-center h-[44px]">
                    <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
            </div>

            <div className="p-3 bg-gray-900 border-t border-gray-800">
              <form onSubmit={handleChatSubmit} className="relative flex items-center">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask about delays or reps..."
                  className="w-full bg-gray-950 border border-gray-700 text-white text-sm rounded-full pl-4 pr-12 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all placeholder:text-gray-500"
                />
                <button
                  type="submit"
                  disabled={isChatLoading || !chatInput.trim()}
                  className="absolute right-1.5 p-1.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:hover:bg-purple-600 rounded-full text-white transition-colors flex items-center justify-center"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          </div>
        )}

        {/* FAB Toggle Button */}
        <div className="relative flex items-center justify-center mt-4">
          {!isChatOpen && (
            <>
              {/* Callout Bubble */}
              <div className="absolute right-[calc(100%+16px)] top-1/2 -translate-y-1/2 bg-purple-600 text-white text-sm font-semibold px-4 py-2 rounded-xl shadow-lg whitespace-nowrap animate-bounce" style={{ animationDuration: '2.5s' }}>
                Ask AI for Analysis ✨
                <div className="absolute top-1/2 -right-1 -translate-y-1/2 w-3 h-3 bg-purple-600 rotate-45 rounded-sm"></div>
              </div>
              
              {/* Ping Ring */}
              <div className="absolute inset-0 rounded-full bg-purple-500 animate-ping opacity-20" style={{ animationDuration: '2s' }}></div>
            </>
          )}
          
          <button
            onClick={() => setIsChatOpen(!isChatOpen)}
            className={`relative z-10 flex items-center justify-center w-14 h-14 rounded-full shadow-2xl transition-all duration-300 hover:scale-110 ${
              isChatOpen 
                ? "bg-gray-800 text-gray-400 border border-gray-700" 
                : "bg-gradient-to-tr from-purple-700 to-purple-500 text-white shadow-[0_0_30px_rgba(168,85,247,0.5)]"
            }`}
          >
            {isChatOpen ? <X className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
          </button>
        </div>
      </div>

    </div>
  );
}
