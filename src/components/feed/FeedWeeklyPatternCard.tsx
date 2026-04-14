import { Card, CardContent, CardHeader } from "../ui/card";
import { SectionHeading } from "../ui/page-layout";
import {
  TrackerWeekBarChart,
  TrackerWeekSwitcher,
} from "../tracking/TrackerPrimitives";

export function FeedWeeklyPatternCard({
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
          description="Breastfeeds, bottles, meals, and drinks logged across each seven-day window."
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
          valueLabel={(value) => `${value} feed${value === 1 ? "" : "s"}`}
        />
      </CardContent>
    </Card>
  );
}
