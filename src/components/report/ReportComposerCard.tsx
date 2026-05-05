import { DatePicker } from "../ui/date-picker";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import {
  REPORT_KIND_OPTIONS,
  getReportCoreItems,
  getReportKindOption,
  getReportOptionToggles,
} from "../../lib/report-view-model";
import type { ReportKind, ReportOptions } from "../../lib/reporting";

export function ReportComposerCard({
  today,
  startDate,
  endDate,
  isGenerating,
  reportKind,
  options,
  onReportKindChange,
  onStartDateChange,
  onEndDateChange,
  onGenerate,
  onToggleOption,
}: {
  today: string;
  startDate: string;
  endDate: string;
  isGenerating: boolean;
  reportKind: ReportKind;
  options: ReportOptions;
  onReportKindChange: (value: ReportKind) => void;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onGenerate: () => void;
  onToggleOption: (key: keyof ReportOptions) => void;
}) {
  const selectedReportKind = getReportKindOption(reportKind);
  const coreItems = getReportCoreItems(reportKind);
  const optionToggles = getReportOptionToggles(reportKind);

  return (
    <Card
      className="relative z-10 overflow-hidden rounded-[20px] border shadow-[var(--shadow-home-card)] backdrop-blur-sm md:rounded-[24px]"
      style={{
        background: "var(--color-home-card-surface)",
        borderColor: "var(--color-home-card-border)",
      }}
    >
      <CardContent className="p-4 md:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[var(--color-text)] md:text-[0.74rem]">
              Report setup
            </p>
            <p className="mt-1 max-w-[46ch] text-[0.74rem] leading-snug text-[var(--color-text-secondary)] md:text-[0.82rem]">
              Pick the report type, range, and context for the PDF.
            </p>
          </div>
          <Button
            variant="cta"
            size="sm"
            className="shrink-0"
            onClick={onGenerate}
            disabled={isGenerating}
          >
            {isGenerating ? "Generating..." : "Generate"}
          </Button>
        </div>

        <div className="mt-4">
          <p className="mb-2 text-[0.66rem] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-soft)]">
            Report type
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {REPORT_KIND_OPTIONS.map((item) => {
              const isSelected = item.value === reportKind;
              return (
                <button
                  key={item.value}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => onReportKindChange(item.value)}
                  className={`rounded-[16px] border px-3 py-2 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/35 ${
                    isSelected
                      ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-on-primary)] shadow-[var(--shadow-soft)]"
                      : "border-[var(--color-home-card-border)] bg-[var(--color-tracker-pill-surface)] text-[var(--color-text-secondary)] hover:bg-[var(--color-tracker-pill-surface-hover)]"
                  }`}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="block text-[0.76rem] font-semibold md:text-[0.82rem]">{item.label}</span>
                    {isSelected && (
                      <span className="rounded-full bg-[var(--color-on-primary)]/15 px-2 py-0.5 text-[0.58rem] font-bold uppercase tracking-[0.1em]">
                        Selected
                      </span>
                    )}
                  </span>
                  <span className={`mt-0.5 block text-[0.66rem] leading-snug md:text-[0.72rem] ${isSelected ? "text-[var(--color-on-primary)]/85" : ""}`}>
                    {item.description}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-[0.66rem] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-soft)]">
              From
            </label>
            <DatePicker
              value={startDate}
              onChange={onStartDateChange}
              max={endDate}
              label="Start date"
              dismissOnDocumentClick
              overlayOffsetY={48}
              usePortal
            />
          </div>
          <div>
            <label className="mb-1 block text-[0.66rem] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-soft)]">
              To
            </label>
            <DatePicker
              value={endDate}
              onChange={onEndDateChange}
              min={startDate}
              max={today}
              label="End date"
              dismissOnDocumentClick
              overlayOffsetY={48}
              usePortal
            />
          </div>
        </div>

        <div className="mt-4 rounded-[16px] border border-[var(--color-home-card-border)] bg-[var(--color-tracker-panel-surface)] p-3">
          <p className="text-[0.66rem] font-semibold uppercase tracking-[0.16em] text-[var(--color-text)] md:text-[0.72rem]">
            Always included
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {coreItems.map((item) => (
              <span
                key={item}
                className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-primary)] bg-[var(--color-primary)] px-3 py-1.5 text-[0.68rem] font-semibold text-[var(--color-on-primary)] shadow-[var(--shadow-soft)] md:text-[0.74rem]"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-on-primary)]" />
                {item}
              </span>
            ))}
          </div>
          <p className="mt-2 text-[0.66rem] leading-snug text-[var(--color-text-secondary)] md:text-[0.72rem]">
            {selectedReportKind.description}
          </p>
        </div>

        <div className="mt-3 rounded-[16px] border border-[var(--color-home-card-border)] bg-[var(--color-tracker-panel-surface)] p-3">
          <p className="text-[0.66rem] font-semibold uppercase tracking-[0.16em] text-[var(--color-text)] md:text-[0.72rem]">
            Add context
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {optionToggles.map((item) => (
              <button
                key={item.key}
                type="button"
                aria-pressed={options[item.key]}
                onClick={() => onToggleOption(item.key)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[0.68rem] font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/35 md:text-[0.74rem] ${
                  options[item.key]
                    ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-on-primary)] shadow-[var(--shadow-soft)]"
                    : "border-[var(--color-home-card-border)] bg-[var(--color-tracker-pill-surface)] text-[var(--color-text-secondary)] hover:bg-[var(--color-tracker-pill-surface-hover)]"
                }`}
              >
                {options[item.key] && (
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-on-primary)]" />
                )}
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
