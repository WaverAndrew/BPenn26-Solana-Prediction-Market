"use client";

import { EvidenceData } from "@/lib/api";
import EvidenceCard from "./EvidenceCard";

interface EvidenceThreadProps {
  tree: EvidenceData[];
  depth?: number;
  onStaked?: () => void;
}

function EvidenceNode({
  node,
  depth,
  onStaked,
}: {
  node: EvidenceData;
  depth: number;
  onStaked?: () => void;
}) {
  return (
    <div>
      <EvidenceCard evidence={node} depth={depth} onStaked={onStaked} />
      {node.children && node.children.length > 0 && (
        <div>
          {node.children.map((child) => (
            <EvidenceNode
              key={child.id}
              node={child}
              depth={depth + 1}
              onStaked={onStaked}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function EvidenceThread({
  tree,
  depth = 0,
  onStaked,
}: EvidenceThreadProps) {
  if (tree.length === 0) {
    return (
      <div className="text-center py-10 text-text-muted border border-dashed border-border-primary rounded-xl">
        <p className="text-2xl mb-2">💬</p>
        <p className="font-medium">No evidence yet</p>
        <p className="text-sm mt-1">Be the first to submit evidence below</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {/* Explainer */}
      <div className="flex items-center gap-2 mb-4 px-1">
        <span className="text-xs text-text-muted">
          Each piece of evidence is a mini-market — stake SOL on whether it
          should be included in the final resolution.
        </span>
      </div>

      {tree.map((node) => (
        <EvidenceNode
          key={node.id}
          node={node}
          depth={depth}
          onStaked={onStaked}
        />
      ))}
    </div>
  );
}
