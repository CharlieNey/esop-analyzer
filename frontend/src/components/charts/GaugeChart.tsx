import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface GaugeChartProps {
  value: number;
  min?: number;
  max?: number;
  title?: string;
  unit?: string;
  width?: number;
  height?: number;
  thresholds?: { value: number; color: string; label: string }[];
}

const GaugeChart: React.FC<GaugeChartProps> = ({
  value,
  min = 0,
  max = 100,
  title = "Performance Gauge",
  unit = "%",
  width = 300,
  height = 200,
  thresholds = [
    { value: 30, color: '#ef4444', label: 'Low' },
    { value: 70, color: '#f59e0b', label: 'Medium' },
    { value: 100, color: '#10b981', label: 'High' }
  ]
}) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // Clear previous render

    const radius = Math.min(width, height) / 2 - 20;
    const centerX = width / 2;
    const centerY = height / 2 + 20;

    // Create scales
    const angleScale = d3.scaleLinear()
      .domain([min, max])
      .range([-Math.PI * 0.75, Math.PI * 0.75]);

    const colorScale = d3.scaleLinear<string>()
      .domain(thresholds.map(t => t.value))
      .range(thresholds.map(t => t.color));

    // Create arc generator for gauge background
    const arc = d3.arc()
      .innerRadius(radius - 20)
      .outerRadius(radius)
      .startAngle(-Math.PI * 0.75)
      .endAngle(Math.PI * 0.75);

    // Create main group
    const g = svg
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${centerX},${centerY})`);

    // Draw gauge background
    g.append("path")
      .attr("d", arc as any)
      .style("fill", "#e5e7eb")
      .style("stroke", "#d1d5db")
      .style("stroke-width", 1);

    // Draw colored segments
    thresholds.forEach((threshold, index) => {
      const prevValue = index === 0 ? min : thresholds[index - 1].value;
      const segmentArc = d3.arc()
        .innerRadius(radius - 20)
        .outerRadius(radius)
        .startAngle(angleScale(prevValue))
        .endAngle(angleScale(threshold.value));

      g.append("path")
        .attr("d", segmentArc as any)
        .style("fill", threshold.color)
        .style("opacity", 0.7);
    });

    // Draw tick marks
    const ticks = d3.range(min, max + 1, (max - min) / 5);
    ticks.forEach(tick => {
      const angle = angleScale(tick);
      const x1 = Math.cos(angle) * (radius - 25);
      const y1 = Math.sin(angle) * (radius - 25);
      const x2 = Math.cos(angle) * (radius - 15);
      const y2 = Math.sin(angle) * (radius - 15);

      g.append("line")
        .attr("x1", x1)
        .attr("y1", y1)
        .attr("x2", x2)
        .attr("y2", y2)
        .style("stroke", "#6b7280")
        .style("stroke-width", 2);

      // Add tick labels
      const labelX = Math.cos(angle) * (radius - 35);
      const labelY = Math.sin(angle) * (radius - 35);

      g.append("text")
        .attr("x", labelX)
        .attr("y", labelY)
        .attr("dy", "0.35em")
        .style("text-anchor", "middle")
        .style("font-size", "10px")
        .style("fill", "#6b7280")
        .text(tick);
    });

    // Draw needle
    const needleAngle = angleScale(Math.min(Math.max(value, min), max));
    const needleLength = radius - 30;
    
    const needlePath = `M 0 -10 L ${needleLength * Math.cos(needleAngle)} ${needleLength * Math.sin(needleAngle)} L 0 10 Z`;
    
    g.append("path")
      .attr("d", needlePath)
      .style("fill", "#1f2937")
      .style("stroke", "#374151")
      .style("stroke-width", 1);

    // Draw center circle
    g.append("circle")
      .attr("cx", 0)
      .attr("cy", 0)
      .attr("r", 8)
      .style("fill", "#1f2937")
      .style("stroke", "#374151")
      .style("stroke-width", 2);

    // Add value text
    g.append("text")
      .attr("x", 0)
      .attr("y", 40)
      .style("text-anchor", "middle")
      .style("font-size", "20px")
      .style("font-weight", "bold")
      .style("fill", "#1f2937")
      .text(`${value.toFixed(1)}${unit}`);

  }, [value, min, max, width, height, unit, thresholds]);

  return (
    <div className="bg-white rounded-lg p-4">
      {title && (
        <h3 className="text-lg font-medium text-gray-900 mb-4 text-center">{title}</h3>
      )}
      <div className="flex justify-center">
        <svg ref={svgRef}></svg>
      </div>
      
      {/* Legend */}
      <div className="flex justify-center mt-2 space-x-4">
        {thresholds.map((threshold, index) => (
          <div key={index} className="flex items-center space-x-1">
            <div 
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: threshold.color }}
            ></div>
            <span className="text-xs text-gray-600">{threshold.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default GaugeChart;