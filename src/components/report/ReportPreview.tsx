import { Card, CardContent } from "../ui/card";
import { Logo } from "../ui/Logo";
import { cn } from "../../lib/cn";
import type {
  ReportPdfChart,
  ReportPdfChip,
  ReportPdfPayload,
  ReportPdfSection,
  ReportPdfStat,
  ReportPdfSummaryCard,
  ReportPdfTimelineRow,
} from "../../lib/report-pdf";

interface ReportPreviewProps {
  payload: ReportPdfPayload;
}

const CHIP_TONE_CLASSES: Record<ReportPdfChip["tone"], string> = {
  alert: "border-[var(--color-alert)]/18 bg-[var(--color-alert-bg)] text-[var(--color-alert)]",
  caution: "border-[var(--color-caution)]/18 bg-[var(--color-caution-bg)] text-[var(--color-caution)]",
  info: "border-[var(--color-info)]/18 bg-[var(--color-info-bg)] text-[var(--color-info)]",
};

const SUMMARY_TONE_CLASSES: Record<ReportPdfSummaryCard["tone"], string> = {
  default: "border-[var(--color-border)] bg-[var(--color-bg)]",
  alert: "border-[var(--color-alert)]/18 bg-[var(--color-alert-bg)]",
  caution: "border-[var(--color-caution)]/18 bg-[var(--color-caution-bg)]",
  info: "border-[var(--color-info)]/18 bg-[var(--color-info-bg)]",
  healthy: "border-[var(--color-healthy)]/18 bg-[var(--color-healthy-bg)]",
};

const PREVIEW_CARD_CLASS = "overflow-hidden rounded-[18px] border shadow-[var(--shadow-home-card)] backdrop-blur-sm md:rounded-[24px]";

const PREVIEW_CARD_STYLE = {
  background: "var(--color-home-card-surface)",
  borderColor: "var(--color-home-card-border)",
};

export function ReportPreview({ payload }: ReportPreviewProps) {
  return (
    <div className="space-y-3 md:space-y-5">
      <Card className={PREVIEW_CARD_CLASS} style={PREVIEW_CARD_STYLE}>
        <CardContent className="space-y-4 p-4 md:space-y-5 md:p-5">
          <header className="flex flex-col gap-3 border-b border-[var(--color-home-card-border)] pb-4 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <Logo className="h-10 w-10 shrink-0 md:h-11 md:w-11" />
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-text-soft)]">
                    Tiny Tummy
                  </p>
                  <h3 className="mt-1 text-[1.25rem] font-semibold leading-tight tracking-[-0.03em] text-[var(--color-text)] md:text-[1.65rem]">
                    {payload.title}
                  </h3>
                </div>
              </div>
              <p className="mt-3 max-w-[68ch] text-sm leading-relaxed text-[var(--color-text-secondary)]">
                {payload.patientSummary}
              </p>
            </div>

            <div className="shrink-0 md:text-right">
              <p className="text-sm font-medium text-[var(--color-text)]">{payload.subtitle}</p>
              <p className="mt-1 text-xs text-[var(--color-text-soft)]">{payload.generatedAtLabel}</p>
            </div>
          </header>

          {payload.attentionChips.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {payload.attentionChips.map((chip) => (
                <div
                  key={`${chip.tone}-${chip.text}`}
                  className={cn(
                    "rounded-[var(--radius-full)] border px-3 py-2 text-[11px] font-semibold tracking-[0.12em] uppercase",
                    CHIP_TONE_CLASSES[chip.tone],
                  )}
                >
                  {chip.text}
                </div>
              ))}
            </div>
          )}

          <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {payload.dashboardStats.map((stat) => (
              <StatCard key={stat.label} stat={stat} />
            ))}
          </section>

          <section className="grid gap-3 md:grid-cols-2">
            {payload.charts.map((chart) => (
              <ChartCard key={chart.title} chart={chart} />
            ))}
          </section>

          <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {payload.summaryCards.map((card) => (
              <SummaryCard key={card.title} card={card} />
            ))}
          </section>
        </CardContent>
      </Card>

      <Card className={PREVIEW_CARD_CLASS} style={PREVIEW_CARD_STYLE}>
        <CardContent className="space-y-3 p-4 md:p-5">
          <div>
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[var(--color-text)] md:text-[0.74rem]">
              Clinical context
            </p>
            <p className="mt-1 text-[0.74rem] leading-snug text-[var(--color-text-secondary)] md:text-[0.82rem]">
              A preview of the context sections included in the PDF.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {payload.contextSections.length === 0 ? (
              <p className="text-sm text-[var(--color-text-secondary)]">
                No extra clinical context is included for this date range.
              </p>
            ) : (
              payload.contextSections.map((section) => (
                <SectionCard key={section.title} section={section} />
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Card className={PREVIEW_CARD_CLASS} style={PREVIEW_CARD_STYLE}>
        <CardContent className="space-y-3 p-4 md:p-5">
          <div>
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[var(--color-text)] md:text-[0.74rem]">
              Timeline appendix
            </p>
            <p className="mt-1 text-[0.74rem] leading-snug text-[var(--color-text-secondary)] md:text-[0.82rem]">
              The first entries from the detailed event log.
            </p>
          </div>
          <div className="space-y-2">
            {payload.timeline.slice(0, 6).map((row) => (
              <TimelineRow key={`${row.dateTime}-${row.eventType}-${row.details}`} row={row} />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ stat }: { stat: ReportPdfStat }) {
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-strong)] p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-soft)]">
        {stat.label}
      </p>
      <p className="mt-2 text-[1.55rem] font-semibold leading-none text-[var(--color-text)]">
        {stat.value}
      </p>
      {stat.detail && (
        <p className="mt-2 text-xs leading-relaxed text-[var(--color-text-secondary)]">{stat.detail}</p>
      )}
    </div>
  );
}

