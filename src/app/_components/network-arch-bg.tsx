"use client";

import React, { useEffect, useRef, useCallback } from "react";

interface NetworkNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  originalVx: number;
  originalVy: number;
  type: 'api' | 'database' | 'service' | 'cache' | 'queue';
  size: number;
  connections: Set<number>; // Changed from array to Set for better performance
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
} as const;

export function NetworkArchitectureBackground({ 
  cursorPosition, 
  repulsionRadius = 300 
}: { cursorPosition?: { x: number; y: number }; repulsionRadius?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nodesRef = useRef<NetworkNode[]>([]);
  const packetsRef = useRef<DataPacket[]>([]);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const lastFillCheckRef = useRef<number>(0);
  const maxNodesRef = useRef<number>(50); // Limit total nodes

  // Memoized initialization function
  const initializeNodes = useCallback((width: number, height: number) => {
    if (nodesRef.current.length > 0) return;

    const nodeTypes = Object.keys(NODE_TYPES) as Array<keyof typeof NODE_TYPES>;
    const numNodes = Math.min(35, maxNodesRef.current);
    
    const gridCols = Math.ceil(Math.sqrt(numNodes));
    const gridRows = Math.ceil(numNodes / gridCols);
    const cellWidth = width / gridCols;
    const cellHeight = height / gridRows;
    
    for (let i = 0; i < numNodes; i++) {
      const gridX = i % gridCols;
      const gridY = Math.floor(i / gridCols);
      
      const baseX = gridX * cellWidth + cellWidth / 2;
      const baseY = gridY * cellHeight + cellHeight / 2;
      const randomOffsetX = (Math.random() - 0.5) * cellWidth * 0.8;
      const randomOffsetY = (Math.random() - 0.5) * cellHeight * 0.8;
      
      const vx = (Math.random() - 0.5) * 0.2;
      const vy = (Math.random() - 0.5) * 0.2;
      const randomTypeIndex = Math.floor(Math.random() * nodeTypes.length);
      const type = nodeTypes[randomTypeIndex] ?? "api";
      
      nodesRef.current.push({
        x: Math.max(NODE_TYPES[type].size, Math.min(width - NODE_TYPES[type].size, baseX + randomOffsetX)),
        y: Math.max(NODE_TYPES[type].size, Math.min(height - NODE_TYPES[type].size, baseY + randomOffsetY)),
        vx,
        vy,
        originalVx: vx,
        originalVy: vy,
        type,
        size: NODE_TYPES[type].size,
        connections: new Set<number>(), // Use Set instead of array
        pulsePhase: Math.random() * Math.PI * 2
      });
    }

    // Create connections between nearby nodes
    nodesRef.current.forEach((node, i) => {
      const maxConnections = 3;
      
      nodesRef.current.forEach((otherNode, j) => {
        if (i !== j && node.connections.size < maxConnections && otherNode.connections.size < maxConnections) {
          const dx = node.x - otherNode.x;
          const dy = node.y - otherNode.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < 150) {
            node.connections.add(j);
            otherNode.connections.add(i); // Add reciprocal connection
          }
        }
      });
    });
  }, []);

  // Optimized function to check and fill empty areas
  const checkAndFillEmptyAreas = useCallback((width: number, height: number, currentTime: number) => {
    // Throttle this expensive operation
    if (currentTime - lastFillCheckRef.current < 2000) return; // Only check every 2 seconds
    lastFillCheckRef.current = currentTime;

    if (nodesRef.current.length >= maxNodesRef.current) return; // Respect node limit

    const nodes = nodesRef.current;
    const gridSize = 200;
    const minNodesPerArea = 1;
    
    for (let x = 0; x < width; x += gridSize) {
      for (let y = 0; y < height; y += gridSize) {
        const nodesInArea = nodes.filter(node => 
          node.x >= x && node.x < x + gridSize &&
          node.y >= y && node.y < y + gridSize
        ).length;
        
        if (nodesInArea < minNodesPerArea && Math.random() < 0.1 && nodes.length < maxNodesRef.current) {
          const nodeTypes = Object.keys(NODE_TYPES) as Array<keyof typeof NODE_TYPES>;
          const randomTypeIndex = Math.floor(Math.random() * nodeTypes.length);
          const type = nodeTypes[randomTypeIndex] ?? "api";
          const vx = (Math.random() - 0.5) * 0.2;
          const vy = (Math.random() - 0.5) * 0.2;
          
          const nodeTypeConfig = NODE_TYPES[type];
          const newNode: NetworkNode = {
            x: Math.max(nodeTypeConfig.size, Math.min(width - nodeTypeConfig.size, x + Math.random() * gridSize)),
            y: Math.max(nodeTypeConfig.size, Math.min(height - nodeTypeConfig.size, y + Math.random() * gridSize)),
            vx,
            vy,
            originalVx: vx,
            originalVy: vy,
            type,
            size: nodeTypeConfig.size,
            connections: new Set<number>(),
            pulsePhase: Math.random() * Math.PI * 2
          };
          
          // Find nearby nodes to connect to
          const newNodeIndex = nodes.length;
          nodes.forEach((otherNode, j) => {
            if (newNode.connections.size < 4 && otherNode.connections.size < 4) {
              const dx = newNode.x - otherNode.x;
              const dy = newNode.y - otherNode.y;
              const distance = Math.sqrt(dx * dx + dy * dy);
              
              if (distance < 180) {
                newNode.connections.add(j);
                otherNode.connections.add(newNodeIndex);
              }
            }
          });
          
          // Ensure new node isn't isolated - Fixed TypeScript error
          if (newNode.connections.size === 0) {
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
            
            // Fixed: Add proper null checking
            if (closestIndex !== -1) {
              const closestNode = nodes[closestIndex];
              if (closestNode) {
                newNode.connections.add(closestIndex);
                closestNode.connections.add(newNodeIndex);
              }
            }
          }
          
          nodes.push(newNode);
          break; // Only add one node per check to prevent overwhelming
        }
      }
    }
  }, []);

  // Optimized data packet creation
  const createDataPacket = useCallback(() => {
    const nodes = nodesRef.current;
    if (nodes.length < 2 || packetsRef.current.length > 20) return; // Limit packets
    
    const fromIndex = Math.floor(Math.random() * nodes.length);
    const fromNode = nodes[fromIndex];
    
    if (fromNode && fromNode.connections.size > 0) {
      const connectionsArray = Array.from(fromNode.connections);
      const toIndex = connectionsArray[Math.floor(Math.random() * connectionsArray.length)];
      
      if (typeof toIndex === "number" && nodes[toIndex]) {
        packetsRef.current.push({
          fromNode: fromIndex,
          toNode: toIndex,
          progress: 0,
          x: fromNode.x,
          y: fromNode.y
        });
      }
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    initializeNodes(width, height);

    function draw() {
      if (!ctx || !canvas) return;

      const currentTime = Date.now();

      // Dark tech background
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, "#0F0F23");
      gradient.addColorStop(0.5, "#1a1a2e");
      gradient.addColorStop(1, "#16213e");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      const nodes = nodesRef.current;

      // Update and draw connections first (more efficient)
      ctx.strokeStyle = `rgba(64, 224, 208, ${0.3 + Math.sin(currentTime * 0.002) * 0.2})`;
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 3]);
      
      nodes.forEach((node, index) => {
        // Update node position
        node.x += node.vx;
        node.y += node.vy;
        node.pulsePhase += 0.02;

        // Boundary bouncing with bounds checking
        if (node.x <= node.size) {
          node.x = node.size;
          node.vx = Math.abs(node.vx);
          node.originalVx = Math.abs(node.originalVx);
        } else if (node.x >= width - node.size) {
          node.x = width - node.size;
          node.vx = -Math.abs(node.vx);
          node.originalVx = -Math.abs(node.originalVx);
        }
        
        if (node.y <= node.size) {
          node.y = node.size;
          node.vy = Math.abs(node.vy);
          node.originalVy = Math.abs(node.originalVy);
        } else if (node.y >= height - node.size) {
          node.y = height - node.size;
          node.vy = -Math.abs(node.vy);
          node.originalVy = -Math.abs(node.originalVy);
        }

        // Cursor interaction
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
            node.vx += (node.originalVx - node.vx) * 0.15;
            node.vy += (node.originalVy - node.vy) * 0.15;
          }
        }

        // Draw connections
        node.connections.forEach(connectionIndex => {
          const connectedNode = nodes[connectionIndex];
          if (connectedNode) {
            ctx.beginPath();
            ctx.moveTo(node.x, node.y);
            ctx.lineTo(connectedNode.x, connectedNode.y);
            ctx.stroke();
          }
        });
      });
      
      ctx.setLineDash([]);

      // Draw nodes
      nodes.forEach((node) => {
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
        packet.x = fromNode.x + (toNode.x - fromNode.x) * packet.progress;
        packet.y = fromNode.y + (toNode.y - fromNode.y) * packet.progress;

        // Draw packet trail
        ctx.beginPath();
        ctx.arc(packet.x, packet.y, 6, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 255, 136, 0.3)';
        ctx.fill();

        // Draw data packet
        ctx.beginPath();
        ctx.arc(packet.x, packet.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#00FF88';
        ctx.fill();

        return packet.progress < 1;
      });

      // Create new data packets occasionally
      if (Math.random() < 0.03) {
        createDataPacket();
      }

      // Check for empty areas (throttled)
      checkAndFillEmptyAreas(width, height, currentTime);

      animationFrameRef.current = requestAnimationFrame(draw);
    }

    function handleResize() {
      if(!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      
      // Reset nodes if canvas size changed significantly
      nodesRef.current.forEach(node => {
        node.x = Math.max(node.size, Math.min(width - node.size, node.x));
        node.y = Math.max(node.size, Math.min(height - node.size, node.y));
      });
    }

    window.addEventListener("resize", handleResize);
    draw();

    return () => {
      window.removeEventListener("resize", handleResize);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [cursorPosition, repulsionRadius, initializeNodes, createDataPacket, checkAndFillEmptyAreas]);

  return (
    <canvas 
      ref={canvasRef} 
      className="absolute inset-0 w-full h-full"
      style={{ zIndex: -1 }}
    />
  );
}