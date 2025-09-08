import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import type { GameState } from "@gbg/types";

export interface GraphViewProps {
  /** Match id to connect to websocket and receive live state */
  matchId?: string;
  /** Initial state to render if websocket not used */
  initialState?: GameState;
  /** Strong paths from judgment scroll for highlighting */
  strongPaths?: Array<{ nodes: string[]; why?: string }>;
  /** Index of selected strong path */
  selectedPathIndex?: number;
  width?: number;
  height?: number;
}

export default function GraphView({
  matchId,
  initialState,
  strongPaths,
  selectedPathIndex,
  width = 800,
  height = 600,
}: GraphViewProps) {
  const [state, setState] = useState<GameState | null>(initialState ?? null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Subscribe to websocket for live updates
  useEffect(() => {
    if (!matchId) return;
    const ws = new WebSocket(`ws://localhost:8787/?matchId=${matchId}`);
    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === "state:update") setState(msg.payload as GameState);
      } catch {
        // ignore malformed
      }
    };
    return () => ws.close();
  }, [matchId]);

  // Render graph using d3 whenever state or selection changes
  useEffect(() => {
    if (!state) return;
    const nodes: Array<d3.SimulationNodeDatum & { id: string }> = Object.values(
      state.beads
    ).map((b) => ({ id: b.id }));
    const links: Array<d3.SimulationLinkDatum<d3.SimulationNodeDatum> & { id: string }> = Object.values(
      state.edges
    ).map((e) => ({ id: e.id, source: e.from, target: e.to }));

    const svg = d3.select(svgRef.current) as any;
    svg.selectAll("*").remove();
    svg.attr("viewBox", `0 0 ${width} ${height}`);

    const g = svg.append("g");

    const link = g
      .append("g")
      .attr("stroke", "#888")
      .attr("stroke-width", 1.5)
      .selectAll("line")
      .data(links)
      .enter()
      .append("line")
      .attr("id", (d: any) => d.id);

    const node = g
      .append("g")
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.5)
      .selectAll("circle")
      .data(nodes)
      .enter()
      .append("circle")
      .attr("r", 10)
      .attr("fill", "#4f46e5");

    (node as any).call(
      d3
        .drag<SVGCircleElement, d3.SimulationNodeDatum>()
        .on("start", (event: any, d: any) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on("drag", (event: any, d: any) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on("end", (event: any, d: any) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        })
    );

    const simulation = d3
      .forceSimulation(nodes)
      .force(
        "link",
        d3.forceLink(links).id((d: any) => d.id)
      )
      .force("charge", d3.forceManyBody().strength(-200))
      .force("center", d3.forceCenter(width / 2, height / 2));

    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => (d.source as any).x)
        .attr("y1", (d: any) => (d.source as any).y)
        .attr("x2", (d: any) => (d.target as any).x)
        .attr("y2", (d: any) => (d.target as any).y);
      node.attr("cx", (d: any) => d.x).attr("cy", (d: any) => d.y);
    });

    // zoom + pan
    (svg as any).call(
      d3
        .zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.1, 4])
        .on("zoom", (event: any) => {
          g.attr("transform", event.transform);
        })
    );

    // Highlight selected path
    if (strongPaths && selectedPathIndex !== undefined) {
      const path = strongPaths[selectedPathIndex]?.nodes ?? [];
      const nodeSet = new Set(path);
      const edgeSet = new Set<string>();
      for (let i = 0; i < path.length - 1; i++) {
        edgeSet.add(`${path[i]}|${path[i + 1]}`);
      }
      node.attr("fill", (d: any) => (nodeSet.has(d.id) ? "#ef4444" : "#4f46e5"));
      link
        .attr("stroke", (d: any) =>
          edgeSet.has(`${d.source.id || d.source}|${d.target.id || d.target}`)
            ? "#ef4444"
            : "#888"
        )
        .attr("stroke-width", (d: any) =>
          edgeSet.has(`${d.source.id || d.source}|${d.target.id || d.target}`) ? 3 : 1.5
        );
    }

    return () => {
      simulation.stop();
    };
  }, [state, strongPaths, selectedPathIndex, width, height]);

  return <svg ref={svgRef} width={width} height={height} />;
}

