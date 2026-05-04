import { useMemo, useState, type CSSProperties, type ReactNode, type Ref } from "react";
import {
  REPORT_TIMELINE_FILTERS,
  buildReportPreviewModel,
  buildTimelineGroups,
  type ReportClinicalNote,
  type ReportColourBreakdownItem,
  type ReportDailyPoint,
  type ReportFeedingSummaryRow,
  type ReportPreviewEvent,
  type ReportPreviewMetric,
  type ReportPreviewModel,
  type ReportPreviewRow,
  type ReportSymptomSummaryRow,
  type ReportTimelineFilter,
  type ReportTimelineGroup,
  type ReportTypeTrendPoint,
} from "../../lib/report-preview-model";
import { poop1Icon, poop2Icon, poop3Icon, poop4Icon, poop5Icon, poop6Icon } from "../../assets/icons";
import type { ReportBriefRow } from "../../lib/report-doctor-brief";
import type { ReportData } from "../../lib/reporting";
import type { Child, UnitSystem } from "../../lib/types";
import { Avatar } from "../child/Avatar";
import { Logo } from "../ui/Logo";

const BASE_REPORT_PAGE_COUNT = 6;
const TIMELINE_FIRST_PAGE_UNITS = 16.5;
const TIMELINE_CONTINUED_PAGE_UNITS = 22;
const TIMELINE_GROUP_HEADER_UNITS = 1.2;
const REPORT_STOOL_TYPE_ICONS: Record<number, string> = {
  1: poop1Icon,
  2: poop2Icon,
  3: poop3Icon,
  4: poop4Icon,
  5: poop5Icon,
  6: poop6Icon,
};
const REPORT_STOOL_TYPE_KEY = [
  { type: 1, label: "Separate hard lumps" },
  { type: 2, label: "Lumpy" },
  { type: 3, label: "Cracked / firm" },
  { type: 4, label: "Smooth & soft" },
  { type: 5, label: "Soft blobs" },
  { type: 6, label: "Mushy / liquid" },
];
type ReportIconName =
  | "bars"
  | "bottle"
  | "calendar"
  | "clipboard"
  | "clock"
  | "diaper"
  | "drop"
  | "flag"
  | "info"
  | "lock"
  | "lungs"
  | "meal"
  | "moon"
  | "poop"
  | "question"
  | "smile"
  | "thermometer"
  | "timeline";

export function ReportPreview({
  child,
  startDate,
  endDate,
  reportData,
  unitSystem,
  previewRef,
  exportOnly = false,
}: {
  child: Child;
  startDate: string;
  endDate: string;
  reportData: ReportData;
  unitSystem: UnitSystem;
  previewRef?: Ref<HTMLElement>;
  exportOnly?: boolean;
}) {
  const [timelineFilter, setTimelineFilter] = useState<ReportTimelineFilter>("full");
  const model = useMemo(
    () => buildReportPreviewModel({ child, startDate, endDate, data: reportData, unitSystem }),
    [child, endDate, reportData, startDate, unitSystem],
  );
  const filteredTimelineGroups = useMemo(
    () => buildTimelineGroups(reportData.timeline, timelineFilter),
    [reportData.timeline, timelineFilter],
  );
  const timelinePages = useMemo(() => chunkTimelineGroups(filteredTimelineGroups), [filteredTimelineGroups]);
  const totalPages = BASE_REPORT_PAGE_COUNT + Math.max(1, timelinePages.length);

  return (
    <section
      ref={previewRef}
      className={exportOnly ? "tt-report-preview tt-report-preview--export" : "tt-report-preview"}
      aria-label="Report preview"
    >
      {!exportOnly && (
        <div className="tt-report-preview__bar no-print">
          <div>
            <p className="tt-report-preview__eyebrow">HTML report preview</p>
            <h2>Doctor-ready report layout</h2>
          </div>
          <button type="button" className="tt-report-print-button" onClick={() => window.print()}>
            Print preview
          </button>
        </div>
      )}

      <div className="tt-report-scroll">
        <BriefOverviewPage model={model} pageNumber={1} totalPages={totalPages} />
        <BriefDetailPage model={model} pageNumber={2} totalPages={totalPages} />
        <PatternOverviewPage model={model} pageNumber={3} totalPages={totalPages} />
        <PatternDetailPage model={model} pageNumber={4} totalPages={totalPages} />
        <ContextOverviewPage model={model} pageNumber={5} totalPages={totalPages} />
        <ContextDetailPage model={model} pageNumber={6} totalPages={totalPages} />
        <TimelinePages
          model={model}
          filter={timelineFilter}
          groups={filteredTimelineGroups}
          pages={timelinePages}
          totalPages={totalPages}
          onFilterChange={setTimelineFilter}
          exportOnly={exportOnly}
        />
      </div>
    </section>
  );
}

