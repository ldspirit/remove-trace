"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { StatusBadge } from "@/components/StatusBadge";
import { Modal } from "@/components/Modal";

interface Friend {
  id: number;
  name: string;
  profileUrl: string;
  status: string;
  priority: number;
  notes: string;
  unfriendedAt: string | null;
  blockedAt: string | null;
  _count?: { activityItems: number };
  itemsDone?: number;
  totalItems?: number;
}

const priorityLabels: Record<number, string> = { 1: "High", 2: "Medium", 3: "Low" };
const statusOptions = [
  "All", "not_started", "in_progress", "completed",
  "unfriend_ready", "unfriended", "blocked",
];
const statusLabels: Record<string, string> = {
  All: "All Statuses",
  not_started: "Not Started",
  in_progress: "In Progress",
  completed: "Completed",
  unfriend_ready: "Unfriend Ready",
  unfriended: "Unfriended",
  blocked: "Blocked",
};

export default function FriendsPage() {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  // Add friend form state
  const [formName, setFormName] = useState("");
  const [formUrl, setFormUrl] = useState("");
  const [formPriority, setFormPriority] = useState(2);
  const [formNotes, setFormNotes] = useState("");
  const [importText, setImportText] = useState("");

  const fetchFriends = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (statusFilter !== "All") params.set("status", statusFilter);
    if (priorityFilter !== "All") params.set("priority", priorityFilter);
    try {
      const res = await fetch(`/api/friends?${params.toString()}`);
      const data = await res.json();
      setFriends(Array.isArray(data) ? data : data.friends || []);
    } catch {
      setFriends([]);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, priorityFilter]);

  useEffect(() => {
    const timer = setTimeout(fetchFriends, 300);
    return () => clearTimeout(timer);
  }, [fetchFriends]);

  const handleAddFriend = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/friends", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: formName,
        profileUrl: formUrl,
        priority: formPriority,
        notes: formNotes,
      }),
    });
    setFormName("");
    setFormUrl("");
    setFormPriority(2);
    setFormNotes("");
    setAddOpen(false);
    fetchFriends();
  };

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    const lines = importText
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    for (const line of lines) {
      const parts = line.split(/\s+/);
      const url = parts.pop() || "";
      const name = parts.join(" ") || url;
      await fetch("/api/friends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, profileUrl: url, priority: 2, notes: "" }),
      });
    }
    setImportText("");
    setImportOpen(false);
    fetchFriends();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Friends</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setImportOpen(true)}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
          >
            Import
          </button>
          <button
            onClick={() => setAddOpen(true)}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            Add Friend
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <input
          type="text"
          placeholder="Search friends..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-4 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {statusOptions.map((s) => (
            <option key={s} value={s}>
              {statusLabels[s]}
            </option>
          ))}
        </select>
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="px-4 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="All">All Priorities</option>
          <option value="1">High</option>
          <option value="2">Medium</option>
          <option value="3">Low</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-4 py-3 font-medium text-slate-600">Name</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Status</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Priority</th>
              <th className="text-center px-4 py-3 font-medium text-slate-600">Items</th>
              <th className="text-center px-4 py-3 font-medium text-slate-600">Done</th>
              <th className="text-center px-4 py-3 font-medium text-slate-600">Unfriended</th>
              <th className="text-center px-4 py-3 font-medium text-slate-600">Blocked</th>
              <th className="text-right px-4 py-3 font-medium text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                  Loading...
                </td>
              </tr>
            ) : friends.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                  No friends found. Add one to get started.
                </td>
              </tr>
            ) : (
              friends.map((f) => (
                <tr
                  key={f.id}
                  className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                >
                  <td className="px-4 py-3 font-medium text-slate-800">{f.name}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={f.status} />
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {priorityLabels[f.priority] || "Medium"}
                  </td>
                  <td className="px-4 py-3 text-center text-slate-600">
                    {f.totalItems ?? f._count?.activityItems ?? 0}
                  </td>
                  <td className="px-4 py-3 text-center text-slate-600">
                    {f.itemsDone ?? 0}
                  </td>
                  <td className="px-4 py-3 text-center text-slate-600">
                    {f.unfriendedAt ? "Yes" : "-"}
                  </td>
                  <td className="px-4 py-3 text-center text-slate-600">
                    {f.blockedAt ? "Yes" : "-"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/friends/${f.id}`}
                        className="px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100"
                      >
                        Open
                      </Link>
                      <Link
                        href={`/friends/${f.id}/queue`}
                        className="px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 rounded-lg hover:bg-green-100"
                      >
                        Start Queue
                      </Link>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Friend Modal */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add Friend">
        <form onSubmit={handleAddFriend} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
            <input
              required
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Profile URL
            </label>
            <input
              required
              value={formUrl}
              onChange={(e) => setFormUrl(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://facebook.com/..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Priority</label>
            <select
              value={formPriority}
              onChange={(e) => setFormPriority(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={1}>High</option>
              <option value={2}>Medium</option>
              <option value={3}>Low</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
            <textarea
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setAddOpen(false)}
              className="px-4 py-2 text-sm text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              Add Friend
            </button>
          </div>
        </form>
      </Modal>

      {/* Import Modal */}
      <Modal open={importOpen} onClose={() => setImportOpen(false)} title="Import Friends">
        <form onSubmit={handleImport} className="space-y-4">
          <p className="text-sm text-slate-500">
            Paste one friend per line. Format: <code>Name https://facebook.com/profile</code>
          </p>
          <textarea
            required
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            rows={8}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder={"John Doe https://facebook.com/johndoe\nJane Smith https://facebook.com/janesmith"}
          />
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setImportOpen(false)}
              className="px-4 py-2 text-sm text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              Import
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
