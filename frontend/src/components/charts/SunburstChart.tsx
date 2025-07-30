import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface SunburstData {
  name: string;
  value?: number;
  children?: SunburstData[];
}

interface SunburstChartProps {
  data: SunburstData;
  width?: number;
  height?: number;
  title?: string;
  formatValue?: (value: number) => string;
}

const SunburstChart: React.FC<SunburstChartProps> = ({
  data,
  width = 400,
  height = 400,
  title = "Hierarchical Breakdown",
  formatValue = (value) => `$${(value / 1000000).toFixed(1)}M`
}) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !data) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // Clear previous render

    const radius = Math.min(width, height) / 2;
    const color = d3.scaleOrdinal(d3.schemeCategory10);

    // Create hierarchy
    const root = d3.hierarchy(data)
      .sum(d => d.value || 0)
      .sort((a, b) => (b.value || 0) - (a.value || 0));

    // Create partition layout
    const partition = d3.partition<SunburstData>()
      .size([2 * Math.PI, radius]);

    partition(root);

    // Create arc generator
    const arc = d3.arc<any>()
      .startAngle(d => d.x0)
      .endAngle(d => d.x1)
      .innerRadius(d => d.y0)
      .outerRadius(d => d.y1);

    // Create main group
    const g = svg
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${width / 2},${height / 2})`);

    // Create tooltip
    const tooltip = d3.select("body").append("div")
      .attr("class", "tooltip")
      .style("opacity", 0)
      .style("position", "absolute")
      .style("background", "rgba(0,0,0,0.8)")
      .style("color", "white")
      .style("padding", "8px")
      .style("border-radius", "4px")
      .style("font-size", "12px")
      .style("pointer-events", "none");

    // Draw arcs
    g.selectAll("path")
      .data(root.descendants())
      .enter().append("path")
      .attr("d", arc)
      .style("fill", (d, i) => color(i.toString()))
      .style("stroke", "#fff")
      .style("stroke-width", 2)
      .style("cursor", "pointer")
      .on("mouseover", function(event, d) {
        tooltip.transition()
          .duration(200)
          .style("opacity", .9);
        tooltip.html(`
          <strong>${d.data.name}</strong><br/>
          ${d.value ? formatValue(d.value) : 'No value'}
        `)
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 28) + "px");
      })
      .on("mouseout", function() {
        tooltip.transition()
          .duration(500)
          .style("opacity", 0);
      });

    // Add labels for larger segments
    g.selectAll("text")
      .data(root.descendants().filter((d: any) => d.depth && (d.y1 - d.y0) > 20))
      .enter().append("text")
      .attr("transform", (d: any) => {
        const x = (d.x0 + d.x1) / 2 * 180 / Math.PI;
        const y = (d.y0 + d.y1) / 2;
        return `rotate(${x - 90}) translate(${y},0) rotate(${x < 180 ? 0 : 180})`;
      })
      .attr("dy", "0.35em")
      .style("text-anchor", (d: any) => (d.x0 + d.x1) / 2 < Math.PI ? "start" : "end")
      .style("font-size", "11px")
      .style("fill", "#333")
      .text((d: any) => d.data.name);

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

export default SunburstChart;