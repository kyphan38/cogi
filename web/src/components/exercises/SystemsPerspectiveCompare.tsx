"use client";

import { SystemsFlowCanvas } from "@/components/exercises/SystemsFlowCanvas";
import type {
  SystemsIntendedConnection,
  SystemsNodeSpec,
  SystemsShockEvent,
  SystemsUserEdge,
} from "@/lib/types/exercise";

export interface SystemsPerspectiveCompareProps {
  nodes: SystemsNodeSpec[];
  userEdges: SystemsUserEdge[];
  nodeImpact: Record<string, "none" | "direct" | "indirect">;
  perspectiveAName: string;
  perspectiveBName: string;
  intendedConnectionsA: SystemsIntendedConnection[];
  intendedConnectionsB: SystemsIntendedConnection[];
  shockEvent: SystemsShockEvent;
  shockEventB: {
    directlyAffected: string[];
    indirectlyAffected: string[];
    explanation: string;
  };
}

function formatNodeList(ids: string[], nodes: SystemsNodeSpec[]): string {
  if (ids.length === 0) return "(none)";
  const labels = ids.map((id) => nodes.find((n) => n.id === id)?.label ?? id);
  return labels.join(", ");
}

export function SystemsPerspectiveCompare({
  nodes,
  userEdges,
  nodeImpact,
  perspectiveAName,
  perspectiveBName,
  intendedConnectionsA,
  intendedConnectionsB,
  shockEvent,
  shockEventB,
}: SystemsPerspectiveCompareProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-sm font-medium">Your map ({perspectiveAName})</p>
        <SystemsFlowCanvas
          nodes={nodes}
          userEdges={userEdges}
          onUserEdgesChange={() => {}}
          mode="readonly"
          nodeImpact={nodeImpact}
          className="h-[min(220px,35svh)]"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-2">
          <p className="text-sm font-medium">A - {perspectiveAName}</p>
          <SystemsFlowCanvas
            nodes={nodes}
            userEdges={[]}
            onUserEdgesChange={() => {}}
            mode="readonly"
            nodeImpact={nodeImpact}
            referenceEdges={intendedConnectionsA}
            showReferenceOnly
            className="h-[min(220px,35svh)]"
          />
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">B - {perspectiveBName}</p>
          <SystemsFlowCanvas
            nodes={nodes}
            userEdges={[]}
            onUserEdgesChange={() => {}}
            mode="readonly"
            nodeImpact={nodeImpact}
            referenceEdges={intendedConnectionsB}
            showReferenceOnly
            className="h-[min(220px,35svh)]"
          />
        </div>
      </div>

      <div className="rounded-md border p-3 text-sm">
        <p className="mb-2 font-medium">{shockEvent.description}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <p className="text-muted-foreground text-xs font-medium uppercase">
              {perspectiveAName} - shock ripples
            </p>
            <p className="mt-1">
              <span className="font-medium">Direct: </span>
              {formatNodeList(shockEvent.directlyAffected, nodes)}
            </p>
            <p>
              <span className="font-medium">Indirect: </span>
              {formatNodeList(shockEvent.indirectlyAffected, nodes)}
            </p>
            <p className="text-muted-foreground mt-1 text-xs">{shockEvent.explanation}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs font-medium uppercase">
              {perspectiveBName} - shock ripples
            </p>
            <p className="mt-1">
              <span className="font-medium">Direct: </span>
              {formatNodeList(shockEventB.directlyAffected, nodes)}
            </p>
            <p>
              <span className="font-medium">Indirect: </span>
              {formatNodeList(shockEventB.indirectlyAffected, nodes)}
            </p>
            <p className="text-muted-foreground mt-1 text-xs">{shockEventB.explanation}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
