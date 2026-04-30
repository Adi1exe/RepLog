// pages/Onboarding.jsx — Multi-step onboarding flow
// Step 1: Name + Age + Height + Weight
// Step 2: BMI reveal + goal selection (dynamic, based on BMI)
// Step 3: Experience level selection

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getBMISuggestion, submitVitals } from "../api/workouts";
import { useAuth } from "../context/AuthContext";

// ── Step indicator ─────────────────────────────────────────────────────────────
function StepDots({ current, total }) {
  return (
    <div className="flex gap-2 mb-8">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-1 rounded-full transition-all duration-300 ${
            i === current
              ? "w-8 bg-accent"
              : i < current
              ? "w-4 bg-accent/40"
              : "w-4 bg-border"
          }`}
        />
      ))}
    </div>
  );
}

// ── BMI category display config ───────────────────────────────────────────────
const BMI_CONFIG = {
  Underweight: { color: "text-blue-400",   bar: "bg-blue-400",   pct: 15 },
  Normal:      { color: "text-success",    bar: "bg-success",    pct: 45 },
  Overweight:  { color: "text-warning",    bar: "bg-warning",    pct: 68 },
  Obese:       { color: "text-danger",     bar: "bg-danger",     pct: 88 },
};

// ── Goal card component ───────────────────────────────────────────────────────
function GoalCard({ goal, selected, onSelect, isPrimary }) {
  const GOAL_META = {
    "Fat Loss":    { icon: "🔥", desc: "Burn fat while preserving muscle" },
    "Muscle Gain": { icon: "💪", desc: "Build lean mass and increase strength" },
    "Maintenance": { icon: "⚖️", desc: "Sustain current fitness level" },
    "Strength":    { icon: "🏋️", desc: "Maximise raw power output" },
  };
  const meta = GOAL_META[goal] || { icon: "🎯", desc: "Achieve your fitness target" };

  return (
    <button
      type="button"
      onClick={() => onSelect(goal)}
      className={`w-full text-left p-4 rounded-card border transition-all duration-200 relative
        ${selected
          ? "border-accent bg-accent-dim"
          : "border-border bg-elevated hover:border-text-muted"
        }`}
    >
      {isPrimary && (
        <span className="absolute top-3 right-3 text-[10px] font-display text-accent border border-accent/40 rounded-full px-2 py-0.5 uppercase tracking-wider">
          Recommended
        </span>
      )}
      <div className="flex items-center gap-3">
        <span className="text-2xl">{meta.icon}</span>
        <div>
          <p className={`font-semibold text-sm ${selected ? "text-accent" : "text-text-primary"}`}>
            {goal}
          </p>
          <p className="text-xs text-text-muted mt-0.5">{meta.desc}</p>
        </div>
      </div>
    </button>
  );
}

// ── Experience card ───────────────────────────────────────────────────────────
function ExperienceCard({ level, selected, onSelect }) {
  const META = {
    Beginner:     { icon: "🌱", desc: "< 1 year of consistent training" },
    Intermediate: { icon: "⚡", desc: "1–3 years, solid fundamentals" },
    Expert:       { icon: "🔱", desc: "3+ years, advanced programming" },
  };
  const meta = META[level];

  return (
    <button
      type="button"
      onClick={() => onSelect(level)}
      className={`w-full text-left p-4 rounded-card border transition-all duration-200
        ${selected
          ? "border-accent bg-accent-dim"
          : "border-border bg-elevated hover:border-text-muted"
        }`}
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl">{meta.icon}</span>
        <div>
          <p className={`font-semibold text-sm ${selected ? "text-accent" : "text-text-primary"}`}>
            {level}
          </p>
          <p className="text-xs text-text-muted mt-0.5">{meta.desc}</p>
        </div>
      </div>
    </button>
  );
}

// ── Main Onboarding component ─────────────────────────────────────────────────
export default function Onboarding() {
  const { login, user } = useAuth();
  const navigate        = useNavigate();

  const [step, setStep] = useState(0);  // 0 = vitals, 1 = goals, 2 = experience

  // Form state
  const [vitals, setVitals] = useState({
    name: "", age: "", height_cm: "", weight_kg: "",
  });
  const [bmiData,     setBmiData]     = useState(null);   // { bmi, category, suggested_goals }
  const [selectedGoal, setGoal]       = useState("");
  const [experience,  setExperience]  = useState("");
  const [error,       setError]       = useState("");
  const [loading,     setLoading]     = useState(false);

  // ── Step 0 → 1: fetch BMI suggestion ────────────────────────────────────────
  const handleVitalsNext = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await getBMISuggestion({
        weight_kg: parseFloat(vitals.weight_kg),
        height_cm: parseFloat(vitals.height_cm)
      });
      setBmiData(data);
      setGoal(data.suggested_goals[0]);  // pre-select primary recommendation
      setStep(1);
    } catch (err) {
      setError(err.response?.data?.detail || "Could not calculate BMI. Check your inputs.");
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2 → submit: save all vitals ────────────────────────────────────────
  const handleSubmit = async () => {
    if (!experience) { setError("Please select your experience level."); return; }
    setError("");
    setLoading(true);
    try {
      await submitVitals({
        name:       vitals.name,
        age:        parseInt(vitals.age),
        height_cm:  parseFloat(vitals.height_cm),
        weight_kg:  parseFloat(vitals.weight_kg),
        goal:       selectedGoal,
        experience,
      });
      // Update the user context so has_vitals = true
      login({ ...user, has_vitals: true });
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to save your profile.");
    } finally {
      setLoading(false);
    }
  };

  const bmiCfg = bmiData ? BMI_CONFIG[bmiData.category] : null;

  return (
    <div className="min-h-screen bg-void flex items-center justify-center px-4 py-12">
      {/* Decorative glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px]
                      bg-accent/5 blur-3xl rounded-full pointer-events-none" />

      <div className="w-full max-w-md animate-fade-up">
        {/* Header */}
        <div className="mb-8">
          <span className="font-display text-accent text-2xl">RepLog</span>
          <h1 className="text-2xl font-semibold text-text-primary mt-3">
            {step === 0 && "Let's set you up"}
            {step === 1 && "Your body, your goals"}
            {step === 2 && "How experienced are you?"}
          </h1>
          <p className="text-text-muted text-sm mt-1">
            {step === 0 && "We'll personalise your experience based on your vitals."}
            {step === 1 && "Based on your BMI, here are the goals best suited for you."}
            {step === 2 && "This helps us calibrate workout suggestions."}
          </p>
        </div>

        <StepDots current={step} total={3} />

        {/* ── STEP 0: Vitals form ── */}
        {step === 0 && (
          <form onSubmit={handleVitalsNext} className="card space-y-4">
            <div>
              <label className="label">Your Name</label>
              <input
                type="text"
                className="input"
                placeholder="Adi"
                value={vitals.name}
                onChange={(e) => setVitals({ ...vitals, name: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Age</label>
                <input
                  type="number"
                  className="input"
                  placeholder="22"
                  min="10" max="100"
                  value={vitals.age}
                  onChange={(e) => setVitals({ ...vitals, age: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="label">Height (cm)</label>
                <input
                  type="number"
                  className="input"
                  placeholder="179"
                  min="100" max="250"
                  step="0.1"
                  value={vitals.height_cm}
                  onChange={(e) => setVitals({ ...vitals, height_cm: e.target.value })}
                  required
                />
              </div>
            </div>

            <div>
              <label className="label">Weight (kg)</label>
              <input
                type="number"
                className="input"
                placeholder="75.0"
                min="30" max="300"
                step="0.1"
                value={vitals.weight_kg}
                onChange={(e) => setVitals({ ...vitals, weight_kg: e.target.value })}
                required
              />
            </div>

            {error && (
              <p className="text-danger text-sm bg-danger/10 border border-danger/20 rounded-btn px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full disabled:opacity-50"
            >
              {loading ? "Calculating…" : "Calculate My BMI →"}
            </button>
          </form>
        )}

        {/* ── STEP 1: BMI reveal + Goal selection ── */}
        {step === 1 && bmiData && (
          <div className="card space-y-6">
            {/* BMI display */}
            <div className="bg-elevated rounded-card p-4 border border-border">
              <div className="flex items-end justify-between mb-3">
                <div>
                  <p className="label">Your BMI</p>
                  <p className={`font-display text-4xl font-medium ${bmiCfg.color}`}>
                    {bmiData.bmi}
                  </p>
                </div>
                <span className={`chip chip-active text-sm px-3 py-1 ${bmiCfg.color} border-current bg-current/10`}>
                  {bmiData.category}
                </span>
              </div>
              {/* BMI scale bar */}
              <div className="w-full h-1.5 bg-border rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${bmiCfg.bar}`}
                  style={{ width: `${bmiCfg.pct}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-text-muted mt-1 font-display">
                <span>18.5</span><span>25</span><span>30</span><span>40+</span>
              </div>
            </div>

            {/* Goal selection */}
            <div>
              <p className="label mb-3">Select Your Primary Goal</p>
              <div className="space-y-3">
                {bmiData.suggested_goals.map((goal, i) => (
                  <GoalCard
                    key={goal}
                    goal={goal}
                    selected={selectedGoal === goal}
                    onSelect={setGoal}
                    isPrimary={i === 0}
                  />
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button type="button" onClick={() => setStep(0)} className="btn-ghost flex-1">
                ← Back
              </button>
              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={!selectedGoal}
                className="btn-primary flex-1 disabled:opacity-50"
              >
                Next →
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2: Experience level ── */}
        {step === 2 && (
          <div className="card space-y-4">
            <div className="space-y-3">
              {["Beginner", "Intermediate", "Expert"].map((lvl) => (
                <ExperienceCard
                  key={lvl}
                  level={lvl}
                  selected={experience === lvl}
                  onSelect={setExperience}
                />
              ))}
            </div>

            {error && (
              <p className="text-danger text-sm bg-danger/10 border border-danger/20 rounded-btn px-3 py-2">
                {error}
              </p>
            )}

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setStep(1)} className="btn-ghost flex-1">
                ← Back
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading || !experience}
                className="btn-primary flex-1 disabled:opacity-50"
              >
                {loading ? "Saving…" : "Let's Go 🚀"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