function BriefOverviewPage({ model, pageNumber, totalPages }: { model: ReportPreviewModel; pageNumber: number; totalPages: number }) {
  return (
    <ReportPage pageNumber={pageNumber} totalPages={totalPages} footer={model.privacyFooter} variant="brief">
      <ReportPageHeader model={model} title={model.title} />
      <ReportMeta model={model} />

      <section className="tt-report-brief">
        <IconBadge icon="clipboard" tone="alert" size="hero" />
        <div>
          <h2>Pediatrician Brief</h2>
          <p>{model.brief.summary}</p>
        </div>
      </section>

      <section className="tt-concern-grid" aria-label="Key concerns">
        {model.brief.concerns.map((concern) => (
          <ConcernCard key={concern.label} concern={concern} />
        ))}
      </section>

      <section className="tt-report-section" aria-label="Supporting metrics">
        <SectionTitle title="Supporting Metrics" />
        <div className="tt-metric-grid">
          {model.brief.metrics.map((metric) => (
            <MetricTile key={metric.label} metric={metric} />
          ))}
        </div>
      </section>
    </ReportPage>
  );
}

function BriefDetailPage({ model, pageNumber, totalPages }: { model: ReportPreviewModel; pageNumber: number; totalPages: number }) {
  return (
    <ReportPage pageNumber={pageNumber} totalPages={totalPages} footer={model.privacyFooter} variant="brief">
      <ReportPageHeader
        model={model}
        title="Pediatrician Brief"
        subtitle="Recent events and appointment questions from the selected report period."
      />
      <div className="tt-report-two-column">
        <section className="tt-report-panel" aria-label="Last important events">
          <SectionTitle title="Last Important Events" icon="calendar" compact />
          <div className="tt-event-list">
            {model.brief.lastImportantEvents.map((event) => (
              <ImportantEvent key={event.label} event={event} />
            ))}
          </div>
        </section>

        <section className="tt-report-panel" aria-label="Questions to ask the doctor">
          <SectionTitle title="Questions to Ask the Doctor" icon="question" compact />
          <ul className="tt-question-list">
            {model.brief.questions.map((question) => (
              <li key={question}>{question}</li>
            ))}
          </ul>
        </section>
      </div>
    </ReportPage>
  );
}

function PatternOverviewPage({ model, pageNumber, totalPages }: { model: ReportPreviewModel; pageNumber: number; totalPages: number }) {
  return (
    <ReportPage pageNumber={pageNumber} totalPages={totalPages} footer={model.privacyFooter} variant="pattern">
      <ReportPageHeader
        model={model}
        title="Poop + Diaper Pattern Review"
        subtitle="Daily stool output, diaper output, and tummy pattern signals for the selected period."
      />

      <div className="tt-metric-grid tt-metric-grid--compact">
        {model.pattern.metrics.map((metric) => (
          <MetricTile key={metric.label} metric={metric} />
        ))}
      </div>

      <div className="tt-report-chart-grid">
        <DailyStoolChart points={model.pattern.dailyPoints} noPoopDates={model.pattern.noPoopDates} />
        <StoolTypeTrend points={model.pattern.stoolTypeTrend} />
      </div>
    </ReportPage>
  );
}

function PatternDetailPage({ model, pageNumber, totalPages }: { model: ReportPreviewModel; pageNumber: number; totalPages: number }) {
  return (
    <ReportPage pageNumber={pageNumber} totalPages={totalPages} footer={model.privacyFooter} variant="pattern">
      <ReportPageHeader
        model={model}
        title="Poop + Diaper Pattern Review"
        subtitle="Colour, diaper output, hydration notes, and clinical notes for the selected period."
      />

      <div className="tt-report-chart-grid">
        <ColourBreakdown items={model.pattern.colourBreakdown} />
        <DailyDiaperChart points={model.pattern.dailyPoints} />
      </div>

      <div className="tt-report-two-column tt-report-two-column--bottom">
        <section className="tt-report-panel">
          <SectionTitle title="Hydration Notes" icon="drop" compact />
          <InfoRows rows={model.pattern.hydrationRows} />
        </section>
        <section className="tt-report-panel">
          <SectionTitle title="At-a-Glance Clinical Notes" icon="clipboard" tone="alert" compact />
          <ClinicalNotesTable rows={model.pattern.clinicalNotes} />
        </section>
      </div>
    </ReportPage>
  );
}

function ContextOverviewPage({ model, pageNumber, totalPages }: { model: ReportPreviewModel; pageNumber: number; totalPages: number }) {
  return (
    <ReportPage pageNumber={pageNumber} totalPages={totalPages} footer={model.privacyFooter} variant="context">
      <ReportPageHeader model={model} title="Tummy Context" />
      <ReportMeta model={model} compact />

      <section className="tt-care-notes">
        <IconBadge icon="clipboard" tone="alert" size="hero" />
        <h2>Care Notes</h2>
        <div className="tt-care-notes__grid">
          {model.context.careNotes.map((note) => (
            <ToneRow key={`${note.label}-${note.value}`} row={note} />
          ))}
        </div>
      </section>

      <div className="tt-report-two-column">
        <section className="tt-report-panel">
          <SectionTitle title="Poop & Tummy Summary" icon="poop" compact />
          <InfoRows rows={model.context.poopSummaryRows} />
        </section>
        <section className="tt-report-panel">
          <SectionTitle title="Diaper Output" icon="drop" compact />
          <InfoRows rows={model.context.diaperRows} />
        </section>
      </div>

      <section className="tt-report-panel tt-report-panel--episode">
        <IconBadge icon="thermometer" tone="alert" size="hero" />
        <div>
          <h2>Episode Context</h2>
          <InfoRows rows={model.context.episodeRows} columns />
        </div>
      </section>
    </ReportPage>
  );
}

