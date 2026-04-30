// components/WorkoutModal.jsx — Full workout entry form
// Features: dynamic exercise rows, body-part chips, date/duration, notes

import { useState, useEffect, useRef } from "react";
import { logWorkout } from "../api/workouts";

// ── Constants ─────────────────────────────────────────────────────────────────
const BODY_PARTS = ["Chest", "Back", "Legs", "Arms", "Shoulders", "Core"];

const EMPTY_EXERCISE = () => ({ name: "", sets: "", reps: "", weight_kg: "" });

// ── Sub-components ────────────────────────────────────────────────────────────

/** Single exercise row with remove button */
function ExerciseRow({ exercise, index, onChange, onRemove, isOnly }) {
  const handleField = (field) => (e) =>
    onChange(index, { ...exercise, [field]: e.target.value });

  return (
    <div className="bg-void border border-border rounded-card p-3 space-y-2 animate-fade-up">
      {/* Exercise name + remove */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          className="input flex-1 text-sm"
          placeholder="e.g. Bench Press"
          value={exercise.name}
          onChange={handleField("name")}
          required
        />
        {!isOnly && (
          <button
            type="button"
            onClick={() => onRemove(index)}
            className="w-8 h-8 flex items-center justify-center rounded-btn
                       text-text-muted hover:text-danger hover:bg-danger/10
                       transition-colors flex-shrink-0"
            title="Remove exercise"
          >
            ✕
          </button>
        )}
      </div>

      {/* Sets / Reps / Weight grid */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Sets",    field: "sets",      placeholder: "4",    type: "number" },
          { label: "Reps",    field: "reps",      placeholder: "12",   type: "number" },
          { label: "kg",      field: "weight_kg", placeholder: "0 = BW", type: "number" },
        ].map(({ label, field, placeholder, type }) => (
          <div key={field}>
            <label className="label">{label}</label>
            <input
              type={type}
              min="0"
              step={field === "weight_kg" ? "0.5" : "1"}
              className="input text-sm"
              placeholder={placeholder}
              value={exercise[field]}
              onChange={handleField(field)}
              required={field !== "weight_kg"}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Modal ─────────────────────────────────────────────────────────────────
export default function WorkoutModal({ onClose, onSuccess }) {
  const modalRef = useRef(null);

  const todayISO = new Date().toISOString().slice(0, 16); // "YYYY-MM-DDTHH:mm"

  const [form, setForm] = useState({
    date:         todayISO,
    duration_min: "",
    body_parts:   [],
    notes:        "",
  });
  const [exercises, setExercises] = useState([EMPTY_EXERCISE()]);
  const [error,    setError]   = useState("");
  const [loading,  setLoading] = useState(false);
  const [success,  setSuccess] = useState(false);

  // Close on backdrop click
  const handleBackdrop = (e) => {
    if (e.target === modalRef.current) onClose();
  };

  // Close on Escape key
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // ── Body part toggle ────────────────────────────────────────────────────────
  const toggleBodyPart = (part) => {
    setForm((prev) => ({
      ...prev,
      body_parts: prev.body_parts.includes(part)
        ? prev.body_parts.filter((p) => p !== part)
        : [...prev.body_parts, part],
    }));
  };

  // ── Exercise row handlers ───────────────────────────────────────────────────
  const addExercise = () => setExercises((prev) => [...prev, EMPTY_EXERCISE()]);

  const removeExercise = (i) =>
    setExercises((prev) => prev.filter((_, idx) => idx !== i));

  const updateExercise = (i, updated) =>
    setExercises((prev) => prev.map((ex, idx) => (idx === i ? updated : ex)));

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Validation
    if (!form.body_parts.length) {
      setError("Select at least one targeted body part.");
      return;
    }
    if (exercises.some((ex) => !ex.name || !ex.sets || !ex.reps)) {
      setError("Fill in name, sets, and reps for every exercise.");
      return;
    }

    setLoading(true);
    try {
      await logWorkout({
        date:         new Date(form.date).toISOString(),
        duration_min: parseInt(form.duration_min),
        body_parts:   form.body_parts,
        notes:        form.notes || null,
        exercises:    exercises.map((ex) => ({
          name:      ex.name,
          sets:      parseInt(ex.sets),
          reps:      parseInt(ex.reps),
          weight_kg: ex.weight_kg ? parseFloat(ex.weight_kg) : null,
        })),
      });
      setSuccess(true);
      setTimeout(() => { onSuccess(); onClose(); }, 1200);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to save workout.");
    } finally {
      setLoading(false);
    }
  };

  return (
    /* ── Backdrop ── */
    <div
      ref={modalRef}
      onClick={handleBackdrop}
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm
                 flex items-end sm:items-center justify-center px-0 sm:px-4"
    >
      {/* ── Modal panel ── */}
      <div className="w-full sm:max-w-lg bg-surface border border-border
                      rounded-t-2xl sm:rounded-card animate-scale-in
                      max-h-[92dvh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <div>
            <h2 className="font-display text-lg text-text-primary">Log Workout</h2>
            <p className="text-xs text-text-muted mt-0.5">Every rep counts.</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-btn
                       text-text-muted hover:text-text-primary hover:bg-elevated
                       transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Scrollable body */}
        <form
          onSubmit={handleSubmit}
          id="workout-form"
          className="overflow-y-auto flex-1 px-5 py-5 space-y-5"
        >
          {/* Date + Duration */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Date & Time</label>
              <input
                type="datetime-local"
                className="input text-sm"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label">Duration (min)</label>
              <input
                type="number"
                min="1"
                max="480"
                className="input text-sm"
                placeholder="60"
                value={form.duration_min}
                onChange={(e) => setForm({ ...form, duration_min: e.target.value })}
                required
              />
            </div>
          </div>

          {/* Body Parts */}
          <div>
            <label className="label">Targeted Body Parts</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {BODY_PARTS.map((part) => {
                const active = form.body_parts.includes(part);
                return (
                  <button
                    key={part}
                    type="button"
                    onClick={() => toggleBodyPart(part)}
                    className={`chip transition-all duration-150 ${active ? "chip-active" : "hover:border-text-muted"}`}
                  >
                    {active && <span className="text-accent text-xs">✓</span>}
                    {part}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Exercises */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label mb-0">Exercises</label>
              <span className="text-xs text-text-muted font-display">
                {exercises.length} exercise{exercises.length !== 1 ? "s" : ""}
              </span>
            </div>

            <div className="space-y-3">
              {exercises.map((ex, i) => (
                <ExerciseRow
                  key={i}
                  exercise={ex}
                  index={i}
                  onChange={updateExercise}
                  onRemove={removeExercise}
                  isOnly={exercises.length === 1}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={addExercise}
              className="mt-3 w-full py-2.5 border border-dashed border-border rounded-card
                         text-text-muted text-sm hover:border-accent hover:text-accent
                         transition-colors duration-200"
            >
              + Add Exercise
            </button>
          </div>

          {/* Notes */}
          <div>
            <label className="label">Post-Workout Notes (optional)</label>
            <textarea
              rows={3}
              className="input resize-none text-sm"
              placeholder="How did it feel? Any PRs today?"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>

          {error && (
            <p className="text-danger text-sm bg-danger/10 border border-danger/20 rounded-btn px-3 py-2">
              {error}
            </p>
          )}
        </form>

        {/* Footer — sticky submit */}
        <div className="px-5 py-4 border-t border-border flex-shrink-0">
          {success ? (
            <div className="flex items-center justify-center gap-2 py-2.5 text-success font-semibold">
              <span>✓</span> Workout saved!
            </div>
          ) : (
            <button
              type="submit"
              form="workout-form"
              disabled={loading}
              className="btn-primary w-full disabled:opacity-50"
            >
              {loading ? "Saving…" : "Save Workout"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
