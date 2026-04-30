// components/StreakWidget.jsx — Visual streak counter
// Shows a circular progress ring targeting 4 sessions/week.

export default function StreakWidget({ streak }) {
  // Progress ring: goal is 4 sessions/week
  const SESSIONS_GOAL = 4;
  const clampedStreak = Math.min(streak, SESSIONS_GOAL * 3); // visual cap

  // Circular SVG ring maths
  const RADIUS = 42;
  const CIRC   = 2 * Math.PI * RADIUS;
  // Fill a fraction of the ring per session, max at full circle for goal
  const progress = Math.min(streak / SESSIONS_GOAL, 1);
  const dashOffset = CIRC * (1 - progress);

  // Colour: green when on track, amber when lagging, accent when goal hit
  const ringColor =
    streak === 0      ? "#444"      :
    streak >= SESSIONS_GOAL ? "#c8f23c" :
    streak >= 2       ? "#22c55e"  :
    "#f59e0b";

  const statusText =
    streak === 0           ? "Start your streak!" :
    streak >= SESSIONS_GOAL ? "Goal reached 🎯"   :
    `${SESSIONS_GOAL - streak} more to goal`;

  return (
    <div className="card flex items-center gap-5">
      {/* SVG Ring */}
      <div className="relative flex-shrink-0 w-24 h-24">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          {/* Track */}
          <circle
            cx="50" cy="50" r={RADIUS}
            fill="none"
            stroke="#222"
            strokeWidth="8"
          />
          {/* Progress */}
          <circle
            cx="50" cy="50" r={RADIUS}
            fill="none"
            stroke={ringColor}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={CIRC}
            strokeDashoffset={dashOffset}
            style={{ transition: "stroke-dashoffset 0.8s ease, stroke 0.4s ease" }}
          />
        </svg>
        {/* Streak number in centre */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="font-display text-2xl leading-none"
            style={{ color: ringColor }}
          >
            {streak}
          </span>
          <span className="text-[9px] text-text-muted font-display uppercase tracking-wider mt-0.5">
            days
          </span>
        </div>
      </div>

      {/* Text info */}
      <div className="flex-1 min-w-0">
        <p className="label">Workout Streak</p>
        <p className="text-text-primary font-semibold text-sm">{statusText}</p>
        <p className="text-text-muted text-xs mt-1">
          Goal: {SESSIONS_GOAL} sessions/week
        </p>
        {/* Mini session dots */}
        <div className="flex gap-1.5 mt-2">
          {Array.from({ length: SESSIONS_GOAL }).map((_, i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full transition-colors duration-300"
              style={{ backgroundColor: i < streak ? ringColor : "#222" }}
            />
          ))}
        </div>
        <p className="text-[10px] text-text-muted mt-1.5">
          Resets if 72 h pass without a session
        </p>
      </div>
    </div>
  );
}