function ContextDetailPage({ model, pageNumber, totalPages }: { model: ReportPreviewModel; pageNumber: number; totalPages: number }) {
  return (
    <ReportPage pageNumber={pageNumber} totalPages={totalPages} footer={model.privacyFooter} variant="context">
      <ReportPageHeader
        model={model}
        title="Tummy Context"
        subtitle="Symptoms, feeding context, and tracking summary for clinical review."
      />

      <div className="tt-report-two-column">
        <section className="tt-report-panel">
          <SectionTitle title="Symptoms" icon="thermometer" tone="alert" compact />
          <SymptomTable rows={model.context.symptomRows} />
        </section>
        <section className="tt-report-panel">
          <SectionTitle title="Feeding Summary" icon="bottle" compact />
          <FeedingTable rows={model.context.feedingRows} />
        </section>
      </div>

      <section className="tt-report-note">
        <strong>Tracking summary only.</strong> These insights reflect logged observations. They are not medical advice.
      </section>
    </ReportPage>
  );
}

function TimelinePages({
  model,
  filter,
  groups,
  pages,
  totalPages,
  onFilterChange,
  exportOnly,
}: {
  model: ReportPreviewModel;
  filter: ReportTimelineFilter;
  groups: ReportTimelineGroup[];
  pages: ReportTimelineGroup[][];
  totalPages: number;
  onFilterChange: (filter: ReportTimelineFilter) => void;
  exportOnly: boolean;
}) {
  const visiblePages = pages.length > 0 ? pages : [[]];

  return (
    <>
      {visiblePages.map((pageGroups, index) => (
        <ReportPage
          key={`${filter}-${index}`}
          pageNumber={BASE_REPORT_PAGE_COUNT + 1 + index}
          totalPages={totalPages}
          footer={model.privacyFooter}
          variant="timeline"
        >
          <ReportPageHeader
            model={model}
            title={index === 0 ? "Clinical Timeline Appendix" : "Clinical Timeline Appendix (continued)"}
            subtitle="Chronological log of key events, symptoms, diapers, and feeding for clinical review."
          />
          {index === 0 && <ReportMeta model={model} timelineNote="Dated events may be more useful than averages when logging is sparse." compact />}
          {index === 0 && (
            <TimelineFilterTabs filter={filter} onFilterChange={onFilterChange} exportOnly={exportOnly} />
          )}
          <TimelineTable groups={pageGroups} empty={groups.length === 0} />
        </ReportPage>
      ))}
    </>
  );
}

function ReportPage({
  children,
  footer,
  pageNumber,
  totalPages,
  variant,
}: {
  children: ReactNode;
  footer: string;
  pageNumber: number;
  totalPages: number;
  variant?: "brief" | "pattern" | "context" | "timeline";
}) {
  return (
    <article
      className={variant ? `tt-report-page tt-report-page--${variant}` : "tt-report-page"}
      aria-label={`Report page ${pageNumber} of ${totalPages}`}
    >
      <div className="tt-report-page__content">
        {children}
      </div>
      <div className="tt-report-footer">
        <IconBadge icon="lock" tone="default" size="sm" />
        <span>{footer}</span>
        <span>Page {pageNumber}</span>
      </div>
    </article>
  );
}

function ReportPageHeader({
  model,
  title,
  subtitle,
}: {
  model: ReportPreviewModel;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="tt-report-header">
      <div className="tt-report-brand-block">
        <div className="tt-report-brand">
          <Logo className="tt-report-logo" />
          <span>Tiny Tummy</span>
        </div>
        <div className="tt-report-title-block">
          <h1>{title}</h1>
          {subtitle && <p>{subtitle}</p>}
        </div>
      </div>
      <div className="tt-report-patient-card">
        <Avatar
          childId={model.childId}
          name={model.childName}
          color={model.childAvatarColor}
          size="lg"
          className="tt-report-patient-avatar"
        />
        <div className="tt-report-patient-details">
          <strong>{model.childName}</strong>
          <span>DOB {model.dobLabel}</span>
          <span>{model.ageLabel}</span>
          <span>Feeding {model.feedingLabel.toLowerCase()}</span>
        </div>
      </div>
    </div>
  );
}

function ReportMeta({
  model,
  compact = false,
  timelineNote,
}: {
  model: ReportPreviewModel;
  compact?: boolean;
  timelineNote?: string;
}) {
  return (
    <div className={compact ? "tt-report-meta tt-report-meta--compact" : "tt-report-meta"}>
      <div className="tt-report-meta__item">
        <IconBadge icon="calendar" size="sm" />
        <div>
          <span>Report period</span>
          <strong>{model.periodLabel}</strong>
        </div>
      </div>
      <div className="tt-report-meta__item">
        <IconBadge icon="clock" size="sm" />
        <div>
          <span>Generated</span>
          <strong>{model.generatedLabel}</strong>
        </div>
      </div>
      <div className="tt-report-meta__note">
        <IconBadge icon="info" size="xs" />
        <p>{timelineNote ?? model.disclaimer}</p>
      </div>
    </div>
  );
}

