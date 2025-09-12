"use client";

import React, { useEffect, useRef } from "react";

interface NetworkNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  originalVx: number;
  originalVy: number;
  type: 'api' | 'database' | 'service' | 'cache' | 'queue';
  size: number;
  connections: number[];
  pulsePhase: number;
}

interface DataPacket {
  fromNode: number;
  toNode: number;
  progress: number;
  x: number;
  y: number;
}

const NODE_TYPES = {
  api: { color: '#10B981', symbol: 'API', size: 8 },
  database: { color: '#3B82F6', symbol: 'DB', size: 10 },
  service: { color: '#8B5CF6', symbol: 'SVC', size: 6 },
  cache: { color: '#F59E0B', symbol: 'CACHE', size: 7 },
  queue: { color: '#EF4444', symbol: 'Q', size: 5 }
};

export function NetworkArchitectureBackground({ 
  cursorPosition, 
  repulsionRadius = 300 
}: { cursorPosition?: { x: number; y: number }; repulsionRadius?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nodesRef = useRef<NetworkNode[]>([]);
  const packetsRef = useRef<DataPacket[]>([]);
  const animationFrameRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    // Initialize network nodes
    if (nodesRef.current.length === 0) {
      const nodeTypes = Object.keys(NODE_TYPES) as Array<keyof typeof NODE_TYPES>;
      const numNodes = 35; // Increased number of nodes
      
      // Create a more distributed initial placement
      const gridCols = Math.ceil(Math.sqrt(numNodes));
      const gridRows = Math.ceil(numNodes / gridCols);
      const cellWidth = width / gridCols;
      const cellHeight = height / gridRows;
      
      for (let i = 0; i < numNodes; i++) {
        const gridX = i % gridCols;
        const gridY = Math.floor(i / gridCols);
        
        // Add randomness within each grid cell for natural distribution
        const baseX = gridX * cellWidth + cellWidth / 2;
        const baseY = gridY * cellHeight + cellHeight / 2;
        const randomOffsetX = (Math.random() - 0.5) * cellWidth * 0.8;
        const randomOffsetY = (Math.random() - 0.5) * cellHeight * 0.8;
        
        const vx = (Math.random() - 0.5) * 0.2;
        const vy = (Math.random() - 0.5) * 0.2;
        const type = nodeTypes[Math.floor(Math.random() * nodeTypes.length)];
        
        nodesRef.current.push({
          x: Math.max(NODE_TYPES[type].size, Math.min(width - NODE_TYPES[type].size, baseX + randomOffsetX)),
          y: Math.max(NODE_TYPES[type].size, Math.min(height - NODE_TYPES[type].size, baseY + randomOffsetY)),
          vx,
          vy,
          originalVx: vx,
          originalVy: vy,
          type,
          size: NODE_TYPES[type].size,
          connections: [],
          pulsePhase: Math.random() * Math.PI * 2
        });
      }

      // Create connections between nearby nodes
      nodesRef.current.forEach((node, i) => {
        const maxConnections = 3;
        let connections = 0;
        
        nodesRef.current.forEach((otherNode, j) => {
          if (i !== j && connections < maxConnections) {
            const dx = node.x - otherNode.x;
            const dy = node.y - otherNode.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < 150) {
              node.connections.push(j);
              connections++;
            }
          }
        });
      });
    }

    function checkAndFillEmptyAreas() {
      const nodes = nodesRef.current;
      const gridSize = 200; // Size of each check area
      const minNodesPerArea = 1; // Minimum nodes required in each area
      
      for (let x = 0; x < width; x += gridSize) {
        for (let y = 0; y < height; y += gridSize) {
          const nodesInArea = nodes.filter(node => 
            node.x >= x && node.x < x + gridSize &&
            node.y >= y && node.y < y + gridSize
          ).length;
          
          if (nodesInArea < minNodesPerArea && Math.random() < 0.1) {
            // Add a new node in this empty area
            const nodeTypes = Object.keys(NODE_TYPES) as Array<keyof typeof NODE_TYPES>;
            const type = nodeTypes[Math.floor(Math.random() * nodeTypes.length)];
            const vx = (Math.random() - 0.5) * 0.2;
            const vy = (Math.random() - 0.5) * 0.2;
            
            const newNode: NetworkNode = {
              x: x + Math.random() * gridSize,
              y: y + Math.random() * gridSize,
              vx,
              vy,
              originalVx: vx,
              originalVy: vy,
              type,
              size: NODE_TYPES[type].size,
              connections: [],
              pulsePhase: Math.random() * Math.PI * 2
            };
            
            // Find nearby nodes to connect to with better connectivity
            nodes.forEach((otherNode, j) => {
              if (newNode.connections.length < 4) { // Increased max connections
                const dx = newNode.x - otherNode.x;
                const dy = newNode.y - otherNode.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < 180) { // Increased connection range
                  newNode.connections.push(j);
                  // Add reciprocal connection if the other node has space
                  if (otherNode.connections.length < 4) {
                    otherNode.connections.push(nodes.length);
                  }
                }
              }
            });
            
            // Ensure new node isn't isolated
            if (newNode.connections.length === 0) {
              // Find closest node and force connection
              let closestIndex = -1;
              let closestDistance = Infinity;
              
              nodes.forEach((otherNode, j) => {
                const dx = newNode.x - otherNode.x;
                const dy = newNode.y - otherNode.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < closestDistance) {
                  closestDistance = distance;
                  closestIndex = j;
                }
              });
              
              if (closestIndex !== -1) {
                newNode.connections.push(closestIndex);
                if (nodes[closestIndex].connections.length < 4) {
                  nodes[closestIndex].connections.push(nodes.length);
                }
              }
            }
            
            nodes.push(newNode);
          }
        }
      }
    }

    function createDataPacket() {
      const nodes = nodesRef.current;
      if (nodes.length < 2) return;
      
      const fromIndex = Math.floor(Math.random() * nodes.length);
      const fromNode = nodes[fromIndex];
      
      if (fromNode.connections.length > 0) {
        const toIndex = fromNode.connections[Math.floor(Math.random() * fromNode.connections.length)];
        
        packetsRef.current.push({
          fromNode: fromIndex,
          toNode: toIndex,
          progress: 0,
          x: fromNode.x,
          y: fromNode.y
        });
      }
    }

    function draw() {
      if (!ctx) return;

      // Dark tech background
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, "#0F0F23");
      gradient.addColorStop(0.5, "#1a1a2e");
      gradient.addColorStop(1, "#16213e");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      const nodes = nodesRef.current;

      // Update and draw nodes
      nodes.forEach((node, index) => {
        // Natural drift
        node.x += node.vx;
        node.y += node.vy;
        node.pulsePhase += 0.02;

        // Boundary bouncing
        if (node.x <= node.size || node.x >= width - node.size) {
          node.vx = -node.vx;
          node.originalVx = -node.originalVx;
        }
        if (node.y <= node.size || node.y >= height - node.size) {
          node.vy = -node.vy;
          node.originalVy = -node.originalVy;
        }

        // Cursor interaction with elastic return
        if (cursorPosition) {
          const dx = node.x - cursorPosition.x;
          const dy = node.y - cursorPosition.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < repulsionRadius && distance > 0) {
            const repulsionForce = Math.pow((repulsionRadius - distance) / repulsionRadius, 1.5);
            const forceX = (dx / distance) * repulsionForce * 2;
            const forceY = (dy / distance) * repulsionForce * 2;
            
            node.vx = node.originalVx + forceX;
            node.vy = node.originalVy + forceY;
          } else {
            // Stronger elastic return to original velocity
            node.vx += (node.originalVx - node.vx) * 0.15;
            node.vy += (node.originalVy - node.vy) * 0.15;
          }
        }

        // Keep nodes within reasonable bounds (allow some edge overlap but prevent total escape)
        const margin = 50;
        if (node.x < -margin) node.x = width + margin;
        if (node.x > width + margin) node.x = -margin;
        if (node.y < -margin) node.y = height + margin;
        if (node.y > height + margin) node.y = -margin;

        // Draw connections first (behind nodes)
        node.connections.forEach(connectionIndex => {
          const connectedNode = nodes[connectionIndex];
          if (!connectedNode) return;

          // Animated connection line
          ctx.beginPath();
          ctx.strokeStyle = `rgba(64, 224, 208, ${0.3 + Math.sin(Date.now() * 0.002) * 0.2})`;
          ctx.lineWidth = 1;
          ctx.setLineDash([5, 3]);
          ctx.moveTo(node.x, node.y);
          ctx.lineTo(connectedNode.x, connectedNode.y);
          ctx.stroke();
          ctx.setLineDash([]);
        });

        // Draw node with glow and type-specific styling
        const nodeConfig = NODE_TYPES[node.type];
        const pulseSize = Math.sin(node.pulsePhase) * 2;

        // Outer glow
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.size + 3 + pulseSize, 0, Math.PI * 2);
        ctx.fillStyle = `${nodeConfig.color}20`;
        ctx.fill();

        // Main node circle
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.size, 0, Math.PI * 2);
        ctx.fillStyle = nodeConfig.color;
        ctx.fill();

        // Node label
        ctx.fillStyle = '#000';
        ctx.font = `${Math.max(8, node.size - 2)}px monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(nodeConfig.symbol, node.x, node.y);
      });

      // Update and draw data packets
      packetsRef.current = packetsRef.current.filter(packet => {
        const fromNode = nodes[packet.fromNode];
        const toNode = nodes[packet.toNode];
        
        if (!fromNode || !toNode) return false;

        packet.progress += 0.02;
        
        // Linear interpolation for packet position
        packet.x = fromNode.x + (toNode.x - fromNode.x) * packet.progress;
        packet.y = fromNode.y + (toNode.y - fromNode.y) * packet.progress;

        // Draw data packet
        ctx.beginPath();
        ctx.arc(packet.x, packet.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#00FF88';
        ctx.fill();
        
        // Packet trail
        ctx.beginPath();
        ctx.arc(packet.x, packet.y, 6, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 255, 136, 0.3)';
        ctx.fill();

        return packet.progress < 1;
      });

      // Occasionally create new data packets
      if (Math.random() < 0.03) {
        createDataPacket();
      }

      // Check for empty areas and add nodes periodically
      if (Math.random() < 0.005) { // Very occasional check
        checkAndFillEmptyAreas();
      }

      animationFrameRef.current = requestAnimationFrame(draw);
    }

    function handleResize() {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    }

    window.addEventListener("resize", handleResize);
    draw();

    return () => {
      window.removeEventListener("resize", handleResize);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [cursorPosition, repulsionRadius]);

  return (
    <canvas 
      ref={canvasRef} 
      className="absolute inset-0 w-full h-full"
      style={{ zIndex: -1 }}
    />
  );
}