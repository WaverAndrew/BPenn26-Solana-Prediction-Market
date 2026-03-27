"use client";

import { UserProfileData } from "@/lib/api";

interface KarmaDisplayProps {
  profile: UserProfileData;
}

interface KarmaAxis {
  label: string;
  key: keyof Pick<
    UserProfileData,
    "forecastKarma" | "evidenceKarma" | "reviewerKarma" | "challengeKarma"
  >;
  color: string;
  angle: number;
}

const AXES: KarmaAxis[] = [
  { label: "Forecast", key: "forecastKarma", color: "#00d26a", angle: 0 },
  { label: "Evidence", key: "evidenceKarma", color: "#5b7fff", angle: 90 },
  { label: "Reviewer", key: "reviewerKarma", color: "#a855f7", angle: 180 },
  {
    label: "Challenge",
    key: "challengeKarma",
    color: "#fbbf24",
    angle: 270,
  },
];

export default function KarmaDisplay({ profile }: KarmaDisplayProps) {
  const values = AXES.map((a) => profile[a.key]);
  const maxVal = Math.max(...values.map(Math.abs), 100);

  const cx = 100;
  const cy = 100;
  const radius = 70;

  // Compute polygon points
  const points = AXES.map((axis, i) => {
    const val = Math.max(profile[axis.key], 0);
    const norm = val / maxVal;
    const angleRad = ((axis.angle - 90) * Math.PI) / 180;
    const x = cx + radius * norm * Math.cos(angleRad);
    const y = cy + radius * norm * Math.sin(angleRad);
    return { x, y };
  });

  const polygonPoints = points.map((p) => `${p.x},${p.y}`).join(" ");

  // Grid rings
  const rings = [0.25, 0.5, 0.75, 1.0];

  return (
    <div className="card">
      <h3 className="text-lg font-semibold text-text-primary mb-4">
        Karma Profile
      </h3>

      <div className="flex justify-center">
        <svg viewBox="0 0 200 200" className="w-48 h-48">
          {/* Grid rings */}
          {rings.map((r) => (
            <polygon
              key={r}
              points={AXES.map((axis) => {
                const angleRad = ((axis.angle - 90) * Math.PI) / 180;
                return `${cx + radius * r * Math.cos(angleRad)},${
                  cy + radius * r * Math.sin(angleRad)
                }`;
              }).join(" ")}
              fill="none"
              stroke="#1e293b"
              strokeWidth="0.5"
            />
          ))}

          {/* Axis lines */}
          {AXES.map((axis) => {
            const angleRad = ((axis.angle - 90) * Math.PI) / 180;
            return (
              <line
                key={axis.key}
                x1={cx}
                y1={cy}
                x2={cx + radius * Math.cos(angleRad)}
                y2={cy + radius * Math.sin(angleRad)}
                stroke="#1e293b"
                strokeWidth="0.5"
              />
            );
          })}

          {/* Data polygon */}
          <polygon
            points={polygonPoints}
            fill="rgba(91, 127, 255, 0.15)"
            stroke="#5b7fff"
            strokeWidth="1.5"
          />

          {/* Data points */}
          {points.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r="3"
              fill={AXES[i].color}
            />
          ))}

          {/* Labels */}
          {AXES.map((axis) => {
            const angleRad = ((axis.angle - 90) * Math.PI) / 180;
            const lx = cx + (radius + 18) * Math.cos(angleRad);
            const ly = cy + (radius + 18) * Math.sin(angleRad);
            return (
              <text
                key={axis.key}
                x={lx}
                y={ly}
                textAnchor="middle"
                dominantBaseline="central"
                fill={axis.color}
                fontSize="7"
                fontWeight="600"
              >
                {axis.label}
              </text>
            );
          })}
        </svg>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-4">
        {AXES.map((axis) => (
          <div key={axis.key} className="text-center">
            <div className="text-lg font-bold" style={{ color: axis.color }}>
              {profile[axis.key]}
            </div>
            <div className="text-xs text-text-muted">{axis.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-border-primary text-center">
        <div>
          <div className="text-lg font-bold text-text-primary">
            {profile.marketsCreated}
          </div>
          <div className="text-xs text-text-muted">Markets</div>
        </div>
        <div>
          <div className="text-lg font-bold text-text-primary">
            {profile.betsPlaced}
          </div>
          <div className="text-xs text-text-muted">Bets</div>
        </div>
        <div>
          <div className="text-lg font-bold text-text-primary">
            {profile.evidenceSubmitted}
          </div>
          <div className="text-xs text-text-muted">Evidence</div>
        </div>
      </div>
    </div>
  );
}
