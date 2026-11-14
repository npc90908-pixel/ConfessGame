"use client";

import { useEffect, useState } from "react";
import { isMobileViewport, isTouchDevice } from "@/lib/device";

export interface DeviceInfo {
  isMobile: boolean;
  isTouch: boolean;
  isPortrait: boolean;
}

/** Reactive device info (touch, compact viewport, orientation). */
export function useIsMobile(): DeviceInfo {
  const [info, setInfo] = useState<DeviceInfo>(() => ({
    isMobile: isMobileViewport(),
    isTouch: isTouchDevice(),
    isPortrait: typeof window !== "undefined" ? window.innerHeight > window.innerWidth : false,
  }));

  useEffect(() => {
    const update = () =>
      setInfo({
        isMobile: isMobileViewport(),
        isTouch: isTouchDevice(),
        isPortrait: window.innerHeight > window.innerWidth,
      });
    update();
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
  }, []);

  return info;
}
