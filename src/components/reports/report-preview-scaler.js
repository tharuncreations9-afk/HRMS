"use client";

import { useRef, useEffect, useState } from "react";

/**
 * Scales wide print-layout previews (e.g. A4 register) to fit container width.
 * When scrollContainer is true, height is not forced on the parent — scrolling happens in the outer box.
 */
export function ReportPreviewScaler({ children, scrollContainer = false }) {
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
  }, [children, scrollContainer]);

  return (
    <div ref={outerRef} className="w-full max-w-full">
      <div
        style={
          scrollContainer
            ? scale < 1 && scaledHeight > 0
              ? { height: scaledHeight }
              : undefined
            : { height: scaledHeight > 0 ? scaledHeight : "auto" }
        }
      >
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
