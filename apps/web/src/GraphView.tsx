import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import type { GameState } from "@gbg/types";

interface Node extends d3.SimulationNodeDatum {
  id: string;
}

interface Link extends d3.SimulationLinkDatum<Node> {
  id: string;
}

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
    const nodes: Node[] = Object.values(state.beads).map((b) => ({ id: b.id }));
    const links: Link[] = Object.values(state.edges).map((e) => ({
      id: e.id,
      source: e.from,
      target: e.to,
    }));

    const simulation = d3
      .forceSimulation<Node>(nodes)
      .force("link", d3.forceLink<Node, Link>(links).id((d) => d.id))
      .force("charge", d3.forceManyBody<Node>().strength(-200))
      .force("center", d3.forceCenter(width / 2, height / 2));

    const svg = d3.select<SVGSVGElement, unknown>(svgRef.current!);
    svg.selectAll("*").remove();
    svg.attr("viewBox", `0 0 ${width} ${height}`);

    const g = svg.append("g");

    const link = g
      .append("g")
      .attr("stroke", "#888")
      .attr("stroke-width", 1.5)
      .selectAll<SVGLineElement, Link>("line")
      .data(links)
      .enter()
      .append("line")
      .attr("id", (d) => d.id);

    const node = g
      .append("g")
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.5)
      .selectAll<SVGCircleElement, Node>("circle")
      .data(nodes)
      .enter()
      .append("circle")
      .attr("r", 10)
      .attr("fill", "#4f46e5");

    const drag = d3
      .drag<SVGCircleElement, Node>()
      .on("start", (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on("drag", (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on("end", (event, d) => {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      });

    node.call(drag);

    simulation.on("tick", () => {
      link
        .attr("x1", (d) => (d.source as Node).x ?? 0)
        .attr("y1", (d) => (d.source as Node).y ?? 0)
        .attr("x2", (d) => (d.target as Node).x ?? 0)
        .attr("y2", (d) => (d.target as Node).y ?? 0);
      node.attr("cx", (d) => d.x ?? 0).attr("cy", (d) => d.y ?? 0);
    });

    svg.call(
      d3
        .zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.1, 4])
        .on("zoom", (event) => {
          g.attr("transform", event.transform.toString());
        })
    );

    if (strongPaths && selectedPathIndex !== undefined) {
      const path = strongPaths[selectedPathIndex]?.nodes ?? [];
      const nodeSet = new Set(path);
      const edgeSet = new Set<string>();
      for (let i = 0; i < path.length - 1; i++) {
        edgeSet.add(`${path[i]}|${path[i + 1]}`);
      }
      const getId = (n: string | number | Node) =>
        typeof n === "string" || typeof n === "number" ? String(n) : n.id;
      node.attr("fill", (d) => (nodeSet.has(d.id) ? "#ef4444" : "#4f46e5"));
      link
        .attr("stroke", (d) =>
          edgeSet.has(`${getId(d.source)}|${getId(d.target)}`) ? "#ef4444" : "#888"
        )
        .attr("stroke-width", (d) =>
          edgeSet.has(`${getId(d.source)}|${getId(d.target)}`) ? 3 : 1.5
        );
    }

    return () => {
      simulation.stop();
    };
  }, [state, strongPaths, selectedPathIndex, width, height]);

  return <svg ref={svgRef} width={width} height={height} />;
}