function SectionTitle({
  title,
  icon,
  tone = "default",
  compact = false,
}: {
  title: string;
  icon?: ReportIconName;
  tone?: ReportPreviewModel["brief"]["metrics"][number]["tone"];
  compact?: boolean;
}) {
  return (
    <div className={compact ? "tt-section-title tt-section-title--compact" : "tt-section-title"}>
      {icon && <IconBadge icon={icon} tone={tone} size="sm" />}
      <h2>{title}</h2>
    </div>
  );
}

function ConcernCard({ concern }: { concern: ReportBriefRow }) {
  return (
    <article className={`tt-concern-card tt-tone-${concern.tone}`}>
      <div className="tt-concern-card__head">
        <IconBadge icon={getIconForLabel(concern.label)} tone={concern.tone} />
        <span>{concern.label}</span>
      </div>
      <strong>{concern.value}</strong>
      <p>{concern.detail}</p>
    </article>
  );
}

function MetricTile({ metric }: { metric: ReportPreviewMetric }) {
  return (
    <article className={`tt-metric-tile tt-tone-${metric.tone}`}>
      <IconBadge icon={getIconForLabel(metric.label)} tone={metric.tone} />
      <strong>{metric.value}</strong>
      <span>{metric.label}</span>
      {metric.detail && <p>{metric.detail}</p>}
    </article>
  );
}

function ImportantEvent({ event }: { event: ReportPreviewEvent }) {
  return (
    <div className={`tt-event-row tt-tone-${event.tone}`}>
      <IconBadge icon={getIconForLabel(event.label)} tone={event.tone} size="sm" />
      <strong>{event.label}</strong>
      <i aria-hidden="true" />
      <p>
        {event.value}
        {event.detail && <small>{event.detail}</small>}
      </p>
    </div>
  );
}

function ToneRow({ row }: { row: ReportPreviewRow }) {
  return (
    <article className={`tt-tone-row tt-tone-${row.tone ?? "default"}`}>
      <IconBadge icon={getIconForLabel(row.label)} tone={row.tone ?? "default"} size="sm" />
      <strong>{row.value}</strong>
      {row.detail && <p>{row.detail}</p>}
    </article>
  );
}

function InfoRows({ rows, columns = false }: { rows: ReportPreviewRow[]; columns?: boolean }) {
  return (
    <div className={columns ? "tt-info-rows tt-info-rows--columns" : "tt-info-rows"}>
      {rows.map((row) => (
        <div key={`${row.label}-${row.value}`} className={`tt-info-row tt-tone-${row.tone ?? "default"}`}>
          <IconBadge icon={getIconForLabel(row.label)} tone={row.tone ?? "default"} size="sm" />
          <span>{row.label}</span>
          <strong>{row.value}</strong>
          {row.detail && <p>{row.detail}</p>}
        </div>
      ))}
    </div>
  );
}

function DailyStoolChart({ points, noPoopDates }: { points: ReportDailyPoint[]; noPoopDates: string[] }) {
  const max = Math.max(1, ...points.map((point) => point.stoolCount));

  return (
    <section className="tt-chart-card">
      <SectionTitle title="Daily Stool Output" icon="poop" tone="alert" compact />
      <p className="tt-chart-subtitle">Stool count by recent day</p>
      <div className="tt-bar-chart-wrap">
        <div className="tt-bar-axis" aria-hidden="true"><span>{max}</span><span>{Math.max(1, Math.round(max / 2))}</span><span>0</span></div>
        <div className="tt-bar-chart" style={{ "--point-count": points.length } as CSSProperties}>
        {points.map((point) => (
          <div key={point.key} className="tt-bar-point">
            <span className="tt-bar-value">{point.stoolCount}</span>
            <div className="tt-bar-track">
              {point.stoolCount > 0 && (
                <div className="tt-bar-fill tt-bar-fill--stool" style={{ height: `${Math.max(4, (point.stoolCount / max) * 100)}%` }} />
              )}
              {point.noPoopCount > 0 && <div className="tt-no-poop-marker">NP</div>}
            </div>
            <span className="tt-bar-label">{point.weekday}<small>{point.dateLabel}</small></span>
          </div>
        ))}
        </div>
      </div>
      <p className="tt-chart-note">
        No-poop days: {noPoopDates.length > 0 ? noPoopDates.join(", ") : "none marked"}
      </p>
    </section>
  );
}

