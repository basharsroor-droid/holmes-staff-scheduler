import { format, getDay } from "date-fns";
import { he } from "date-fns/locale";

export const weekDays = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];

export function MonthGrid({
  days,
  renderDay
}: {
  days: Date[];
  renderDay: (date: Date) => React.ReactNode;
}) {
  const leading = Array.from({ length: getDay(days[0]) });

  return (
    <div className="calendar-grid">
      {weekDays.map((day) => (
        <div className="weekday" key={day}>
          {day}
        </div>
      ))}
      {leading.map((_, index) => (
        <div className="day-cell dim" key={`empty-${index}`} />
      ))}
      {days.map((day) => (
        <div className="day-cell" key={format(day, "yyyy-MM-dd")}>
          <div className="day-number">
            <span>{format(day, "d")}</span>
            <span>{format(day, "EEE", { locale: he })}</span>
          </div>
          {renderDay(day)}
        </div>
      ))}
    </div>
  );
}
