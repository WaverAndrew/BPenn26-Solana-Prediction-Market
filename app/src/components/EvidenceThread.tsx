"use client";

import { EvidenceData } from "@/lib/api";
import EvidenceCard from "./EvidenceCard";

interface EvidenceThreadProps {
  tree: EvidenceData[];
  depth?: number;
}

function EvidenceNode({
  node,
  depth,
}: {
  node: EvidenceData;
  depth: number;
}) {
  return (
    <div>
      <EvidenceCard evidence={node} depth={depth} />
      {node.children && node.children.length > 0 && (
        <div>
          {node.children.map((child) => (
            <EvidenceNode key={child.id} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function EvidenceThread({
  tree,
  depth = 0,
}: EvidenceThreadProps) {
  if (tree.length === 0) {
    return (
      <div className="text-center py-8 text-text-muted">
        <p>No evidence submitted yet</p>
        <p className="text-sm mt-1">
          Be the first to submit evidence for this market
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {tree.map((node) => (
        <EvidenceNode key={node.id} node={node} depth={depth} />
      ))}
    </div>
  );
}