function DailyDiaperChart({ points }: { points: ReportDailyPoint[] }) {
  const max = Math.max(1, ...points.map((point) => point.wetOnly + point.dirtyOnly + point.mixed));

  return (
    <section className="tt-chart-card">
      <SectionTitle title="Daily Diaper Output" icon="diaper" tone="alert" compact />
      <p className="tt-chart-subtitle">Wet, dirty, and mixed diapers by recent day</p>
      <div className="tt-chart-legend">
        <span><i className="tt-legend-box tt-legend-wet" />Wet</span>
        <span><i className="tt-legend-box tt-legend-dirty" />Dirty</span>
        <span><i className="tt-legend-box tt-legend-mixed" />Mixed</span>
      </div>
      <div className="tt-bar-chart-wrap">
        <div className="tt-bar-axis" aria-hidden="true"><span>{max}</span><span>{Math.max(1, Math.round(max / 2))}</span><span>0</span></div>
        <div className="tt-bar-chart tt-bar-chart--stacked" style={{ "--point-count": points.length } as CSSProperties}>
        {points.map((point) => {
          const total = point.wetOnly + point.dirtyOnly + point.mixed;
          return (
            <div key={point.key} className="tt-bar-point">
              <span className="tt-bar-value">{total}</span>
              <div className="tt-bar-track">
                {total > 0 && (
                  <div className="tt-stacked-bar" style={{ height: `${Math.max(4, (total / max) * 100)}%` }}>
                    {point.mixed > 0 && <span className="tt-stack tt-stack--mixed" style={{ flexGrow: point.mixed }}>{point.mixed}</span>}
                    {point.dirtyOnly > 0 && <span className="tt-stack tt-stack--dirty" style={{ flexGrow: point.dirtyOnly }}>{point.dirtyOnly}</span>}
                    {point.wetOnly > 0 && <span className="tt-stack tt-stack--wet" style={{ flexGrow: point.wetOnly }}>{point.wetOnly}</span>}
                  </div>
                )}
              </div>
              <span className="tt-bar-label">{point.weekday}<small>{point.dateLabel}</small></span>
            </div>
          );
        })}
        </div>
      </div>
    </section>
  );
}

function StoolTypeTrend({ points }: { points: ReportTypeTrendPoint[] }) {
  return (
    <section className="tt-chart-card">
      <SectionTitle title="Stool Type Trend" icon="bars" tone="alert" compact />
      <p className="tt-chart-subtitle">Bristol-style stool types over time</p>
      {points.length > 0 ? (
        <>
          <div className="tt-type-trend">
            {points.map((point) => (
              <div key={point.id} className={`tt-type-point tt-tone-${point.tone}`}>
                <strong>{point.label}</strong>
                <span>{point.dateLabel}</span>
              </div>
            ))}
          </div>
          <div className="tt-stool-type-key">
            {REPORT_STOOL_TYPE_KEY.map((item) => (
              <span key={item.type}>
                <img src={REPORT_STOOL_TYPE_ICONS[item.type]} alt="" aria-hidden="true" />
                <strong>T{item.type}</strong>
                {item.label}
              </span>
            ))}
          </div>
        </>
      ) : (
        <EmptyChart text="No stool type values were recorded in this period." />
      )}
    </section>
  );
}

