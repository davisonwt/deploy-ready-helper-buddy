import { useEffect, useRef } from 'react';

interface RenderMonitorProps {
  name: string;
  enabled?: boolean;
}

export function RenderMonitor({ name, enabled = import.meta.env.DEV }: RenderMonitorProps) {
  const renderCount = useRef(0);
  const lastRender = useRef(Date.now());

  useEffect(() => {
    if (!enabled) return;

    renderCount.current++;
    const now = Date.now();
    const timeSinceLastRender = now - lastRender.current;
    lastRender.current = now;

    // Warn if component renders too frequently
    if (renderCount.current > 10 && timeSinceLastRender < 100) {
      console.warn(
        `⚠️ ${name} is rendering very frequently:`,
        {
          renderCount: renderCount.current,
          timeSinceLastRender: `${timeSinceLastRender}ms`,
          timestamp: new Date().toISOString()
        }
      );
    } else if (import.meta.env.DEV) {
      console.log(
        `🔄 ${name} render #${renderCount.current}`,
        `(${timeSinceLastRender}ms since last render)`
      );
    }
  });

  return null;
}

// Hook version for inline use
export function useRenderMonitor(name: string, enabled = import.meta.env.DEV) {
  const renderCount = useRef(0);
  const lastRender = useRef(Date.now());

  useEffect(() => {
    if (!enabled) return;

    renderCount.current++;
    const now = Date.now();
    const timeSinceLastRender = now - lastRender.current;
    lastRender.current = now;

    if (renderCount.current > 10 && timeSinceLastRender < 100) {
      console.warn(
        `⚠️ ${name} is rendering very frequently:`,
        {
          renderCount: renderCount.current,
          timeSinceLastRender: `${timeSinceLastRender}ms`,
        }
      );
    }
  });

  return renderCount.current;
}
