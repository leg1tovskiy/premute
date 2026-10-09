import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

function easeOutCubic(x: number): number {
  return 1 - Math.pow(1 - x, 3);
}

function formatNumberRu(n: number, decimals: number = 0, formatThousands: boolean = true): string {
  if (decimals > 0) {
    const fixed = n.toFixed(decimals);
    if (!formatThousands) return fixed.replace(".", ",");
    const parts = fixed.split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    return parts.join(",");
  }
  const rounded = Math.round(n);
  if (!formatThousands) return String(rounded);
  return String(rounded).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

export function AnimatedNumber({
  value,
  duration = 750,
  decimals,
  prefix = "",
  suffix = "",
  className,
  formatThousands = true,
}: {
  value: number | string | null | undefined;
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  formatThousands?: boolean;
}) {
  const spanRef = useRef<HTMLSpanElement>(null);
  const prevValRef = useRef<number>(0);

  if (value === null || value === undefined) {
    return <span className={className}>—</span>;
  }

  const rawStr = String(value).trim();

  // If ratio like "14 / 20", render two animated numbers
  if (rawStr.includes(" / ")) {
    const [left, right] = rawStr.split(" / ");
    return (
      <span className={className}>
        <AnimatedNumber value={left} duration={duration} formatThousands={formatThousands} />
        {" / "}
        <AnimatedNumber value={right} duration={duration} formatThousands={formatThousands} />
      </span>
    );
  }

  // Detect auto prefix/suffix if not explicitly provided
  let effectivePrefix = prefix;
  let effectiveSuffix = suffix;
  let cleanStr = rawStr;

  if (!prefix && cleanStr.startsWith("+")) {
    effectivePrefix = "+";
    cleanStr = cleanStr.slice(1);
  }
  if (!suffix && cleanStr.endsWith("%")) {
    effectiveSuffix = "%";
    cleanStr = cleanStr.slice(0, -1);
  }

  const cleanNumericStr = cleanStr.replace(/\s+/g, "").replace(",", ".");
  const numericVal = Number(cleanNumericStr);
  const isNumeric = !isNaN(numericVal) && cleanNumericStr !== "";

  // Auto-detect decimals if not explicitly given
  const autoDecimals = decimals !== undefined
    ? decimals
    : cleanNumericStr.includes(".")
      ? cleanNumericStr.split(".")[1]?.length ?? 0
      : 0;

  useEffect(() => {
    if (!isNumeric || !spanRef.current) return;

    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      spanRef.current.textContent = `${effectivePrefix}${formatNumberRu(numericVal, autoDecimals, formatThousands)}${effectiveSuffix}`;
      prevValRef.current = numericVal;
      return;
    }

    const startVal = prevValRef.current;
    const endVal = numericVal;
    const diff = endVal - startVal;

    if (diff === 0 && startVal !== 0) {
      spanRef.current.textContent = `${effectivePrefix}${formatNumberRu(endVal, autoDecimals, formatThousands)}${effectiveSuffix}`;
      return;
    }

    const startTime = performance.now();
    let animId: number;

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutCubic(progress);
      const current = startVal + diff * eased;

      if (spanRef.current) {
        spanRef.current.textContent = `${effectivePrefix}${formatNumberRu(current, autoDecimals, formatThousands)}${effectiveSuffix}`;
      }

      if (progress < 1) {
        animId = requestAnimationFrame(tick);
      } else {
        prevValRef.current = endVal;
        if (spanRef.current) {
          spanRef.current.textContent = `${effectivePrefix}${formatNumberRu(endVal, autoDecimals, formatThousands)}${effectiveSuffix}`;
        }
      }
    };

    animId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [numericVal, duration, autoDecimals, effectivePrefix, effectiveSuffix, formatThousands, isNumeric]);

  if (!isNumeric) {
    return (
      <span className={className}>
        {effectivePrefix}{rawStr}{effectiveSuffix}
      </span>
    );
  }

  const initialText = `${effectivePrefix}${formatNumberRu(0, autoDecimals, formatThousands)}${effectiveSuffix}`;

  return (
    <span ref={spanRef} className={cn("inline-block tabular-nums", className)}>
      {initialText}
    </span>
  );
}

export function AnimatedBlock({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <div
      style={delay > 0 ? { animationDelay: `${delay}ms` } : undefined}
      className={cn("animate-fade-up will-change-[transform,opacity]", className)}
    >
      {children}
    </div>
  );
}
