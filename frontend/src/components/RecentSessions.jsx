// components/RecentSessions.jsx — Activity feed of recent workout sessions

import { deleteWorkout } from "../api/workouts";
import { useState } from "react";

const BODY_PART_ICONS = {
  Chest:     "🫀", Back:      "🔙", Legs:      "🦵",
  Arms:      "💪", Shoulders: "🏋️", Core:      "🎯",
};

function formatDate(iso) {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now - d) / 86400000);

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7)  return `${diffDays}d ago`;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function SessionCard({ session, onDelete }) {
  const [confirming, setConfirming] = useState(false);
  const [deleting,   setDeleting]   = useState(false);

  const handleDelete = async () => {
    if (!confirming) { setConfirming(true); return; }
    setDeleting(true);
    try {
      await deleteWorkout(session.id);
      onDelete(session.id);
    } catch {
      setDeleting(false);
      setConfirming(false);
    }
  };

  return (
    <div className="bg-elevated border border-border rounded-card p-4 hover:border-text-muted
                    transition-colors duration-200 group">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Date + duration */}
          <div className="flex items-center gap-2 mb-2">
            <span className="font-display text-accent text-xs">{formatDate(session.date)}</span>
            <span className="text-text-muted text-xs">·</span>
            <span className="text-text-muted text-xs">{session.duration_min} min</span>
            <span className="text-text-muted text-xs">·</span>
            <span className="text-text-muted text-xs">
              {session.exercises.length} exercise{session.exercises.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Body parts */}
          <div className="flex flex-wrap gap-1.5 mb-2">
            {session.body_parts.map((part) => (
              <span key={part} className="chip text-xs">
                {BODY_PART_ICONS[part]} {part}
              </span>
            ))}
          </div>

          {/* Top exercises (max 3 shown) */}
          <div className="space-y-0.5">
            {session.exercises.slice(0, 3).map((ex, i) => (
              <p key={i} className="text-xs text-text-muted truncate">
                <span className="text-text-secondary">{ex.name}</span>
                {" — "}
                {ex.sets}×{ex.reps}
                {ex.weight_kg ? ` @ ${ex.weight_kg}kg` : " (BW)"}
              </p>
            ))}
            {session.exercises.length > 3 && (
              <p className="text-xs text-text-muted">
                +{session.exercises.length - 3} more…
              </p>
            )}
          </div>

          {/* Notes */}
          {session.notes && (
            <p className="text-xs text-text-muted italic mt-2 border-l-2 border-border pl-2 truncate">
              "{session.notes}"
            </p>
          )}
        </div>

        {/* Delete button — shown on hover */}
        <button
          onClick={handleDelete}
          disabled={deleting}
          className={`flex-shrink-0 text-xs px-2 py-1 rounded-btn transition-all duration-150
            opacity-0 group-hover:opacity-100
            ${confirming
              ? "bg-danger/20 text-danger border border-danger/30"
              : "text-text-muted hover:text-danger hover:bg-danger/10"
            } disabled:opacity-30`}
        >
          {deleting ? "…" : confirming ? "Confirm?" : "✕"}
        </button>
      </div>
    </div>
  );
}

export default function RecentSessions({ sessions, onDelete }) {
  if (!sessions?.length) {
    return (
      <div className="card text-center py-10">
        <p className="text-3xl mb-3">🏋️</p>
        <p className="text-text-secondary font-medium">No workouts yet</p>
        <p className="text-text-muted text-sm mt-1">
          Hit the <span className="text-accent">+</span> button to log your first session.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sessions.map((session) => (
        <SessionCard key={session.id} session={session} onDelete={onDelete} />
      ))}
    </div>
  );
}
