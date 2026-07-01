"use client";

import { useRef, useEffect, useState } from "react";

/** Fixed Excel-like zoom for worksheet preview (65%–75%). */
const PREVIEW_ZOOM = 0.7;

/**
 * Centers the register worksheet on an Excel-gray canvas at ~70% zoom.
 */
export function ExcelPreviewViewport({ children }) {
  const outerRef = useRef(null);
  const innerRef = useRef(null);
  const [layoutHeight, setLayoutHeight] = useState(0);

  useEffect(() => {
    const inner = innerRef.current;
    if (!inner) return;

    const update = () => {
      setLayoutHeight(inner.offsetHeight * PREVIEW_ZOOM);
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(inner);
    return () => ro.disconnect();
  }, [children]);

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
              transform: `scale(${PREVIEW_ZOOM})`,
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
