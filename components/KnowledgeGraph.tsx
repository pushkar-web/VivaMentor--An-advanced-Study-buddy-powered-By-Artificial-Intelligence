import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { UploadedFile, KnowledgeGraphData, GraphNode, GraphLink } from '../types';
import { generateKnowledgeGraph } from '../services/gemini';
import { Loader2, Share2, ZoomIn, ZoomOut, RefreshCw, X, Info } from 'lucide-react';

interface KnowledgeGraphProps {
  file: UploadedFile;
}

const KnowledgeGraph: React.FC<KnowledgeGraphProps> = ({ file }) => {
  const [data, setData] = useState<KnowledgeGraphData | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    loadGraph();
  }, [file]);

  const loadGraph = async () => {
    setLoading(true);
    setData(null);
    setSelectedNode(null);
    const graphData = await generateKnowledgeGraph(file);
    if (graphData) {
        setData(graphData);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!data || !svgRef.current) return;

    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // Clear previous

    const g = svg.append("g");

    // Zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    svg.call(zoom);

    // Color scale based on group
    const color = d3.scaleOrdinal(d3.schemeCategory10);

    // Simulation
    const simulation = d3.forceSimulation(data.nodes as d3.SimulationNodeDatum[])
        .force("link", d3.forceLink(data.links).id((d: any) => d.id).distance(150))
        .force("charge", d3.forceManyBody().strength(-300))
        .force("center", d3.forceCenter(width / 2, height / 2))
        .force("collide", d3.forceCollide().radius((d: any) => (d.importance || 1) * 5 + 10));

    // Links
    const link = g.append("g")
        .selectAll("line")
        .data(data.links)
        .join("line")
        .attr("stroke", "#94a3b8")
        .attr("stroke-opacity", 0.6)
        .attr("stroke-width", 1.5);

    // Link Labels
    const linkLabel = g.append("g")
        .selectAll("text")
        .data(data.links)
        .join("text")
        .text((d) => d.relation)
        .attr("font-size", 10)
        .attr("fill", "#64748b")
        .attr("text-anchor", "middle")
        .attr("dy", -5);

    // Nodes
    const node = g.append("g")
        .selectAll("g")
        .data(data.nodes)
        .join("g")
        .attr("cursor", "pointer")
        .call(d3.drag<any, any>()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended))
        .on("click", (event, d) => {
            event.stopPropagation();
            setSelectedNode(d as GraphNode);
        });

    // Node Circles
    node.append("circle")
        .attr("r", (d) => (d.importance || 5) * 2 + 5)
        .attr("fill", (d) => color(d.group))
        .attr("stroke", "#fff")
        .attr("stroke-width", 2)
        .attr("class", "transition-all duration-300 hover:stroke-teal-500 hover:stroke-4");

    // Node Labels
    node.append("text")
        .text((d) => d.label)
        .attr("x", (d) => (d.importance || 5) * 2 + 8)
        .attr("y", 4)
        .attr("font-size", 12)
        .attr("font-weight", "bold")
        .attr("fill", "#1e293b")
        .style("pointer-events", "none")
        .style("text-shadow", "0 1px 2px rgba(255,255,255,0.8)");

    // Background Click clears selection
    svg.on("click", () => {
        setSelectedNode(null);
    });

    // Simulation tick
    simulation.on("tick", () => {
        link
            .attr("x1", (d: any) => d.source.x)
            .attr("y1", (d: any) => d.source.y)
            .attr("x2", (d: any) => d.target.x)
            .attr("y2", (d: any) => d.target.y);
            
        linkLabel
             .attr("x", (d: any) => (d.source.x + d.target.x) / 2)
             .attr("y", (d: any) => (d.source.y + d.target.y) / 2);

        node
            .attr("transform", (d: any) => `translate(${d.x},${d.y})`);
    });

    function dragstarted(event: any, d: any) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
    }

    function dragged(event: any, d: any) {
        d.fx = event.x;
        d.fy = event.y;
    }

    function dragended(event: any, d: any) {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
    }

    // Legend
    const groups = Array.from(new Set(data.nodes.map(n => n.group)));
    const legend = svg.append("g")
        .attr("transform", `translate(20, 20)`);
    
    groups.forEach((grp, i) => {
        const row = legend.append("g").attr("transform", `translate(0, ${i * 20})`);
        row.append("circle").attr("r", 5).attr("fill", color(grp));
        row.append("text").attr("x", 15).attr("y", 5).text(grp).attr("font-size", 12).attr("fill", "#475569").style("text-transform", "capitalize");
    });

  }, [data]);

  return (
    <div className="flex flex-col h-[700px] bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden relative">
        <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
            <button 
                onClick={loadGraph}
                disabled={loading}
                className="p-2 bg-white rounded-lg shadow border border-slate-200 hover:bg-slate-50 text-slate-600 disabled:opacity-50"
                title="Regenerate Graph"
            >
                {loading ? <Loader2 className="w-5 h-5 animate-spin"/> : <RefreshCw className="w-5 h-5"/>}
            </button>
        </div>

        {loading && (
             <div className="absolute inset-0 z-20 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center">
                 <Loader2 className="w-12 h-12 text-teal-600 animate-spin mb-4" />
                 <p className="text-slate-600 font-medium">Tracing connections and building graph...</p>
             </div>
        )}

        {data ? (
            <svg ref={svgRef} className="w-full h-full bg-slate-50 cursor-move"></svg>
        ) : (
             !loading && <div className="flex items-center justify-center h-full text-slate-400">Failed to load graph.</div>
        )}
        
        {/* Helper Badge */}
        <div className="absolute bottom-4 left-4 pointer-events-none">
             <div className="bg-white/90 backdrop-blur px-4 py-2 rounded-lg shadow border border-slate-200">
                 <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                     <Share2 className="w-4 h-4 text-teal-600" /> Knowledge Graph
                 </h3>
                 <p className="text-xs text-slate-500">Drag nodes to rearrange. Click for details.</p>
             </div>
        </div>

        {/* Details Panel */}
        {selectedNode && (
            <div className="absolute top-4 left-4 z-30 w-72 bg-white rounded-xl shadow-xl border border-slate-200 animate-in slide-in-from-left-4 fade-in duration-200 overflow-hidden">
                <div className="bg-slate-50 px-4 py-3 border-b border-slate-100 flex justify-between items-center">
                    <span className="text-xs font-bold uppercase text-slate-500 tracking-wider">Node Details</span>
                    <button onClick={() => setSelectedNode(null)} className="text-slate-400 hover:text-slate-600">
                        <X className="w-4 h-4" />
                    </button>
                </div>
                <div className="p-4">
                    <h3 className="text-lg font-bold text-slate-800 mb-1">{selectedNode.label}</h3>
                    <span className="inline-block px-2 py-0.5 rounded text-xs font-bold bg-indigo-100 text-indigo-700 capitalize mb-3">
                        {selectedNode.group}
                    </span>
                    
                    {selectedNode.description && (
                         <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 mb-3">
                             <p className="text-sm text-slate-600 leading-relaxed">
                                 {selectedNode.description}
                             </p>
                         </div>
                    )}
                    
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                        <Info className="w-3 h-3"/>
                        <span>Importance Score: {selectedNode.importance}/10</span>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default KnowledgeGraph;