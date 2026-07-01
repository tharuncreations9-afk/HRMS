"use client";

import { useRef, useEffect, useState } from "react";

const DESKTOP_ZOOM = 0.7;
const MOBILE_BREAKPOINT = 1024;

function useIsMobilePreview() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return isMobile;
}

/**
 * Desktop: ~70% zoom on gray canvas.
 * Mobile: no transform (fixes blank/clipped text) + horizontal scroll with sticky name column.
 */
export function ExcelPreviewViewport({ children, scrollToStart = false }) {
  const outerRef = useRef(null);
  const innerRef = useRef(null);
  const scrollRef = useRef(null);
  const [layoutHeight, setLayoutHeight] = useState(0);
  const isMobile = useIsMobilePreview();

  useEffect(() => {
    if (isMobile) {
      setLayoutHeight(0);
      return;
    }

    const inner = innerRef.current;
    if (!inner) return;

    const update = () => {
      setLayoutHeight(inner.offsetHeight * DESKTOP_ZOOM);
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(inner);
    return () => ro.disconnect();
  }, [children, isMobile]);

  useEffect(() => {
    if (!scrollToStart) return;
    const el = scrollRef.current || outerRef.current;
    if (!el) return;
    el.scrollLeft = 0;
    el.scrollTop = 0;
  }, [scrollToStart, children, isMobile]);

  if (isMobile) {
    return (
      <div
        ref={outerRef}
        className="excel-preview-frame excel-preview-frame--mobile min-h-0 flex-1 overflow-auto rounded-none border border-[#a6a6a6]"
      >
        <p className="no-print excel-mobile-hint">Swipe left/right to view all columns</p>
        <div ref={scrollRef} className="excel-mobile-scroll">
          <div ref={innerRef} className="excel-preview-inner--mobile">
            {children}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={outerRef}
      className="excel-preview-frame min-h-0 flex-1 overflow-auto rounded-none border border-[#a6a6a6]"
    >
      <div className="excel-preview-canvas">
        <div
          style={{
            height: layoutHeight > 0 ? layoutHeight : undefined,
            width: "100%",
            display: "flex",
            justifyContent: "center",
          }}
        >
          <div
            ref={innerRef}
            className="excel-preview-zoom"
            style={{
              transform: `scale(${DESKTOP_ZOOM})`,
              transformOrigin: "top center",
            }}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
