import type { ChartOption } from "@domphy/chart";
import { chart } from "@domphy/chart";
import type { DomphyElement } from "@domphy/core";

// Deterministic calendar data: weekdays busier, sine-wave seasonal variation
function buildCalendarData(year: number): [string, number][] {
  const result: [string, number][] = [];
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year, 11, 31);

  for (
    let day = new Date(yearStart);
    day <= yearEnd;
    day.setDate(day.getDate() + 1)
  ) {
    const dayOfYear = Math.round(
      (day.getTime() - yearStart.getTime()) / 86_400_000,
    );
    const weekday = day.getDay();
    const isWeekend = weekday === 0 || weekday === 6;
    const seasonal = Math.abs(Math.sin(dayOfYear * 0.05)) * 4;
    const weekly = isWeekend ? 0 : 3 + Math.abs(Math.sin(dayOfYear * 0.4));
    const value = Math.round(weekly + seasonal);
    result.push([day.toISOString().slice(0, 10), value]);
  }
  return result;
}

const calendarData = buildCalendarData(2024);

const option: ChartOption = {
  visualMap: {
    type: "continuous",
    min: 0,
    max: 8,
    orient: "horizontal",
    left: "center",
    top: 4,
    inRange: { color: ["#ebedf0", "#9be9a8", "#40c463", "#30a14e", "#216e39"] },
  },
  calendar: {
    range: "2024",
    cellSize: ["auto", 15],
    top: 50,
    left: 50,
    right: 20,
  },
  series: [
    {
      type: "heatmap",
      coordinateSystem: "calendar",
      calendarIndex: 0,
      data: calendarData as any,
    },
  ],
};

const App: DomphyElement<"div"> = {
  div: null,
  style: { width: "100%", height: "220px", position: "relative" },
  $: [chart(option)],
};

export default App;
