import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

function Dendrogram({ data, images }) {
  const svgRef = useRef(null);

  useEffect(() => {
    if (!data || !svgRef.current) return;

    // Clear previous SVG
    d3.select(svgRef.current).selectAll('*').remove();

    const width = svgRef.current.clientWidth;
    const height = Math.max(600, images.length * 30);

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height);

    // Create hierarchical layout
    const cluster = d3.cluster()
      .size([height - 100, width - 300])
      .separation(() => 1);

    const root = d3.hierarchy(data);
    cluster(root);

    const g = svg.append('g')
      .attr('transform', 'translate(50, 50)');

    // Draw links
    g.selectAll('.link')
      .data(root.links())
      .enter()
      .append('path')
      .attr('class', 'link')
      .attr('fill', 'none')
      .attr('stroke', '#ccc')
      .attr('stroke-width', 2)
      .attr('d', d3.linkHorizontal()
        .x(d => d.y)
        .y(d => d.x));

    // Draw nodes
    const node = g.selectAll('.node')
      .data(root.descendants())
      .enter()
      .append('g')
      .attr('class', 'node')
      .attr('transform', d => `translate(${d.y}, ${d.x})`);

    // Add circles for nodes
    node.append('circle')
      .attr('r', d => d.children ? 5 : 7)
      .attr('fill', d => d.children ? '#3498db' : '#e74c3c')
      .attr('stroke', '#fff')
      .attr('stroke-width', 2);

    // Add labels for leaf nodes
    node.filter(d => !d.children)
      .append('text')
      .attr('dx', 12)
      .attr('dy', 4)
      .style('font-size', '12px')
      .style('fill', '#2c3e50')
      .text(d => {
        const name = d.data.name || '';
        return name.length > 30 ? name.substring(0, 27) + '...' : name;
      });

    // Add distance labels for internal nodes
    node.filter(d => d.children)
      .append('text')
      .attr('dx', 0)
      .attr('dy', -10)
      .style('font-size', '10px')
      .style('fill', '#7f8c8d')
      .style('text-anchor', 'middle')
      .text(d => d.data.distance ? d.data.distance.toFixed(2) : '');

  }, [data, images]);

  return (
    <div style={{ width: '100%', height: '100%', overflow: 'auto' }}>
      <h2 style={{ marginBottom: '1rem', color: '#2c3e50' }}>Die Similarity Dendrogram</h2>
      <p style={{ marginBottom: '1.5rem', color: '#7f8c8d', fontSize: '0.9rem' }}>
        Coins are grouped by die similarity. Shorter branches indicate more similar dies.
      </p>
      <svg ref={svgRef} style={{ display: 'block', margin: '0 auto' }} />
    </div>
  );
}

export default Dendrogram;
