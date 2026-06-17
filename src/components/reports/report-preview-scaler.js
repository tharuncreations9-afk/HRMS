"use client";

import { useRef, useEffect, useState } from "react";

/**
 * Scales wide print-layout previews (e.g. A4 register) to fit narrow screens.
 * On wide screens scale stays 1 — full-size preview.
 */
export function ReportPreviewScaler({ children }) {
  const outerRef = useRef(null);
  const innerRef = useRef(null);
  const [scale, setScale] = useState(1);
  const [scaledHeight, setScaledHeight] = useState(0);

  useEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;

    const update = () => {
      const available = outer.clientWidth;
      const naturalWidth = inner.scrollWidth || inner.offsetWidth;
      if (!available || !naturalWidth) return;

      const nextScale = Math.min(1, available / naturalWidth);
      setScale(nextScale);
      setScaledHeight(inner.offsetHeight * nextScale);
    };

    update();

    const ro = new ResizeObserver(update);
    ro.observe(outer);
    ro.observe(inner);

    return () => ro.disconnect();
  }, [children]);

  return (
    <div ref={outerRef} className="w-full max-w-full">
      <div style={{ height: scaledHeight > 0 ? scaledHeight : "auto" }}>
        <div
          ref={innerRef}
          className="report-preview-scaler-inner origin-top-left"
          style={{
            transform: scale < 1 ? `scale(${scale})` : undefined,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
