import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

export function TrendNarrativeCard({
  title = "What changed",
  lines,
}: {
  title?: string;
  lines: string[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {lines.map((line) => (
          <p key={line} className="text-sm leading-relaxed text-[var(--color-text-secondary)]">
            {line}
          </p>
        ))}
      </CardContent>
    </Card>
  );
}