function ColourBreakdown({ items }: { items: ReportColourBreakdownItem[] }) {
  const gradient = buildDonutGradient(items);

  return (
    <section className="tt-chart-card">
      <SectionTitle title="Stool Colour Breakdown" icon="drop" tone="alert" compact />
      <p className="tt-chart-subtitle">Colours observed in this period</p>
      {items.length > 0 ? (
        <div className="tt-colour-breakdown">
          <div className="tt-donut" style={{ "--donut-gradient": gradient } as CSSProperties}>
            <span>{items[0]?.percent ?? 0}%</span>
          </div>
          <div className="tt-colour-list">
            {items.map((item) => (
              <div key={item.value} className={item.isRedFlag ? "is-red-flag" : ""}>
                <span className="tt-colour-swatch" style={{ background: item.color }} />
                <strong>{item.label}<small>{item.isRedFlag ? "Red-flag colour" : item.value === items[0]?.value ? "Most common" : "Observed"}</small></strong>
                <span>{item.percent}% ({item.count})</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <EmptyChart text="No stool colours were recorded in this period." />
      )}
    </section>
  );
}

function ClinicalNotesTable({ rows }: { rows: ReportClinicalNote[] }) {
  return (
    <div className="tt-clinical-table">
      {rows.map((row) => (
        <div key={row.topic} className={`tt-tone-${row.tone}`}>
          <IconBadge icon={getIconForLabel(row.topic)} tone={row.tone} size="xs" />
          <strong>{row.topic}</strong>
          <p>{row.note}</p>
        </div>
      ))}
    </div>
  );
}

function SymptomTable({ rows }: { rows: ReportSymptomSummaryRow[] }) {
  if (rows.length === 0) return <EmptyTable text="No symptoms were logged in this period." />;

  return (
    <div className="tt-symptom-table">
      <div className="tt-table-head">
        <span>Symptom</span>
        <span>Severity</span>
        <span>Latest</span>
        <span>Parent note</span>
      </div>
      {rows.map((row) => (
        <div key={row.symptom} className={`tt-table-row tt-tone-${row.tone}`}>
          <IconBadge icon={getIconForLabel(row.symptom)} tone={row.tone} size="xs" />
          <strong>{row.symptom}</strong>
          <SeverityDots score={row.severityScore} label={row.severityLabel} />
          <span>{row.latest}</span>
          <p>{row.note}</p>
        </div>
      ))}
    </div>
  );
}

function FeedingTable({ rows }: { rows: ReportFeedingSummaryRow[] }) {
  if (rows.length === 0) return <EmptyTable text="No feeding logs were included in this report." />;

  return (
    <div className="tt-feeding-table">
      <div className="tt-table-head">
        <span>Type</span>
        <span>Entries</span>
        <span>Notes</span>
      </div>
      {rows.map((row) => (
        <div key={row.type} className="tt-table-row">
          <IconBadge icon={getIconForLabel(row.type)} size="xs" />
          <strong>{row.type}</strong>
          <span>{row.entries}</span>
          <p>{row.notes}</p>
        </div>
      ))}
    </div>
  );
}

function SeverityDots({ score, label }: { score: number; label: string }) {
  return (
    <span className="tt-severity-dots" aria-label={label}>
      {[1, 2, 3, 4].map((dot) => (
        <i key={dot} className={dot <= score ? "is-filled" : ""} />
      ))}
    </span>
  );
}

function TimelineTable({ groups, empty }: { groups: ReportTimelineGroup[]; empty: boolean }) {
  if (empty) return <EmptyTable text="No timeline events match this filter." />;

  return (
    <div className="tt-timeline-table">
      <div className="tt-timeline-head">
        <span><ReportIcon icon="calendar" /> Date / Time</span>
        <span><ReportIcon icon="poop" /> Event</span>
        <span><ReportIcon icon="info" /> Key Details</span>
        <span><ReportIcon icon="smile" /> Parent Note</span>
      </div>
      {groups.map((group) => (
        <div key={group.dateLabel} className="tt-timeline-group">
          <div className="tt-timeline-date">{group.dateLabel}</div>
          {group.rows.map((row) => (
            <div key={row.id} className={`tt-timeline-row tt-tone-${row.tone}`}>
              <span>{row.time}</span>
              <strong><ReportIcon icon={getIconForLabel(row.event)} /> {row.event}</strong>
              <p>{row.details}</p>
              <p>{row.note}</p>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function TimelineFilterTabs({
  filter,
  onFilterChange,
  exportOnly,
}: {
  filter: ReportTimelineFilter;
  onFilterChange: (filter: ReportTimelineFilter) => void;
  exportOnly: boolean;
}) {
  return (
    <div className="tt-timeline-tabs" aria-label="Timeline filters">
      {REPORT_TIMELINE_FILTERS.map((item) => (
        <button
          type="button"
          key={item.value}
          className={item.value === filter ? "is-active" : ""}
          aria-pressed={item.value === filter}
          tabIndex={exportOnly ? -1 : undefined}
          onClick={() => onFilterChange(item.value)}
        >
          <IconBadge icon={getTimelineFilterIcon(item.value)} tone={item.value === filter ? "alert" : "default"} size="xs" />
          {item.label}
        </button>
      ))}
    </div>
  );
}

function IconBadge({
  icon,
  tone = "default",
  size = "md",
}: {
  icon: ReportIconName;
  tone?: ReportPreviewMetric["tone"];
  size?: "xs" | "sm" | "md" | "hero";
}) {
  return (
    <b className={`tt-icon-badge tt-icon-badge--${size} tt-tone-${tone}`} aria-hidden="true">
      <b className="tt-icon-badge__inner">
        <ReportIcon icon={icon} />
      </b>
    </b>
  );
}

function ReportIcon({ icon }: { icon: ReportIconName }) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 2.1,
    vectorEffect: "non-scaling-stroke" as const,
  };

  switch (icon) {
    case "bars":
      return (
        <svg viewBox="0 0 24 24">
          <path {...common} d="M5.5 18.5V13" />
          <path {...common} d="M10 18.5V9.5" />
          <path {...common} d="M14.5 18.5v-12" />
          <path {...common} d="M19 18.5V4.5" />
          <path {...common} d="M4 18.5h16" />
        </svg>
      );
    case "bottle":
      return (
        <svg viewBox="0 0 24 24">
          <path {...common} d="M9.5 4.5h5" />
          <path {...common} d="M10.5 4.5v3l-1.8 2.2v8.6a2.2 2.2 0 0 0 2.2 2.2h2.2a2.2 2.2 0 0 0 2.2-2.2V9.7l-1.8-2.2v-3" />
          <path {...common} d="M9.1 12.5h5.8" />
          <path {...common} d="M9.1 16h5.8" />
        </svg>
      );
    case "calendar":
      return (
        <svg viewBox="0 0 24 24">
          <path {...common} d="M7 3.8v3" />
          <path {...common} d="M17 3.8v3" />
          <rect {...common} x="4.5" y="6" width="15" height="13.5" rx="2" />
          <path {...common} d="M4.8 10h14.4" />
          <path {...common} d="M8 13h2.2" />
          <path {...common} d="M13.8 13H16" />
          <path {...common} d="M8 16h2.2" />
        </svg>
      );
    case "clipboard":
      return (
        <svg viewBox="0 0 24 24">
          <path {...common} d="M9.2 4.6h5.6l.8 2.2h2.1a1.7 1.7 0 0 1 1.7 1.7v10.2a1.7 1.7 0 0 1-1.7 1.7H6.3a1.7 1.7 0 0 1-1.7-1.7V8.5a1.7 1.7 0 0 1 1.7-1.7h2.1l.8-2.2Z" />
          <path {...common} d="M8.6 6.8h6.8" />
          <path {...common} d="M8.2 11.5h.1" />
          <path {...common} d="M11 11.5h5" />
          <path {...common} d="M8.2 15h.1" />
          <path {...common} d="M11 15h5" />
        </svg>
      );
    case "clock":
      return (
        <svg viewBox="0 0 24 24">
          <circle {...common} cx="12" cy="12" r="8" />
          <path {...common} d="M12 7.5V12l3.2 2.2" />
        </svg>
      );
    case "diaper":
      return (
        <svg viewBox="0 0 24 24">
          <path {...common} d="M5 7.2c2 1.2 4.3 1.8 7 1.8s5-.6 7-1.8v7.4c0 3.2-2.4 5.7-5.7 5.7h-2.6C7.4 20.3 5 17.8 5 14.6V7.2Z" />
          <path {...common} d="M8 9.1c.2 2.5 1.5 4 4 4s3.8-1.5 4-4" />
          <path {...common} d="M8 15.6h.1" />
          <path {...common} d="M15.9 15.6h.1" />
        </svg>
      );
    case "drop":
      return (
        <svg viewBox="0 0 24 24">
          <path {...common} d="M12 3.7c4.1 4.9 6.1 8.4 6.1 10.7a6.1 6.1 0 0 1-12.2 0C5.9 12.1 8 8.5 12 3.7Z" />
        </svg>
      );
    case "flag":
      return (
        <svg viewBox="0 0 24 24">
          <path {...common} d="M6.5 20.2V4.8" />
          <path {...common} d="M7 5.2h9.4l-1 3.1 1 3.1H7" />
        </svg>
      );
    case "info":
      return (
        <svg viewBox="0 0 24 24">
          <circle {...common} cx="12" cy="12" r="8" />
          <path {...common} d="M12 10.8v5.3" />
          <path {...common} d="M12 7.8h.1" />
        </svg>
      );
    case "lock":
      return (
        <svg viewBox="0 0 24 24">
          <rect {...common} x="5.3" y="10.2" width="13.4" height="9.2" rx="1.8" />
          <path {...common} d="M8.4 10.2V8.1a3.6 3.6 0 0 1 7.2 0v2.1" />
          <path {...common} d="M12 14.1v2.1" />
        </svg>
      );
    case "lungs":
      return (
        <svg viewBox="0 0 24 24">
          <path {...common} d="M12 4v8" />
          <path {...common} d="M12 12c-2.8-2.7-5.6-2.4-6.7.8-.8 2.3-1 5.1.9 6.2 1.8 1.1 4.2-.6 4.8-3.2L12 12Z" />
          <path {...common} d="M12 12c2.8-2.7 5.6-2.4 6.7.8.8 2.3 1 5.1-.9 6.2-1.8 1.1-4.2-.6-4.8-3.2L12 12Z" />
        </svg>
      );
    case "meal":
      return (
        <svg viewBox="0 0 24 24">
          <path {...common} d="M7 4.5v6.2" />
          <path {...common} d="M4.8 4.5v6.2" />
          <path {...common} d="M9.2 4.5v6.2" />
          <path {...common} d="M7 10.7v8.8" />
          <path {...common} d="M15 4.8c3.1 2.8 4.2 6.2 3.5 10.2h-4.9c-.5-3.7 0-7.1 1.4-10.2Z" />
          <path {...common} d="M16.1 15v4.5" />
        </svg>
      );
    case "moon":
      return (
        <svg viewBox="0 0 24 24">
          <path {...common} d="M18.7 14.1A7 7 0 1 1 10 5.3a5.6 5.6 0 0 0 8.7 8.8Z" />
          <path {...common} d="m16.5 5.1.4 1 .9.4-.9.4-.4 1-.4-1-.9-.4.9-.4.4-1Z" />
        </svg>
      );
    case "poop":
      return (
        <svg viewBox="0 0 24 24">
          <path {...common} d="M12.3 4.2c-1.8 1.7-2.4 3.1-1.8 4.3-2 .3-3.3 1.4-3.3 3.1 0 .8.3 1.5.8 2-1.5.4-2.6 1.6-2.6 3.1 0 2.1 1.8 3.4 4.1 3.4h5c2.3 0 4.1-1.3 4.1-3.4 0-1.5-1-2.7-2.6-3.1.5-.5.8-1.2.8-2 0-1.9-1.5-3-3.8-3.1.8-1.4.6-2.9-.7-4.3Z" />
          <path {...common} d="M8 13.7h8" />
          <path {...common} d="M7.4 17h9.2" />
        </svg>
      );
    case "question":
      return (
        <svg viewBox="0 0 24 24">
          <circle {...common} cx="12" cy="12" r="8" />
          <path {...common} d="M9.7 9.3a2.5 2.5 0 1 1 3.1 2.4c-.7.3-.9.8-.9 1.7" />
          <path {...common} d="M12 16.7h.1" />
        </svg>
      );
    case "smile":
      return (
        <svg viewBox="0 0 24 24">
          <circle {...common} cx="12" cy="12" r="8" />
          <path {...common} d="M8.8 10h.1" />
          <path {...common} d="M15.1 10h.1" />
          <path {...common} d="M8.9 14.3c1.9 2.1 4.3 2.1 6.2 0" />
        </svg>
      );
    case "thermometer":
      return (
        <svg viewBox="0 0 24 24">
          <path {...common} d="M10 14.2V5.9a2 2 0 0 1 4 0v8.3a4.3 4.3 0 1 1-4 0Z" />
          <path {...common} d="M12 7.7v8.4" />
        </svg>
      );
    case "timeline":
      return (
        <svg viewBox="0 0 24 24">
          <path {...common} d="M7 5.5h10" />
          <path {...common} d="M7 12h10" />
          <path {...common} d="M7 18.5h10" />
          <path {...common} d="M4.5 5.5h.1" />
          <path {...common} d="M4.5 12h.1" />
          <path {...common} d="M4.5 18.5h.1" />
        </svg>
      );
  }
}

function getIconForLabel(label: string): ReportIconName {
  const value = label.toLowerCase();
  if (value.includes("cough") || value.includes("congestion")) return "lungs";
  if (value.includes("feed") || value.includes("breast") || value.includes("bottle") || value.includes("formula")) return "bottle";
  if (value.includes("solid") || value.includes("appetite") || value.includes("food")) return "meal";
  if (value.includes("wet") || value.includes("urine") || value.includes("hydration")) return "drop";
  if (value.includes("diaper") || value.includes("dirty") || value.includes("mixed")) return "diaper";
  if (value.includes("red") || value.includes("flag") || value.includes("colour") || value.includes("color")) return "flag";
  if (value.includes("symptom") || value.includes("fever") || value.includes("episode") || value.includes("illness") || value.includes("temp")) return "thermometer";
  if (value.includes("no-poop") || value.includes("sleep")) return "moon";
  if (value.includes("stool") || value.includes("poop") || value.includes("consistency")) return "poop";
  if (value.includes("type") || value.includes("quality") || value.includes("pattern") || value.includes("trend")) return "bars";
  if (value.includes("date") || value.includes("streak") || value.includes("latest") || value.includes("last")) return "calendar";
  return "info";
}

function getTimelineFilterIcon(filter: ReportTimelineFilter): ReportIconName {
  if (filter === "poopDiaper") return "poop";
  if (filter === "symptomsEpisodes") return "thermometer";
  if (filter === "doctorBrief") return "bottle";
  return "timeline";
}

function buildDonutGradient(items: ReportColourBreakdownItem[]): string {
  if (items.length === 0) return "#efe8dc 0 100%";

  let cursor = 0;
  const stops = items.map((item, index) => {
    const start = cursor;
    cursor = index === items.length - 1 ? 100 : Math.min(100, cursor + item.percent);
    return `${item.color} ${start}% ${cursor}%`;
  });

  return stops.join(", ");
}

function EmptyChart({ text }: { text: string }) {
  return <div className="tt-empty-chart">{text}</div>;
}

function EmptyTable({ text }: { text: string }) {
  return <div className="tt-empty-table">{text}</div>;
}

function chunkTimelineGroups(groups: ReportTimelineGroup[]): ReportTimelineGroup[][] {
  const pages: ReportTimelineGroup[][] = [];
  let current: ReportTimelineGroup[] = [];
  let currentUnits = 0;

  const currentBudget = () => (pages.length === 0 ? TIMELINE_FIRST_PAGE_UNITS : TIMELINE_CONTINUED_PAGE_UNITS);
  const pushCurrent = () => {
    if (current.length === 0) return;
    pages.push(current);
    current = [];
    currentUnits = 0;
  };

  for (const group of groups) {
    let remainingRows = group.rows;
    let isContinuation = false;

    while (remainingRows.length > 0) {
      const availableUnits = currentBudget() - currentUnits;
      const fittingRows = takeTimelineRowsForBudget(remainingRows, availableUnits);

      if (fittingRows.length === 0 && current.length > 0) {
        pushCurrent();
        continue;
      }

      const rowsForPage = fittingRows.length > 0 ? fittingRows : [remainingRows[0]];
      const pageGroup = {
        dateLabel: isContinuation ? `${group.dateLabel} (continued)` : group.dateLabel,
        rows: rowsForPage,
      };

      current.push(pageGroup);
      currentUnits += estimateTimelineGroupUnits(pageGroup);
      remainingRows = remainingRows.slice(rowsForPage.length);
      isContinuation = true;

      if (remainingRows.length > 0) {
        pushCurrent();
      }
    }
  }

  pushCurrent();

  return pages;
}

function takeTimelineRowsForBudget(
  rows: ReportTimelineGroup["rows"],
  availableUnits: number,
): ReportTimelineGroup["rows"] {
  const taken: ReportTimelineGroup["rows"] = [];
  let usedUnits = TIMELINE_GROUP_HEADER_UNITS;

  for (const row of rows) {
    const nextUnits = estimateTimelineRowUnits(row);
    if (taken.length > 0 && usedUnits + nextUnits > availableUnits) {
      break;
    }
    if (taken.length === 0 && usedUnits + nextUnits > availableUnits) {
      break;
    }
    taken.push(row);
    usedUnits += nextUnits;
  }

  return taken;
}

function estimateTimelineGroupUnits(group: ReportTimelineGroup) {
  return TIMELINE_GROUP_HEADER_UNITS + group.rows.reduce((total, row) => total + estimateTimelineRowUnits(row), 0);
}

function estimateTimelineRowUnits(row: ReportTimelineGroup["rows"][number]) {
  const textLength = `${row.time} ${row.event} ${row.details} ${row.note}`.length;
  return 1 + Math.max(0, Math.ceil((textLength - 72) / 72)) * 0.45;
}
