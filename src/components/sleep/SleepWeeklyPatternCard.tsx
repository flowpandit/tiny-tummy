import { Card, CardContent, CardHeader } from "../ui/card";
import { SectionHeading } from "../ui/page-layout";
import { TrackerWeekBarChart, TrackerWeekSwitcher } from "../tracking/TrackerPrimitives";

export function SleepWeeklyPatternCard({
  filledWeek,
  maxWeekOffset,
  summary,
  title,
  weekOffset,
  onNewer,
  onOlder,
}: {
  filledWeek: Array<{ date: string; count: number; weekdayLabel: string }>;
  maxWeekOffset: number;
  summary: string;
  title: string;
  weekOffset: number;
  onNewer: () => void;
  onOlder: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <SectionHeading
          title="Weekly pattern"
          description="Seven-day sleep totals with week-by-week browsing."
          action={(
            <TrackerWeekSwitcher
              weekOffset={weekOffset}
              maxWeekOffset={maxWeekOffset}
              onOlder={onOlder}
              onNewer={onNewer}
            />
          )}
        />
      </CardHeader>
      <CardContent>
        <TrackerWeekBarChart
          data={filledWeek.map((day) => ({ ...day, value: day.count }))}
          title={title}
          summary={summary}
          gradient="linear-gradient(180deg, var(--color-info) 0%, var(--color-primary) 100%)"
          valueLabel={(value) => `${value} hours`}
        />
      </CardContent>
    </Card>
  );
}
