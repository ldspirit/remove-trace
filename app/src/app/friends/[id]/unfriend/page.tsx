"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface Friend {
  id: number;
  name: string;
  profileUrl: string;
  status: string;
  unfriendedAt: string | null;
  blockedAt: string | null;
}

export default function UnfriendPage() {
  const params = useParams();
  const id = params.id as string;
  const [friend, setFriend] = useState<Friend | null>(null);
  const [step, setStep] = useState<"unfriend" | "block" | "done">("unfriend");
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [friendRes, itemsRes] = await Promise.all([
      fetch(`/api/friends/${id}`),
      fetch(`/api/friends/${id}/items?status=pending`),
    ]);
    const friendData = await friendRes.json();
    const itemsData = await itemsRes.json();
    const itemsList = Array.isArray(itemsData) ? itemsData : itemsData.items || [];
    setFriend(friendData);
    setPendingCount(itemsList.length);

    if (friendData.blockedAt) {
      setStep("done");
    } else if (friendData.unfriendedAt) {
      setStep("block");
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleUnfriend = async () => {
    await fetch(`/api/friends/${id}/unfriend`, { method: "POST" });
    setStep("block");
    fetchData();
  };

  const handleBlock = async () => {
    await fetch(`/api/friends/${id}/block`, { method: "POST" });
    setStep("done");
    fetchData();
  };

  if (loading || !friend) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-400">Loading...</div>
    );
  }

  if (step === "done") {
    return (
      <div className="max-w-lg mx-auto mt-20 text-center">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-10">
          <div className="text-5xl mb-4 text-green-600">&#10003;</div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Complete!</h2>
          <p className="text-slate-500 mb-8">
            {friend.name} has been unfriended and blocked successfully.
          </p>
          <Link
            href="/friends"
            className="inline-flex px-6 py-3 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            Back to Friends List
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto mt-10">
      <Link
        href={`/friends/${id}`}
        className="text-sm text-blue-600 hover:text-blue-800 mb-4 inline-block"
      >
        &larr; Back to {friend.name}
      </Link>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
        {step === "unfriend" && (
          <>
            <h2 className="text-xl font-bold text-slate-800 mb-2">
              Step 1: Unfriend {friend.name}
            </h2>
            <div className="flex items-center gap-2 mb-6">
              <span className="inline-flex px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                {pendingCount} pending items
              </span>
            </div>
            <p className="text-slate-600 mb-6">
              Open their Facebook profile and unfriend them. Once done, click the
              confirmation button below.
            </p>
            <div className="flex flex-col gap-3">
              <a
                href={friend.profileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-3 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 text-center"
              >
                Open Facebook Profile
              </a>
              <button
                onClick={handleUnfriend}
                className="px-5 py-3 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700"
              >
                I Unfriended Them
              </button>
            </div>
          </>
        )}

        {step === "block" && (
          <>
            <h2 className="text-xl font-bold text-slate-800 mb-2">
              Step 2: Block {friend.name}
            </h2>
            <p className="text-slate-600 mb-6">
              Open their Facebook profile, go to the &quot;...&quot; menu, and select
              &quot;Block.&quot; Once done, click the confirmation button below.
            </p>
            <div className="flex flex-col gap-3">
              <a
                href={friend.profileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-3 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 text-center"
              >
                Open Facebook Profile
              </a>
              <button
                onClick={handleBlock}
                className="px-5 py-3 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
              >
                I Blocked Them
              </button>
            </div>
          </>
        )}
      </div>

      {/* Progress indicator */}
      <div className="flex items-center justify-center gap-3 mt-8">
        <div
          className={`w-3 h-3 rounded-full ${
            step === "unfriend" ? "bg-blue-600" : "bg-green-500"
          }`}
        />
        <div className="w-8 h-0.5 bg-slate-300" />
        <div
          className={`w-3 h-3 rounded-full ${
            step === "block" ? "bg-blue-600" : "bg-slate-300"
          }`}
        />
      </div>
      <div className="flex items-center justify-center gap-12 mt-2 text-xs text-slate-500">
        <span>Unfriend</span>
        <span>Block</span>
      </div>
    </div>
  );
}
