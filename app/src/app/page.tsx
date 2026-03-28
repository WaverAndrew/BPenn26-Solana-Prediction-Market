"use client";

import {
  useState,
  useEffect,
  useLayoutEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import Link from "next/link";
import { useAnchorCompatibleWallet } from "@/hooks/useAnchorCompatibleWallet";
import { fetchFeed, MarketData } from "@/lib/api";
import { useEvidence } from "@/hooks/useEvidence";
import EvidenceThread from "@/components/EvidenceThread";
import { getProgram } from "@/lib/program";
import {
  getConfigPda,
  getMarketPda,
  getVaultPda,
  getPositionPda,
} from "@/lib/pda";
import * as anchor from "@coral-xyz/anchor";

// ─── Category config ────────────────────────────────────────────────────────

const CATEGORIES = [
  {
    label: "Politics",
    emoji: "🏛️",
    gradient: "from-blue-950 via-blue-800 to-indigo-900",
    orb1: "bg-blue-500",
    orb2: "bg-indigo-400",
    accent: "#3b82f6",
    videoKeyword: "politics",
  },
  {
    label: "Sports",
    emoji: "⚽",
    gradient: "from-green-950 via-emerald-800 to-teal-900",
    orb1: "bg-emerald-500",
    orb2: "bg-teal-400",
    accent: "#10b981",
    videoKeyword: "sports",
  },
  {
    label: "Crypto",
    emoji: "₿",
    gradient: "from-orange-950 via-amber-800 to-yellow-900",
    orb1: "bg-orange-500",
    orb2: "bg-amber-400",
    accent: "#f97316",
    videoKeyword: "solana",
  },
  {
    label: "Entertainment",
    emoji: "🎬",
    gradient: "from-pink-950 via-rose-800 to-red-900",
    orb1: "bg-pink-500",
    orb2: "bg-rose-400",
    accent: "#ec4899",
    videoKeyword: "entertainment",
  },
  {
    label: "Science",
    emoji: "🔬",
    gradient: "from-purple-950 via-violet-800 to-indigo-900",
    orb1: "bg-purple-500",
    orb2: "bg-violet-400",
    accent: "#8b5cf6",
    videoKeyword: "gpt",
  },
  {
    label: "Other",
    emoji: "🌐",
    gradient: "from-slate-900 via-gray-800 to-zinc-900",
    orb1: "bg-slate-500",
    orb2: "bg-gray-400",
    accent: "#64748b",
    videoKeyword: "world",
  },
];

import { DEMO_MARKETS } from "@/lib/demo-data";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function lamportsToSol(lamports: number) {
  return (lamports / 1e9).toFixed(2);
}

function calcOdds(yes: number, no: number) {
  const total = yes + no;
  if (total === 0) return { yesPct: 50, noPct: 50 };
  return {
    yesPct: Math.round((yes / total) * 100),
    noPct: Math.round((no / total) * 100),
  };
}

function timeLeft(expiry: number) {
  const diff = expiry - Date.now() / 1000;
  if (diff <= 0) return "Expired";
  if (diff < 3600) return `${Math.floor(diff / 60)}m left`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h left`;
  return `${Math.floor(diff / 86400)}d left`;
}

function shortClaim(text: string, max = 80) {
  return text.length > max ? text.slice(0, max).trimEnd() + "…" : text;
}

/** Evidence / comments — only mounted when the sheet is open (lazy fetch). */
function FeedEvidenceSheet({
  marketId,
  evidenceCount,
  onClose,
}: {
  marketId: number;
  evidenceCount: number;
  onClose: () => void;
}) {
  const { tree, loading, refetch } = useEvidence(marketId);

  return (
    <div className="flex h-full min-h-0 flex-col rounded-t-2xl border border-b-0 border-white/10 bg-slate-950/95 shadow-[0_-12px_40px_rgba(0,0,0,0.45)] backdrop-blur-md">
      <div className="flex flex-shrink-0 items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-white">Discussion</p>
          <p className="text-xs text-white/50">{evidenceCount} evidence</p>
        </div>
        <div className="flex items-center gap-1">
          <Link
            href={`/markets/${marketId}`}
            className="rounded-lg px-2 py-1.5 text-xs font-medium text-indigo-400 hover:bg-white/5 hover:text-indigo-300"
          >
            Full page
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-xl leading-none text-white hover:bg-white/20"
            aria-label="Close discussion"
          >
            ×
          </button>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-3 py-3 touch-pan-y">
        {loading ? (
          <div className="space-y-3 animate-pulse">
            <div className="h-20 rounded-xl bg-white/5" />
            <div className="h-20 rounded-xl bg-white/5" />
            <div className="h-20 rounded-xl bg-white/5" />
          </div>
        ) : (
          <EvidenceThread tree={tree} onStaked={refetch} />
        )}
      </div>
    </div>
  );
}

// ─── Single Market Card ───────────────────────────────────────────────────────

interface CardProps {
  market: MarketData;
  active: boolean;
}

function MarketCard({ market, active }: CardProps) {
  const wallet = useAnchorCompatibleWallet();
  const cat = CATEGORIES[Math.min(market.category, CATEGORIES.length - 1)];
  const { yesPct, noPct } = calcOdds(market.yesPool, market.noPool);
  const total = market.yesPool + market.noPool;
  const claim = market.claimText || market.claimUri;

  const [betAmount, setBetAmount] = useState(0.1);
  const [placing, setPlacing] = useState<"yes" | "no" | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [showBetInput, setShowBetInput] = useState(false);
  const [betSide, setBetSide] = useState<"yes" | "no">("yes");
  const [muted, setMuted] = useState(true);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [videoAttempt, setVideoAttempt] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [hearts, setHearts] = useState<{ id: number; x: number; y: number }[]>([]);
  const heartIdRef = useRef(0);

  const videoCandidates = useMemo(() => {
    const paths = (stem: string) => [
      `/videos/${stem}.mov`,
      `/videos/${stem}.mp4`,
    ];
    return [...paths(`market-${market.id}`), ...paths(cat.videoKeyword)];
  }, [market.id, cat.videoKeyword]);
  const videoSrc = videoCandidates[videoAttempt];

  useEffect(() => {
    if (!active) setCommentsOpen(false);
  }, [active]);

  // Layout effect: ref is attached; play/pause before paint (programmatic play + autoplay policies)
  useLayoutEffect(() => {
    const el = videoRef.current;
    if (!el || videoSrc === undefined) return;
    if (active) {
      void el.play().catch(() => {});
    } else {
      el.pause();
    }
  }, [active, videoSrc, videoAttempt]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleBet = useCallback(
    async (side: "yes" | "no") => {
      if (!wallet) {
        showToast("Connect wallet first");
        return;
      }
      setBetSide(side);
      setShowBetInput(true);
    },
    [wallet]
  );

  const confirmBet = useCallback(async () => {
    if (!wallet) {
      showToast("Connect wallet first");
      return;
    }
    const side = betSide;
    setPlacing(side);
    setShowBetInput(false);
    try {
      const program = getProgram(wallet);
      const [configPda] = getConfigPda();
      const [marketPda] = getMarketPda(market.id);
      const [vaultPda] = getVaultPda(market.id);
      const [positionPda] = getPositionPda(market.id, wallet.publicKey);
      const lamports = Math.round(betAmount * 1e9);
      const sig = await (program.methods as any)
        .placeBet(side === "yes" ? 0 : 1, new anchor.BN(lamports))
        .accounts({
          bettor: wallet.publicKey,
          config: configPda,
          market: marketPda,
          marketVault: vaultPda,
          position: positionPda,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();
      showToast(`✅ ${betAmount} SOL on ${side.toUpperCase()} — ${sig.slice(0, 8)}…`);
    } catch (e: any) {
      // Extract the most useful part: Anchor error code > logs > raw message
      const msg: string =
        e?.error?.errorMessage ??
        e?.logs?.find((l: string) => l.includes("Error"))?.slice(0, 80) ??
        e?.message?.slice(0, 100) ??
        "Transaction failed";
      showToast(`❌ ${msg}`);
      console.error("placeBet error:", e);
    } finally {
      setPlacing(null);
    }
  }, [wallet, betSide, betAmount, market.id]);

  return (
    <div className="relative flex h-full w-full flex-shrink-0 flex-col overflow-hidden">
      {/* ── Top: video stage (full height, or ~40% when discussion is open — TikTok-style) ── */}
      <div
        ref={stageRef}
        onDoubleClick={(e) => {
          const rect = stageRef.current?.getBoundingClientRect();
          if (rect) {
            const id = ++heartIdRef.current;
            setHearts((h) => [...h, { id, x: e.clientX - rect.left, y: e.clientY - rect.top }]);
            setTimeout(() => setHearts((h) => h.filter((v) => v.id !== id)), 950);
          }
          handleBet("yes");
        }}
        className={`relative z-0 min-h-0 overflow-hidden transition-[height,flex-grow] duration-300 ease-out ${
          commentsOpen
            ? "h-[38%] max-h-[min(320px,48vh)] min-h-[154px] flex-shrink-0"
            : "flex-1"
        }`}
      >
        {/* ── Gradient fallback (always rendered behind video) ── */}
        <div
          className={`absolute inset-0 bg-gradient-to-br ${cat.gradient} market-bg`}
        />
        <div className={`absolute top-1/4 -left-24 w-72 h-72 ${cat.orb1} rounded-full blur-3xl opacity-20 glow-orb`} />
        <div className={`absolute bottom-1/3 -right-20 w-80 h-80 ${cat.orb2} rounded-full blur-3xl opacity-15 glow-orb-delay`} />

        {/* ── Background video: keeps playing; letterboxed in shrunken stage ── */}
        {videoSrc !== undefined && (
          <div className="absolute inset-0 z-0 flex items-center justify-center">
            <video
              ref={videoRef}
              key={`${market.id}-${videoAttempt}`}
              className="aspect-video max-h-full max-w-full object-contain"
              src={videoSrc}
              muted={muted}
              autoPlay={active}
              loop
              playsInline
              onCanPlay={(e) => {
                if (active) void e.currentTarget.play().catch(() => {});
              }}
              onError={() =>
                setVideoAttempt((a) =>
                  Math.min(a + 1, videoCandidates.length)
                )
              }
            />
          </div>
        )}

        {/* Double-tap hearts */}
        {hearts.map((h) => (
          <span
            key={h.id}
            className="heart-burst text-5xl"
            style={{ left: h.x, top: h.y }}
          >
            💚
          </span>
        ))}

        {/* Dark vignette overlay for readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/40" />

        {/* ── Top bar ── */}
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 pb-2 pt-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">{cat.emoji}</span>
          <span
            className="text-xs font-semibold uppercase tracking-widest px-2 py-1 rounded-full"
            style={{ background: `${cat.accent}33`, color: cat.accent }}
          >
            {cat.label}
          </span>
          <span className="text-xs text-white/50 ml-1 font-medium">
            #{market.id}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-white/70 bg-black/30 px-2.5 py-1 rounded-full backdrop-blur-sm">
            {timeLeft(market.expiry)}
          </span>
          <button
            onClick={() => setMuted((m) => !m)}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-black/40 backdrop-blur-sm border border-white/10 hover:bg-white/20 transition-colors text-base"
            title={muted ? "Unmute" : "Mute"}
          >
            {muted ? "🔇" : "🔊"}
          </button>
        </div>
        </div>

        {/* ── Right action rail ── */}
        <div
          className={`absolute right-3 z-10 flex flex-col items-center gap-5 ${
            commentsOpen ? "bottom-2" : "bottom-44"
          }`}
        >
          <ActionBtn
            icon="💬"
            label={String(market.evidenceCount)}
            active={commentsOpen}
            onClick={() => setCommentsOpen((v) => !v)}
          />
          <ActionBtn
            icon="📊"
            label="Detail"
            href={`/markets/${market.id}`}
          />
          <ActionBtn icon="➕" label="Create" href="/create" />
        </div>

        {/* ── Claim + odds (centre bottom of video stage) ── */}
        <div
          className={`absolute bottom-0 left-0 right-0 z-10 px-4 ${
            commentsOpen ? "pb-2" : "pb-8 px-6"
          }`}
        >
          <p
            className={`mb-2 text-center font-bold leading-tight text-white drop-shadow-lg ${
              commentsOpen ? "line-clamp-2 text-sm" : "mb-3 text-xl"
            }`}
          >
            {shortClaim(claim)}
          </p>

          {/* Odds bar */}
          <div className={commentsOpen ? "mb-0 px-1" : "mb-6 px-2"}>
            <div
              className={`mb-1.5 flex justify-between font-semibold ${
                commentsOpen ? "text-[10px]" : "text-xs"
              }`}
            >
              <span className="text-emerald-400">YES {yesPct}%</span>
              <span className="text-[10px] text-white/40">{lamportsToSol(total)} SOL</span>
              <span className="text-red-400">NO {noPct}%</span>
            </div>
            <div
              className={`flex overflow-hidden rounded-full bg-white/10 ${
                commentsOpen ? "h-1" : "h-2"
              }`}
            >
              <div
                className="h-full bg-emerald-400 transition-all duration-700"
                style={{ width: `${yesPct}%` }}
              />
              <div
                className="h-full bg-red-400 transition-all duration-700"
                style={{ width: `${noPct}%` }}
              />
            </div>
          </div>

          {/* Amount picker (shown after tapping YES or NO) */}
          {!commentsOpen && showBetInput && (
          <div className="bg-black/60 backdrop-blur-md rounded-2xl p-4 border border-white/10 mb-4">
            <p className="text-center text-white/70 text-xs mb-3 font-medium">
              Bet on{" "}
              <span className={betSide === "yes" ? "text-emerald-400 font-bold" : "text-red-400 font-bold"}>
                {betSide.toUpperCase()}
              </span>{" "}
              — pick amount
            </p>
            <div className="flex gap-2 mb-3">
              {[0.1, 0.5, 1, 5].map((v) => (
                <button
                  key={v}
                  onClick={() => setBetAmount(v)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-colors
                    ${betAmount === v
                      ? "bg-white text-black border-white"
                      : "bg-white/10 text-white border-white/20 hover:bg-white/20"}`}
                >
                  {v} SOL
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowBetInput(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white/60 bg-white/10 hover:bg-white/20 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmBet}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-colors
                  ${betSide === "yes" ? "bg-emerald-500 hover:bg-emerald-400" : "bg-red-500 hover:bg-red-400"}`}
              >
                Confirm {betAmount} SOL
              </button>
            </div>
          </div>
        )}
        </div>

        {/* ── YES / NO (inside video stage so they stay on the mini player) ── */}
        {!showBetInput && (
          <>
            <button
              onClick={() => handleBet("yes")}
              disabled={placing !== null}
              className={`bet-btn absolute left-3 z-10 rounded-full border-2 border-emerald-300/50 bg-emerald-500/90 flex flex-col items-center justify-center gap-0.5 text-white shadow-xl shadow-emerald-900/50 backdrop-blur-sm transition-all hover:bg-emerald-400 disabled:opacity-50 ${
                commentsOpen
                  ? "bottom-10 h-12 w-12 border-emerald-400/40"
                  : "bottom-24 h-16 w-16"
              }`}
            >
              <span className={`leading-none ${commentsOpen ? "text-xl" : "text-2xl"}`}>
                {placing === "yes" ? "⏳" : "👍"}
              </span>
              <span className="text-[10px] font-bold tracking-wide">YES</span>
            </button>

            <button
              onClick={() => handleBet("no")}
              disabled={placing !== null}
              className={`bet-btn absolute z-10 rounded-full border-2 border-red-300/50 bg-red-500/90 flex flex-col items-center justify-center gap-0.5 text-white shadow-xl shadow-red-900/50 backdrop-blur-sm transition-all hover:bg-red-400 disabled:opacity-50 ${
                commentsOpen
                  ? "bottom-10 right-14 h-12 w-12 border-red-400/40"
                  : "bottom-24 right-4 h-16 w-16"
              }`}
            >
              <span className={`leading-none ${commentsOpen ? "text-xl" : "text-2xl"}`}>
                {placing === "no" ? "⏳" : "👎"}
              </span>
              <span className="text-[10px] font-bold tracking-wide">NO</span>
            </button>
          </>
        )}
      </div>

      {/* ── Discussion sheet (video above keeps playing — same element, shrunk stage) ── */}
      {commentsOpen && (
        <div className="relative z-20 min-h-0 flex-1 flex flex-col">
          <FeedEvidenceSheet
            marketId={market.id}
            evidenceCount={market.evidenceCount}
            onClose={() => setCommentsOpen(false)}
          />
        </div>
      )}

      {toast && (
        <div className="absolute top-14 left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-full border border-white/10 bg-black/80 px-4 py-2 text-xs font-medium text-white shadow-xl backdrop-blur-md">
          {toast}
        </div>
      )}
    </div>
  );
}

// ─── Action button in right rail ─────────────────────────────────────────────

function ActionBtn({
  icon,
  label,
  href,
  onClick,
  active,
}: {
  icon: string;
  label: string;
  href?: string;
  onClick?: () => void;
  active?: boolean;
}) {
  const inner = (
    <>
      <div
        className={`flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-black/40 text-xl backdrop-blur-sm transition-colors group-hover:bg-white/20 ${
          active ? "border-white/30 bg-white/15" : ""
        }`}
      >
        {icon}
      </div>
      <span className="text-[10px] font-semibold text-white drop-shadow">{label}</span>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="group flex flex-col items-center gap-1 border-0 bg-transparent p-0"
      >
        {inner}
      </button>
    );
  }

  return (
    <Link href={href!} className="group flex flex-col items-center gap-1">
      {inner}
    </Link>
  );
}

// ─── Swipe indicator dots ─────────────────────────────────────────────────────

function SwipeDots({
  total,
  active,
}: {
  total: number;
  active: number;
}) {
  return (
    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col gap-1 z-20">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`rounded-full transition-all duration-300 ${
            i === active
              ? "w-1.5 h-4 bg-white"
              : "w-1.5 h-1.5 bg-white/30"
          }`}
        />
      ))}
    </div>
  );
}

// ─── Main feed ───────────────────────────────────────────────────────────────

export default function FeedPage() {
  const [markets, setMarkets] = useState<MarketData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIdx, setActiveIdx] = useState(0);
  const feedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchFeed()
      .then((d) => setMarkets(d.markets.length ? d.markets : DEMO_MARKETS))
      .catch(() => setMarkets(DEMO_MARKETS))
      .finally(() => setLoading(false));
  }, []);

  // Track active card via IntersectionObserver
  useEffect(() => {
    const container = feedRef.current;
    if (!container) return;
    const cards = Array.from(container.children) as HTMLElement[];
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.intersectionRatio > 0.5) {
            const idx = cards.indexOf(e.target as HTMLElement);
            if (idx !== -1) setActiveIdx(idx);
          }
        });
      },
      { root: container, threshold: 0.5 }
    );
    cards.forEach((c) => obs.observe(c));
    return () => obs.disconnect();
  }, [markets]);

  const displayMarkets = loading ? [] : markets;

  return (
    /* Full-screen container below the nav (nav = 64px / h-16) */
    <div className="relative" style={{ height: "calc(100vh - 64px)" }}>
      {/* Feed scroll container */}
      <div
        ref={feedRef}
        className="feed-scroll h-full overflow-y-scroll snap-y snap-mandatory"
        style={{ scrollSnapType: "y mandatory" }}
      >
        {loading
          ? /* Skeleton */
            Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="w-full snap-start flex-shrink-0 bg-gradient-to-br from-gray-900 to-slate-900 animate-pulse"
                style={{ height: "calc(100vh - 64px)" }}
              />
            ))
          : displayMarkets.map((m, i) => (
              <div
                key={m.id}
                style={{ height: "calc(100vh - 64px)" }}
                className="snap-start flex-shrink-0"
              >
                <MarketCard market={m} active={i === activeIdx} />
              </div>
            ))}

        {/* Create CTA at bottom */}
        {!loading && (
          <div
            className="w-full snap-start flex-shrink-0 flex flex-col items-center justify-center gap-6
                       bg-gradient-to-br from-slate-950 to-indigo-950"
            style={{ height: "calc(100vh - 64px)" }}
          >
            <div className="text-5xl">🔮</div>
            <p className="text-white text-2xl font-bold text-center px-8">
              You've seen it all.
            </p>
            <p className="text-white/50 text-center px-12">
              Have a prediction? Put your SOL where your mouth is.
            </p>
            <Link
              href="/create"
              className="px-8 py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500
                         text-white font-bold text-lg transition-colors shadow-xl shadow-indigo-900/50"
            >
              + Create Market
            </Link>
          </div>
        )}
      </div>

      {/* Swipe dots indicator */}
      {!loading && displayMarkets.length > 1 && (
        <SwipeDots total={displayMarkets.length} active={activeIdx} />
      )}

      {/* Swipe hint — shown only on first load */}
      {!loading && displayMarkets.length > 0 && (
        <SwipeHint />
      )}
    </div>
  );
}

// ─── Animated swipe hint ──────────────────────────────────────────────────────

function SwipeHint() {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 2500);
    return () => clearTimeout(t);
  }, []);
  if (!visible) return null;
  return (
    <div
      className="absolute bottom-24 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-1
                 pointer-events-none"
      style={{ animation: "glowPulse 1.2s ease-in-out infinite" }}
    >
      <div className="text-white/80 text-2xl">↕</div>
      <span className="text-white/60 text-xs font-medium tracking-wide">
        Swipe to explore
      </span>
    </div>
  );
}
