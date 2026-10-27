import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type RefObject,
} from 'react';
import { useTranslation } from 'react-i18next';
import type { DailySales } from '@/api/types';
import { cn } from '@/lib/cn';
import { formatDate, formatMoney } from '@/lib/format';
import { chartTicks, compactMoney } from './chartScale';

const PLOT_HEIGHT = 180;
const AXIS_BAND = 28;
const LEFT_GUTTER = 64;
const RIGHT_GUTTER = 8;
const TOP_GUTTER = 8;
const MAX_BAR = 24;
const BAR_GAP = 2;
const FALLBACK_WIDTH = 640;

function useWidth(ref: RefObject<HTMLDivElement | null>): number {
  const [width, setWidth] = useState(FALLBACK_WIDTH);
  useEffect(() => {
    const element = ref.current;
    if (!element || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setWidth(Math.max(240, Math.floor(entry.contentRect.width)));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);
  return width;
}

export function DailySalesChart({ days }: { days: DailySales[] }) {
  const { t, i18n } = useTranslation('clinic');
  const containerRef = useRef<HTMLDivElement>(null);
  const width = useWidth(containerRef);
  const [active, setActive] = useState<number | null>(null);

  const max = Math.max(0, ...days.map((day) => day.revenue));
  const ticks = chartTicks(max);
  const top = ticks[ticks.length - 1] ?? 1;
  const plotWidth = width - LEFT_GUTTER - RIGHT_GUTTER;
  const slot = plotWidth / Math.max(1, days.length);
  const barWidth = Math.max(2, Math.min(MAX_BAR, slot - BAR_GAP));
  const labelEvery = slot >= 22 ? 1 : slot >= 12 ? 5 : 10;
  const y = (value: number) =>
    TOP_GUTTER + PLOT_HEIGHT - (value / top) * PLOT_HEIGHT;
  const height = TOP_GUTTER + PLOT_HEIGHT + AXIS_BAND;
  const activeDay = active === null ? undefined : days[active];

  const indexAt = (event: PointerEvent<SVGRectElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    const index = Math.floor((event.clientX - box.left) / slot);
    return Math.min(days.length - 1, Math.max(0, index));
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const last = days.length - 1;
    const current = active ?? 0;
    const next =
      event.key === 'ArrowRight'
        ? Math.min(last, current + 1)
        : event.key === 'ArrowLeft'
          ? Math.max(0, current - 1)
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? last
              : null;
    if (next === null) return;
    event.preventDefault();
    setActive(next);
  };

  const activeCenter = LEFT_GUTTER + (active ?? 0) * slot + slot / 2;
  const tooltipOnRight = (active ?? 0) < days.length / 2;

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      role="group"
      aria-label={t('salesReport.chartKeyboard')}
      onKeyDown={onKeyDown}
      onFocus={() => setActive((current) => current ?? 0)}
      onBlur={() => setActive(null)}
      className="relative rounded-xl"
    >
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        aria-hidden="true"
        className="block max-w-full"
      >
        {ticks.map((tick) => (
          <g key={tick}>
            <line
              x1={LEFT_GUTTER}
              x2={width - RIGHT_GUTTER}
              y1={y(tick)}
              y2={y(tick)}
              strokeWidth={1}
              className="stroke-line"
            />
            <text
              x={LEFT_GUTTER - 8}
              y={y(tick)}
              dy="0.32em"
              textAnchor="end"
              className="fill-fg-muted text-xs tabular-nums"
            >
              {compactMoney(tick, i18n.language)}
            </text>
          </g>
        ))}
        {days.map((day, index) => {
          const barHeight = (day.revenue / top) * PLOT_HEIGHT;
          const x = LEFT_GUTTER + index * slot + (slot - barWidth) / 2;
          const baseline = TOP_GUTTER + PLOT_HEIGHT;
          const radius = Math.min(4, barWidth / 2, barHeight);
          const dayNumber = Number(day.date.slice(8, 10));
          const showLabel =
            dayNumber === 1 || dayNumber % labelEvery === 0 || labelEvery === 1;
          return (
            <g key={day.date}>
              {barHeight > 0 && (
                <path
                  d={`M${x},${baseline}V${baseline - barHeight + radius}Q${x},${baseline - barHeight} ${x + radius},${baseline - barHeight}H${x + barWidth - radius}Q${x + barWidth},${baseline - barHeight} ${x + barWidth},${baseline - barHeight + radius}V${baseline}Z`}
                  className={
                    active === index
                      ? 'fill-accent light:fill-accent-fg'
                      : 'fill-chart-bar'
                  }
                />
              )}
              {showLabel && (
                <text
                  x={LEFT_GUTTER + index * slot + slot / 2}
                  y={baseline + 18}
                  textAnchor="middle"
                  className="fill-fg-muted text-xs tabular-nums"
                >
                  {dayNumber}
                </text>
              )}
            </g>
          );
        })}
        <line
          x1={LEFT_GUTTER}
          x2={width - RIGHT_GUTTER}
          y1={TOP_GUTTER + PLOT_HEIGHT}
          y2={TOP_GUTTER + PLOT_HEIGHT}
          strokeWidth={1}
          className="stroke-input"
        />
        {activeDay && (
          <line
            x1={LEFT_GUTTER + (active ?? 0) * slot + slot / 2}
            x2={LEFT_GUTTER + (active ?? 0) * slot + slot / 2}
            y1={TOP_GUTTER}
            y2={TOP_GUTTER + PLOT_HEIGHT}
            strokeWidth={1}
            opacity={0.5}
            className="stroke-input"
          />
        )}
        <rect
          x={LEFT_GUTTER}
          y={0}
          width={plotWidth}
          height={height}
          fill="transparent"
          onPointerMove={(event) => setActive(indexAt(event))}
          onPointerLeave={() => setActive(null)}
        />
      </svg>
      <div
        aria-live="polite"
        className={cn(
          'pointer-events-none absolute top-0 w-44 rounded-xl bg-surface px-3 py-2 text-sm text-fg shadow-soft ring-1 ring-line',
          !tooltipOnRight && '-translate-x-full',
          !activeDay && 'sr-only',
        )}
        style={
          activeDay
            ? {
                left: tooltipOnRight
                  ? activeCenter + barWidth / 2 + 8
                  : activeCenter - barWidth / 2 - 8,
              }
            : undefined
        }
      >
        {activeDay && (
          <>
            <p className="text-base font-extrabold text-fg tabular-nums">
              {formatMoney(activeDay.revenue, i18n.language)}
            </p>
            <p className="font-semibold text-fg-muted">
              {formatDate(activeDay.date, i18n.language, {
                day: 'numeric',
                month: 'long',
                weekday: 'short',
              })}
            </p>
            <p className="mt-1 text-fg-muted">
              {t('salesReport.tooltipProfit', {
                value: formatMoney(activeDay.profit, i18n.language),
              })}
            </p>
            <p className="text-fg-muted">
              {t('salesReport.tooltipCount', { count: activeDay.salesCount })}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