function SummaryCard({ card }: { card: ReportPdfSummaryCard }) {
  return (
    <div className={cn("rounded-[var(--radius-md)] border p-4", SUMMARY_TONE_CLASSES[card.tone])}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-soft)]">
        {card.title}
      </p>
      <p className="mt-2 text-[1.45rem] font-semibold leading-tight text-[var(--color-text)]">
        {card.value}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">{card.detail}</p>
    </div>
  );
}

function SectionCard({ section }: { section: ReportPdfSection }) {
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-strong)] p-4">
      <p className="text-sm font-semibold text-[var(--color-text)]">{section.title}</p>
      {section.rows.length === 0 ? (
        <p className="mt-3 text-sm text-[var(--color-text-secondary)]">{section.emptyText}</p>
      ) : (
        <div className="mt-3 space-y-2">
          {section.rows.slice(0, 3).map((row) => (
            <div key={`${section.title}-${row.title}-${row.meta ?? ""}`} className="border-b border-[var(--color-border)] pb-2 last:border-b-0 last:pb-0">
              <p className="text-sm font-medium text-[var(--color-text)]">{row.title}</p>
              {row.meta && <p className="mt-1 text-xs text-[var(--color-text-soft)]">{row.meta}</p>}
              {row.detail && (
                <p className="mt-1 text-xs leading-relaxed text-[var(--color-text-secondary)]">{row.detail}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TimelineRow({ row }: { row: ReportPdfTimelineRow }) {
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-strong)] p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-[var(--color-text)]">{row.eventType}</p>
          <p className="mt-1 text-xs text-[var(--color-text-soft)]">{row.dateTime}</p>
        </div>
      </div>
      <p className="mt-2 text-sm text-[var(--color-text-secondary)]">{row.details}</p>
      {row.note && <p className="mt-1 text-xs leading-relaxed text-[var(--color-text-secondary)]">{row.note}</p>}
    </div>
  );
}

function ChartCard({ chart }: { chart: ReportPdfChart }) {
  const maxValue = Math.max(
    1,
    ...chart.points.flatMap((point) => [point.primaryValue, point.secondaryValue ?? 0]),
  );

  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-strong)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[var(--color-text)]">{chart.title}</p>
          <p className="mt-1 text-xs text-[var(--color-text-soft)]">
            {chart.primaryLabel}
            {chart.secondaryLabel ? ` · ${chart.secondaryLabel}` : ""}
          </p>
        </div>
      </div>

      <div className="mt-4 h-28">
        {chart.kind === "line" ? (
          <LineChart chart={chart} maxValue={maxValue} />
        ) : (
          <BarChart chart={chart} maxValue={maxValue} />
        )}
      </div>
    </div>
  );
}

function BarChart({ chart, maxValue }: { chart: ReportPdfChart; maxValue: number }) {
  return (
    <div className="flex h-full items-end gap-2">
      {chart.points.map((point) => {
        const primaryHeight = `${Math.max((point.primaryValue / maxValue) * 100, point.primaryValue > 0 ? 12 : 0)}%`;
        const secondaryHeight = point.secondaryValue
          ? `${Math.max((point.secondaryValue / maxValue) * 100, 10)}%`
          : "0%";

        return (
          <div key={point.label} className="flex min-w-0 flex-1 flex-col items-center gap-2">
            <div className="flex h-full w-full items-end justify-center gap-1 rounded-[18px] bg-[linear-gradient(180deg,rgba(251,245,234,0)_0%,rgba(251,245,234,0.92)_100%)] px-1 pb-1">
              <div
                className="w-full max-w-4 rounded-[999px] bg-[linear-gradient(180deg,var(--color-chart-warm-start)_0%,var(--color-chart-warm-end)_100%)]"
                style={{ height: primaryHeight }}
              />
              {chart.secondaryLabel && (
                <div
                  className="w-full max-w-4 rounded-[999px] bg-[linear-gradient(180deg,var(--color-chart-spectrum-mid)_0%,var(--color-chart-spectrum-end)_100%)]"
                  style={{ height: secondaryHeight }}
                />
              )}
            </div>
            <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--color-text-soft)]">
              {point.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function LineChart({ chart, maxValue }: { chart: ReportPdfChart; maxValue: number }) {
  const chartWidth = 320;
  const chartHeight = 112;
  const stepX = chart.points.length > 1 ? chartWidth / (chart.points.length - 1) : chartWidth;

  const points = chart.points.map((point, index) => {
    const x = chart.points.length === 1 ? chartWidth / 2 : index * stepX;
    const y = chartHeight - (point.primaryValue / maxValue) * (chartHeight - 18) - 9;
    return { x, y, label: point.label };
  });

  const path = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");

  return (
    <div className="space-y-2">
      <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="h-20 w-full overflow-visible">
        <line x1="0" y1={chartHeight - 1} x2={chartWidth} y2={chartHeight - 1} stroke="rgba(120, 92, 69, 0.12)" strokeWidth="1" />
        <path d={path} fill="none" stroke="var(--color-chart-warm-end)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((point) => (
          <circle
            key={point.label}
            cx={point.x}
            cy={point.y}
            r="4.5"
            fill="white"
            stroke="var(--color-chart-warm-end)"
            strokeWidth="2.5"
          />
        ))}
      </svg>
      <div className="flex items-center justify-between gap-2">
        {chart.points.map((point) => (
          <span key={point.label} className="min-w-0 text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--color-text-soft)]">
            {point.label}
          </span>
        ))}
      </div>
    </div>
  );
}
