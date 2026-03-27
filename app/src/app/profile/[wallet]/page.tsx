"use client";

import { useParams } from "next/navigation";
import { useUserProfile } from "@/hooks/useUserProfile";
import KarmaDisplay from "@/components/KarmaDisplay";
import PositionHistory from "@/components/PositionHistory";

function shortAddr(addr: string): string {
  return addr.slice(0, 6) + "..." + addr.slice(-4);
}

export default function ProfilePage() {
  const params = useParams();
  const walletAddr = params?.wallet as string | undefined;
  const { profile, positions, loading, error } = useUserProfile(walletAddr);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="card animate-pulse space-y-4">
          <div className="h-6 bg-bg-tertiary rounded w-1/3" />
          <div className="h-48 bg-bg-tertiary rounded" />
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="text-center py-16">
        <h2 className="text-xl font-semibold text-text-primary mb-2">
          Profile not found
        </h2>
        <p className="text-text-muted">
          {error || "This user may not have initialized their profile yet."}
        </p>
        {walletAddr && (
          <p className="text-text-muted mt-2 font-mono text-sm">
            {shortAddr(walletAddr)}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-text-primary">Profile</h1>
        <p className="text-text-muted font-mono mt-1">
          {walletAddr ? shortAddr(walletAddr) : "Unknown"}
        </p>
        {profile.penalties > 0 && (
          <span className="badge bg-accent-red-dim text-accent-red mt-2">
            {profile.penalties} penalties
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <KarmaDisplay profile={profile} />
        </div>
        <div className="lg:col-span-2">
          <PositionHistory positions={positions} />
        </div>
      </div>
    </div>
  );
}
