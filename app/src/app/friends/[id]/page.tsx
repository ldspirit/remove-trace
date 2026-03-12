"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
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
}

interface ActivityItem {
  id: number;
  type: string;
  contentPreview: string;
  facebookUrl: string;
  interactionDate: string | null;
  status: string;
  notes: string;
}

const tabs = ["All", "post", "comment", "like", "tag", "reaction", "mention"];
const tabLabels: Record<string, string> = {
  All: "All",
  post: "Posts",
  comment: "Comments",
  like: "Likes",
  tag: "Tags",
  reaction: "Reactions",
  mention: "Mentions",
};

export default function FriendDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [friend, setFriend] = useState<Friend | null>(null);
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [activeTab, setActiveTab] = useState("All");
  const [loading, setLoading] = useState(true);
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);

  // Add item form
  const [itemType, setItemType] = useState("post");
  const [itemPreview, setItemPreview] = useState("");
  const [itemUrl, setItemUrl] = useState("");
  const [itemDate, setItemDate] = useState("");
  const [bulkText, setBulkText] = useState("");

  const fetchFriend = useCallback(async () => {
    const res = await fetch(`/api/friends/${id}`);
    const data = await res.json();
    setFriend(data);
  }, [id]);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (activeTab !== "All") params.set("type", activeTab);
    const res = await fetch(`/api/friends/${id}/items?${params.toString()}`);
    const data = await res.json();
    setItems(Array.isArray(data) ? data : data.items || []);
    setLoading(false);
  }, [id, activeTab]);

  useEffect(() => {
    fetchFriend();
  }, [fetchFriend]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleMarkDone = async (itemId: number) => {
    await fetch(`/api/items/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "completed" }),
    });
    fetchItems();
  };

  const handleSkip = async (itemId: number) => {
    await fetch(`/api/items/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "skipped" }),
    });
    fetchItems();
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch(`/api/friends/${id}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: itemType,
        contentPreview: itemPreview,
        facebookUrl: itemUrl,
        interactionDate: itemDate || null,
      }),
    });
    setItemType("post");
    setItemPreview("");
    setItemUrl("");
    setItemDate("");
    setAddItemOpen(false);
    fetchItems();
  };

  const handleBulkPaste = async (e: React.FormEvent) => {
    e.preventDefault();
    const urls = bulkText
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    for (const url of urls) {
      await fetch(`/api/friends/${id}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "post",
          contentPreview: "",
          facebookUrl: url,
        }),
      });
    }
    setBulkText("");
    setBulkOpen(false);
    fetchItems();
  };

  const totalItems = items.length;
  const completedItems = items.filter((i) => i.status === "completed").length;
  const pendingItems = items.filter((i) => i.status === "pending").length;

  if (!friend) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-400">
        Loading...
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/friends"
          className="text-sm text-blue-600 hover:text-blue-800 mb-2 inline-block"
        >
          &larr; Back to Friends
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
              {friend.name}
              <StatusBadge status={friend.status} />
            </h1>
            <a
              href={friend.profileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:underline mt-1 inline-block"
            >
              {friend.profileUrl}
            </a>
          </div>
          <div className="flex gap-3 text-sm">
            <span className="px-3 py-1 bg-slate-100 rounded-lg text-slate-600">
              {totalItems} items
            </span>
            <span className="px-3 py-1 bg-green-50 rounded-lg text-green-700">
              {completedItems} done
            </span>
            <span className="px-3 py-1 bg-yellow-50 rounded-lg text-yellow-700">
              {pendingItems} pending
            </span>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-2 mb-6">
        <Link
          href={`/friends/${id}/queue`}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
        >
          Start Cleanup Queue
        </Link>
        <a
          href={friend.profileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
        >
          Open Facebook Profile
        </a>
        <button
          onClick={() => setAddItemOpen(true)}
          className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
        >
          Add Item
        </button>
        <button
          onClick={() => setBulkOpen(true)}
          className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
        >
          Bulk Paste URLs
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-slate-200">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? "border-blue-600 text-blue-700"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {tabLabels[tab]}
          </button>
        ))}
      </div>

      {/* Items table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-4 py-3 font-medium text-slate-600">Type</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Preview</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Date</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Status</th>
              <th className="text-right px-4 py-3 font-medium text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                  Loading...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                  No items found. Add some to track cleanup progress.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                >
                  <td className="px-4 py-3">
                    <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 capitalize">
                      {item.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600 max-w-xs truncate">
                    {item.contentPreview || "-"}
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {item.interactionDate
                      ? new Date(item.interactionDate).toLocaleDateString()
                      : "-"}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={item.status} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {item.facebookUrl && (
                        <a
                          href={item.facebookUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2 py-1 text-xs text-blue-700 bg-blue-50 rounded hover:bg-blue-100"
                        >
                          Open FB
                        </a>
                      )}
                      {item.status === "pending" && (
                        <>
                          <button
                            onClick={() => handleMarkDone(item.id)}
                            className="px-2 py-1 text-xs text-green-700 bg-green-50 rounded hover:bg-green-100"
                          >
                            Done
                          </button>
                          <button
                            onClick={() => handleSkip(item.id)}
                            className="px-2 py-1 text-xs text-orange-700 bg-orange-50 rounded hover:bg-orange-100"
                          >
                            Skip
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Item Modal */}
      <Modal open={addItemOpen} onClose={() => setAddItemOpen(false)} title="Add Activity Item">
        <form onSubmit={handleAddItem} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
            <select
              value={itemType}
              onChange={(e) => setItemType(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="post">Post</option>
              <option value="comment">Comment</option>
              <option value="like">Like</option>
              <option value="tag">Tag</option>
              <option value="reaction">Reaction</option>
              <option value="mention">Mention</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Content Preview
            </label>
            <input
              value={itemPreview}
              onChange={(e) => setItemPreview(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Brief description of the content"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Facebook URL
            </label>
            <input
              value={itemUrl}
              onChange={(e) => setItemUrl(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://facebook.com/..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Interaction Date
            </label>
            <input
              type="date"
              value={itemDate}
              onChange={(e) => setItemDate(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setAddItemOpen(false)}
              className="px-4 py-2 text-sm text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              Add Item
            </button>
          </div>
        </form>
      </Modal>

      {/* Bulk Paste Modal */}
      <Modal open={bulkOpen} onClose={() => setBulkOpen(false)} title="Bulk Paste URLs">
        <form onSubmit={handleBulkPaste} className="space-y-4">
          <p className="text-sm text-slate-500">Paste one Facebook URL per line.</p>
          <textarea
            required
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            rows={8}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder={"https://facebook.com/post/123\nhttps://facebook.com/post/456"}
          />
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setBulkOpen(false)}
              className="px-4 py-2 text-sm text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              Import URLs
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
