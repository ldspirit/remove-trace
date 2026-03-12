"use client";

import { useState, useEffect } from "react";

interface Stats {
  friends: {
    total: number;
    not_started: number;
    in_progress: number;
    completed: number;
    unfriend_ready: number;
    unfriended: number;
    blocked: number;
  };
  items: {
    total: number;
    completed: number;
    skipped: number;
    review_later: number;
    pending: number;
  };
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  const colorClasses: Record<string, string> = {
    slate: "bg-white border-slate-200 text-slate-800",
    gray: "bg-slate-50 border-slate-200 text-slate-700",
    yellow: "bg-yellow-50 border-yellow-200 text-yellow-800",
    green: "bg-green-50 border-green-200 text-green-800",
    blue: "bg-blue-50 border-blue-200 text-blue-800",
    purple: "bg-purple-50 border-purple-200 text-purple-800",
    red: "bg-red-50 border-red-200 text-red-800",
    orange: "bg-orange-50 border-orange-200 text-orange-800",
    amber: "bg-amber-50 border-amber-200 text-amber-800",
  };

  return (
    <div
      className={`rounded-xl border p-5 ${colorClasses[color] || colorClasses.slate}`}
    >
      <p className="text-sm font-medium opacity-70 mb-1">{label}</p>
      <p className="text-3xl font-bold">{value}</p>
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/stats");
        const data = await res.json();
        setStats(data);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-400">Loading...</div>
    );
  }

  const friends = stats?.friends || {
    total: 0,
    not_started: 0,
    in_progress: 0,
    completed: 0,
    unfriend_ready: 0,
    unfriended: 0,
    blocked: 0,
  };
  const items = stats?.items || {
    total: 0,
    completed: 0,
    skipped: 0,
    review_later: 0,
    pending: 0,
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
        <div className="flex gap-2">
          <a
            href="/api/export?format=json"
            download
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
          >
            Export JSON
          </a>
          <a
            href="/api/export?format=csv"
            download
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
          >
            Export CSV
          </a>
        </div>
      </div>

      {/* Friend Stats */}
      <h2 className="text-lg font-semibold text-slate-700 mb-4">Friend Progress</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-10">
        <StatCard label="Total" value={friends.total} color="slate" />
        <StatCard label="Not Started" value={friends.not_started} color="gray" />
        <StatCard label="In Progress" value={friends.in_progress} color="yellow" />
        <StatCard label="Completed" value={friends.completed} color="green" />
        <StatCard label="Unfriend Ready" value={friends.unfriend_ready} color="blue" />
        <StatCard label="Unfriended" value={friends.unfriended} color="purple" />
        <StatCard label="Blocked" value={friends.blocked} color="red" />
      </div>

      {/* Item Stats */}
      <h2 className="text-lg font-semibold text-slate-700 mb-4">Item Progress</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard label="Total Items" value={items.total} color="slate" />
        <StatCard label="Completed" value={items.completed} color="green" />
        <StatCard label="Skipped" value={items.skipped} color="orange" />
        <StatCard label="Review Later" value={items.review_later} color="amber" />
        <StatCard label="Remaining" value={items.pending} color="blue" />
      </div>
    </div>
  );
}
