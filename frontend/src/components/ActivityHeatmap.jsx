import { useMemo } from "react";

export default function ActivityHeatmap({ dates = [] }) {
  const weeks = 26; // 6 months of data
  const totalDays = weeks * 7;
  
  const { calendar, activeCount } = useMemo(() => {
    const today = new Date();
    // Normalize today
    today.setHours(0, 0, 0, 0);
    
    // We want the last day to be today.
    // To align properly, we could find what day of the week today is.
    // Let's just do a simple continuous flow for now, which looks great anyway.
    
    const daysArr = [];
    let count = 0;
    
    for (let i = totalDays - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      
      // format local date to YYYY-MM-DD reliably
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;
      
      const isActive = dates.includes(dateStr);
      if (isActive) count++;
      
      daysArr.push({
        date: dateStr,
        active: isActive
      });
    }
    return { calendar: daysArr, activeCount: count };
  }, [dates, totalDays]);

  return (
    <div className="card space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="label !mb-0">Activity Map (Last 6 Months)</h3>
        <span className="text-xs text-text-muted">{activeCount} workouts</span>
      </div>
      
      <div className="overflow-x-auto pb-2 custom-scrollbar">
        <div 
          className="grid gap-[3px] min-w-max"
          style={{
            gridTemplateRows: 'repeat(7, 12px)',
            gridAutoFlow: 'column',
            gridAutoColumns: '12px'
          }}
        >
          {calendar.map((day, i) => (
            <div 
              key={i} 
              className={`w-3 h-3 rounded-[2px] transition-colors ${
                day.active 
                  ? 'bg-accent shadow-[0_0_6px_var(--color-accent-dim)]' 
                  : 'bg-elevated hover:bg-border'
              }`}
              title={`${day.date}${day.active ? ' (Workout Logged)' : ''}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
