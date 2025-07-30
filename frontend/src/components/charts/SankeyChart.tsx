import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { sankey, sankeyLinkHorizontal, SankeyGraph, SankeyNode, SankeyLink } from 'd3-sankey';

interface SankeyData {
  nodes: Array<{ name: string; category?: string }>;
  links: Array<{ source: number; target: number; value: number }>;
}

interface SankeyChartProps {
  data: SankeyData;
  width?: number;
  height?: number;
  title?: string;
  formatValue?: (value: number) => string;
}

const SankeyChart: React.FC<SankeyChartProps> = ({
  data,
  width = 600,
  height = 400,
  title = "Cash Flow Analysis",
  formatValue = (value) => `$${(value / 1000000).toFixed(1)}M`
}) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !data) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // Clear previous render

    const margin = { top: 10, right: 10, bottom: 10, left: 10 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Create sankey generator
    const sankeyGenerator = sankey<{}, {}>()
      .nodeWidth(15)
      .nodePadding(10)
      .extent([[1, 1], [innerWidth - 1, innerHeight - 6]]);

    // Generate the sankey diagram
    const graph: SankeyGraph<{}, {}> = sankeyGenerator(data as any);

    // Color scale
    const color = d3.scaleOrdinal(d3.schemeCategory10);

    // Create main group
    const g = svg
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Create tooltip
    const tooltip = d3.select("body").append("div")
      .attr("class", "sankey-tooltip")
      .style("opacity", 0)
      .style("position", "absolute")
      .style("background", "rgba(0,0,0,0.8)")
      .style("color", "white")
      .style("padding", "8px")
      .style("border-radius", "4px")
      .style("font-size", "12px")
      .style("pointer-events", "none");

    // Add links
    g.append("g")
      .selectAll("path")
      .data(graph.links)
      .enter().append("path")
      .attr("d", sankeyLinkHorizontal())
      .attr("stroke", d => color((d.source as any).name || ''))
      .attr("stroke-width", d => Math.max(1, d.width || 0))
      .style("fill", "none")
      .style("stroke-opacity", 0.4)
      .on("mouseover", function(event, d) {
        d3.select(this).style("stroke-opacity", 0.8);
        tooltip.transition()
          .duration(200)
          .style("opacity", .9);
        tooltip.html(`
          <strong>${(d.source as any).name} → ${(d.target as any).name}</strong><br/>
          ${formatValue(d.value || 0)}
        `)
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 28) + "px");
      })
      .on("mouseout", function() {
        d3.select(this).style("stroke-opacity", 0.4);
        tooltip.transition()
          .duration(500)
          .style("opacity", 0);
      });

    // Add nodes
    g.append("g")
      .selectAll("rect")
      .data(graph.nodes)
      .enter().append("rect")
      .attr("x", d => d.x0 || 0)
      .attr("y", d => d.y0 || 0)
      .attr("height", d => (d.y1 || 0) - (d.y0 || 0))
      .attr("width", d => (d.x1 || 0) - (d.x0 || 0))
      .attr("fill", d => color((d as any).name || ''))
      .attr("stroke", "#000")
      .style("cursor", "pointer")
      .on("mouseover", function(event, d) {
        tooltip.transition()
          .duration(200)
          .style("opacity", .9);
        tooltip.html(`
          <strong>${(d as any).name}</strong><br/>
          ${formatValue(d.value || 0)}
        `)
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 28) + "px");
      })
      .on("mouseout", function() {
        tooltip.transition()
          .duration(500)
          .style("opacity", 0);
      });

    // Add node labels
    g.append("g")
      .selectAll("text")
      .data(graph.nodes)
      .enter().append("text")
      .attr("x", d => (d.x0 || 0) < innerWidth / 2 ? (d.x1 || 0) + 6 : (d.x0 || 0) - 6)
      .attr("y", d => ((d.y1 || 0) + (d.y0 || 0)) / 2)
      .attr("dy", "0.35em")
      .attr("text-anchor", d => (d.x0 || 0) < innerWidth / 2 ? "start" : "end")
      .style("font-size", "12px")
      .style("fill", "#333")
      .text(d => (d as any).name);

    // Cleanup function
    return () => {
      tooltip.remove();
    };
  }, [data, width, height, formatValue]);

  return (
    <div className="bg-white rounded-lg p-4">
      {title && (
        <h3 className="text-lg font-medium text-gray-900 mb-4 text-center">{title}</h3>
      )}
      <div className="flex justify-center">
        <svg ref={svgRef}></svg>
      </div>
    </div>
  );
};

export default SankeyChart;