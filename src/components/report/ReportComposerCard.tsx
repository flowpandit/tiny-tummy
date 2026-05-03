import { DatePicker } from "../ui/date-picker";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { REPORT_OPTION_TOGGLES } from "../../lib/report-view-model";
import type { ReportOptions } from "../../lib/reporting";

export function ReportComposerCard({
  today,
  startDate,
  endDate,
  isGenerating,
  options,
  onStartDateChange,
  onEndDateChange,
  onGenerate,
  onToggleOption,
}: {
  today: string;
  startDate: string;
  endDate: string;
  isGenerating: boolean;
  options: ReportOptions;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onGenerate: () => void;
  onToggleOption: (key: keyof ReportOptions) => void;
}) {
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
              Pick the range and context to include in the PDF report.
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
            Include
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {REPORT_OPTION_TOGGLES.map((item) => (
              <button
                key={item.key}
                type="button"
                aria-pressed={options[item.key]}
                onClick={() => onToggleOption(item.key)}
                className={`rounded-full border px-3 py-1.5 text-[0.68rem] font-semibold transition-colors md:text-[0.74rem] ${
                  options[item.key]
                    ? "border-[var(--color-primary)]/20 bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                    : "border-[var(--color-home-card-border)] bg-[var(--color-tracker-pill-surface)] text-[var(--color-text-secondary)] hover:bg-[var(--color-tracker-pill-surface-hover)]"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
