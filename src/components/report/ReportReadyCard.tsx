import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";

export function ReportReadyCard({
  title,
  subtitle,
  detail,
  hasReportableData,
  saveHelpText,
  saveLabel,
  onSave,
}: {
  title: string;
  subtitle: string;
  detail: string;
  hasReportableData: boolean;
  saveHelpText: string;
  saveLabel: string;
  onSave: () => void;
}) {
  return (
    <Card
      className="overflow-hidden rounded-[18px] border shadow-[var(--shadow-home-card)] backdrop-blur-sm md:rounded-[24px]"
      style={{
        background: hasReportableData
          ? "var(--gradient-tracker-insight-growth)"
          : "var(--color-home-card-surface)",
        borderColor: "var(--color-home-card-border)",
      }}
    >
      <CardContent className="p-4 md:p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[var(--color-text)] md:text-[0.74rem]">
              {hasReportableData ? "Ready to share" : "No reportable data"}
            </p>
            <p className="mt-2 text-[1.05rem] font-semibold leading-tight tracking-[-0.03em] text-[var(--color-text)] md:text-[1.2rem]">
              {title}
            </p>
            <p className="mt-1 text-[0.78rem] leading-snug text-[var(--color-text-secondary)] md:text-[0.84rem]">
              {subtitle}
            </p>
            <p className="mt-3 max-w-[54ch] text-[0.72rem] leading-snug text-[var(--color-text-soft)] md:text-[0.78rem]">
              {hasReportableData
                ? detail
                : "Try expanding the date range. The picker defaults around the child's latest recorded activity when available."}
            </p>
          </div>

          <div className="shrink-0 md:w-[190px]">
            <Button
              variant="cta"
              className="w-full"
              onClick={onSave}
              disabled={!hasReportableData}
            >
              {saveLabel}
            </Button>
            <p className="mt-2 text-center text-[0.68rem] leading-snug text-[var(--color-text-soft)] md:text-[0.72rem]">
              {saveHelpText}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
