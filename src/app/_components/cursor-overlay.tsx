"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { NetworkArchitectureBackground } from "./network-arch-bg";

interface CursorPosition {
  x: number;
  y: number;
  timestamp: number;
}

export function CursorRevealOverlay({ children, underLayer }: {
  children: React.ReactNode;
  underLayer: React.ReactNode;
}) {
  const [cursorTrail, setCursorTrail] = useState<CursorPosition[]>([]);
  const [latestCursor, setLatestCursor] = useState<{ x: number; y: number } | null>(null);
  const [isOverLink, setIsOverLink] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);

  // Configuration
  const trailLength = 8; // Number of trail positions
  const trailDecay = 500; // Trail lifespan in ms

  // Check if the element or any of its parents is a link
  const isElementOrParentLink = useCallback((element: Element): boolean => {
    let current: Element | null = element;
    while (current && current !== containerRef.current) {
      if (current.tagName.toLowerCase() === 'a' ||
        current.hasAttribute('href') ||
        current.getAttribute('role') === 'button' ||
        current.classList.contains('cursor-no-reveal')) { // Optional: add custom class for exclusion
        return true;
      }
      current = current.parentElement;
    }
    return false;
  }, []);

  // Update trail with timestamped cursor points
  const updateCursorTrail = useCallback((x: number, y: number) => {
    const timestamp = Date.now();
    setCursorTrail(prev => {
      const newTrail = [{ x, y, timestamp }, ...prev];
      return newTrail.filter(pos => timestamp - pos.timestamp < trailDecay).slice(0, trailLength);
    });
    // Also update latest cursor for constellation repulsion
    setLatestCursor({ x, y });
  }, [trailLength, trailDecay]);

  // Mouse move handler within container that updates both trail and latest cursor
  useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Check if cursor is over a link
        const elementUnderCursor = document.elementFromPoint(e.clientX, e.clientY);
        const overLink = elementUnderCursor ? isElementOrParentLink(elementUnderCursor) : false;
        setIsOverLink(overLink);

        // Only update cursor trail if not over a link
        if (!overLink) {
          updateCursorTrail(x, y);
        } else {
          // Clear the trail when over a link (optional - you might want to keep existing trail)
          setCursorTrail([]);
        }
      }
    }

    const container = containerRef.current;
    if (container) {
      container.addEventListener("mousemove", handleMouseMove);
      return () => container.removeEventListener("mousemove", handleMouseMove);
    }
  }, [updateCursorTrail, isElementOrParentLink]);

  // Periodically clean up old trail positions
  useEffect(() => {
    const cleanUpTrail = () => {
      const now = Date.now();
      setCursorTrail(prev => prev.filter(pos => now - pos.timestamp < trailDecay));
      animationFrameRef.current = requestAnimationFrame(cleanUpTrail);
    };
    animationFrameRef.current = requestAnimationFrame(cleanUpTrail);
    return () => {
      if (animationFrameRef.current !== undefined) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [trailDecay]);

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden">
      {/* Constellation background with repulsion based on latest cursor */}
      <NetworkArchitectureBackground cursorPosition={isOverLink ? undefined : latestCursor ?? undefined} />

      {/* Main content layer - always visible */}
      <div className="relative w-full h-full bg-transparent z-10">
        {children}
      </div>

      {/* Reveal layers - multiple circles for cursor trail effect */}
      {!isOverLink && cursorTrail.map(position => {
        const age = Date.now() - position.timestamp;
        const normalizedAge = Math.min(age / trailDecay, 1);
        // Opacity and size decrease for trailing effect
        const opacity = (1 - normalizedAge) * 0.8;
        const sizeMultiplier = 1 - normalizedAge * 0.3;
        const radius = 100 * sizeMultiplier;
        const blurRadius = 40 * sizeMultiplier;

        if (opacity <= 0) return null;

        return (
          <div
            key={`${position.x}-${position.y}-${position.timestamp}`}
            className="absolute inset-0 pointer-events-none z-20"
            style={{
              opacity,
              maskImage: `radial-gradient(circle ${radius}px at ${position.x}px ${position.y}px, black 0%, black ${radius * 0.8}px, transparent ${radius + blurRadius}px)`,
              WebkitMaskImage: `radial-gradient(circle ${radius}px at ${position.x}px ${position.y}px, black 0%, black ${radius * 0.8}px, transparent ${radius + blurRadius}px)`,
            }}
          >
            {underLayer}
          </div>
        );
      })}
    </div>
  );
}