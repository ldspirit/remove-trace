"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { StatusBadge } from "@/components/StatusBadge";

interface ActivityItem {
  id: number;
  type: string;
  contentPreview: string;
  facebookUrl: string;
  interactionDate: string | null;
  status: string;
}

interface Friend {
  id: number;
  name: string;
  profileUrl: string;
  status: string;
}

export default function CleanupQueuePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [friend, setFriend] = useState<Friend | null>(null);
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [allDone, setAllDone] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [friendRes, itemsRes] = await Promise.all([
      fetch(`/api/friends/${id}`),
      fetch(`/api/friends/${id}/items?status=pending`),
    ]);
    const friendData = await friendRes.json();
    const itemsData = await itemsRes.json();
    setFriend(friendData);
    const itemsList = Array.isArray(itemsData) ? itemsData : itemsData.items || [];
    setItems(itemsList);
    if (itemsList.length === 0) setAllDone(true);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAction = async (action: "completed" | "skipped" | "review_later") => {
    const currentItem = items[currentIndex];
    if (!currentItem) return;

    await fetch(`/api/items/${currentItem.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: action }),
    });

    if (currentIndex + 1 >= items.length) {
      setAllDone(true);
    } else {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handleMarkUnfriendReady = async () => {
    await fetch(`/api/friends/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "unfriend_ready" }),
    });
    router.push(`/friends/${id}/unfriend`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-400">Loading...</div>
    );
  }

  if (allDone) {
    return (
      <div className="max-w-lg mx-auto mt-20 text-center">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-10">
          <div className="text-5xl mb-4">&#10003;</div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">All Items Cleaned!</h2>
          <p className="text-slate-500 mb-8">
            You have processed all pending items for {friend?.name}.
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={handleMarkUnfriendReady}
              className="px-6 py-3 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              Mark Ready to Unfriend
            </button>
            <Link
              href={`/friends/${id}`}
              className="px-6 py-3 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200"
            >
              Back to Friend Detail
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const currentItem = items[currentIndex];
  const progress = items.length > 0 ? ((currentIndex) / items.length) * 100 : 0;

  return (
    <div className="max-w-2xl mx-auto">
      <Link
        href={`/friends/${id}`}
        className="text-sm text-blue-600 hover:text-blue-800 mb-4 inline-block"
      >
        &larr; Back to {friend?.name}
      </Link>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Cleanup Queue</h1>
        <p className="text-slate-500 mt-1">{friend?.name}</p>
      </div>

      {/* Progress */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-sm text-slate-600 mb-2">
          <span>
            Item {currentIndex + 1} of {items.length}
          </span>
          <span>{Math.round(progress)}% complete</span>
        </div>
        <div className="w-full bg-slate-200 rounded-full h-2.5">
          <div
            className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Current Item Card */}
      {currentItem && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="inline-flex px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 capitalize">
              {currentItem.type}
            </span>
            <StatusBadge status={currentItem.status} />
          </div>

          {currentItem.contentPreview && (
            <p className="text-slate-700 text-lg mb-4">{currentItem.contentPreview}</p>
          )}

          {currentItem.interactionDate && (
            <p className="text-sm text-slate-400 mb-6">
              Date: {new Date(currentItem.interactionDate).toLocaleDateString()}
            </p>
          )}

          {currentItem.facebookUrl && (
            <a
              href={currentItem.facebookUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 mb-6"
            >
              Open on Facebook
            </a>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={() => handleAction("completed")}
          className="flex-1 px-4 py-3 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700"
        >
          Mark Completed
        </button>
        <button
          onClick={() => handleAction("skipped")}
          className="flex-1 px-4 py-3 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
        >
          Skip
        </button>
        <button
          onClick={() => handleAction("review_later")}
          className="flex-1 px-4 py-3 text-sm font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100"
        >
          Review Later
        </button>
      </div>
    </div>
  );
}
