"use client";

import { useCallback, useEffect, useMemo } from "react";
import {
  ReactFlow,
  Background,
  Handle,
  Position,
  applyEdgeChanges,
  useNodesState,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { cn } from "@/lib/utils";
import type { SystemsConnectionType } from "@/lib/ai/validators/systems";
import type { SystemsNodeSpec, SystemsUserEdge } from "@/lib/types/exercise";
import type { SystemsNodeImpact } from "@/lib/types/exercise";

const CANVAS_W = 560;
const CANVAS_H = 360;

type FlowMode = "connect" | "shock" | "readonly";

function SystemFlowNode({ data }: NodeProps) {
  const d = data as {
    label: string;
    description: string;
    impact: SystemsNodeImpact;
  };
  const border =
    d.impact === "direct"
      ? "border-orange-500 bg-orange-500/15"
      : d.impact === "indirect"
        ? "border-red-600 bg-red-600/10"
        : "border-border bg-card";
  return (
    <>
      <Handle type="target" position={Position.Top} />
      <div
        className={cn(
          "pointer-events-none min-w-[96px] max-w-[132px] rounded-md border px-2 py-1.5 text-left text-xs shadow-sm",
          border,
        )}
      >
        <div className="font-medium leading-tight">{d.label}</div>
        <div className="text-muted-foreground mt-0.5 line-clamp-3 text-[10px] leading-snug">
          {d.description}
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} />
    </>
  );
}

const nodeTypes = { system: SystemFlowNode };

function toRfNodes(
  specs: SystemsNodeSpec[],
  nodeImpact: Record<string, SystemsNodeImpact>,
): Node[] {
  return specs.map((n) => ({
    id: n.id,
    type: "system",
    position: {
      x: (n.x / 100) * CANVAS_W - 48,
      y: (n.y / 100) * CANVAS_H - 28,
    },
    data: {
      label: n.label,
      description: n.description,
      impact: nodeImpact[n.id] ?? "none",
    },
  }));
}

function toRfEdges(edges: SystemsUserEdge[]): Edge[] {
  return edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    label: e.type.replace(/_/g, " "),
    data: { type: e.type },
  }));
}

export interface SystemsFlowCanvasProps {
  nodes: SystemsNodeSpec[];
  userEdges: SystemsUserEdge[];
  onUserEdgesChange: (edges: SystemsUserEdge[]) => void;
  mode: FlowMode;
  nodeImpact: Record<string, SystemsNodeImpact>;
  onToggleNodeImpact?: (nodeId: string) => void;
  maxEdges?: number;
}

export function SystemsFlowCanvas({
  nodes: nodeSpecs,
  userEdges,
  onUserEdgesChange,
  mode,
  nodeImpact,
  onToggleNodeImpact,
  maxEdges = 20,
}: SystemsFlowCanvasProps) {
  const rfEdges = useMemo(() => toRfEdges(userEdges), [userEdges]);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);

  useEffect(() => {
    setNodes(toRfNodes(nodeSpecs, nodeImpact));
  }, [nodeSpecs, nodeImpact, setNodes]);

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      if (mode !== "connect") return;
      const next = applyEdgeChanges(changes, rfEdges);
      const mapped: SystemsUserEdge[] = next.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        type:
          ((e.data as { type?: SystemsConnectionType } | undefined)?.type as
            | SystemsConnectionType
            | undefined) ?? "depends_on",
      }));
      onUserEdgesChange(mapped);
    },
    [mode, rfEdges, onUserEdgesChange],
  );

  const onConnect = useCallback(
    (params: Connection) => {
      if (mode !== "connect") return;
      if (userEdges.length >= maxEdges) return;
      if (!params.source || !params.target) return;
      const dup = userEdges.some(
        (e) => e.source === params.source && e.target === params.target,
      );
      if (dup) return;
      const id = crypto.randomUUID();
      onUserEdgesChange([
        ...userEdges,
        {
          id,
          source: params.source,
          target: params.target,
          type: "depends_on",
        },
      ]);
    },
    [mode, userEdges, onUserEdgesChange, maxEdges],
  );

  return (
    <div className="h-[380px] w-full rounded-md border bg-muted/20">
      <ReactFlow
        className="h-full w-full"
        nodes={nodes}
        edges={rfEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        nodesDraggable={false}
        nodesConnectable={mode === "connect"}
        edgesReconnectable={false}
        zoomOnScroll={false}
        panOnDrag={false}
        fitView
        fitViewOptions={{ padding: 0.12 }}
        onInit={(inst) => inst.fitView({ padding: 0.12 })}
        onNodeClick={
          mode === "shock" && onToggleNodeImpact
            ? (_, n) => onToggleNodeImpact(n.id)
            : undefined
        }
        deleteKeyCode={mode === "connect" ? "Backspace" : null}
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={16} size={1} />
      </ReactFlow>
    </div>
  );
}
