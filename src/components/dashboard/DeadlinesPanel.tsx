import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { tenders } from "@/data/tenders";
import { CalendarClock } from "lucide-react";

function daysUntil(date: string) {
  const d = new Date(date).getTime();
  const now = new Date().getTime();
  return Math.ceil((d - now) / (1000 * 60 * 60 * 24));
}

export function DeadlinesPanel() {
  const navigate = useNavigate();
  const upcoming = [...tenders]
    .filter((t) => t.status === "Open" || t.status === "Under Review")
    .sort((a, b) => +new Date(a.deadline) - +new Date(b.deadline))
    .slice(0, 5);

  return (
    <Card className="border-border/60 shadow-elegant">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <CalendarClock className="h-4 w-4 text-accent" />
          Upcoming deadlines
        </CardTitle>
        <p className="text-xs text-muted-foreground">Next closing tenders</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {upcoming.map((t) => {
          const days = daysUntil(t.deadline);
          const urgent = days <= 7;
          return (
            <div
              key={t.id}
              className="group flex cursor-pointer items-center justify-between rounded-lg border border-border/50 bg-background/40 p-3 transition hover:border-accent/40 hover:bg-accent/5"
              onClick={() => navigate(`/tenders?q=${encodeURIComponent(t.title)}`)}
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{t.title}</p>
                <p className="font-mono text-xs text-muted-foreground">{t.id}</p>
              </div>
              <div className="ml-3 flex flex-col items-end">
                <span
                  className={`text-sm font-semibold tabular-nums ${urgent ? "text-destructive" : "text-foreground"}`}
                >
                  {days}d
                </span>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">left</span>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
