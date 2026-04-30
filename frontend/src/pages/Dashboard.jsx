// pages/Dashboard.jsx — Main application dashboard
// Shows stats, streak widget, recent sessions, and the FAB to log workouts.

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";

import { getDashboard }   from "../api/workouts";
import { useAuth }        from "../context/AuthContext";
import StatCard           from "../components/StatCard";
import StreakWidget       from "../components/StreakWidget";
import RecentSessions     from "../components/RecentSessions";
import WorkoutModal       from "../components/WorkoutModal";
import ActivityHeatmap    from "../components/ActivityHeatmap";

import ThemeToggle from "../components/ThemeToggle";

// ── Topbar ─────────────────────────────────────────────────────────────────────
function Topbar({ username, onLogout }) {
  return (
    <header className="flex items-center justify-between px-5 py-4 border-b border-border
                        bg-surface sticky top-0 z-10">
      <span className="font-display text-accent text-xl tracking-tight">RepLog</span>
      <div className="flex items-center gap-3">
        <span className="text-text-muted text-sm hidden sm:block">
          {username}
        </span>
        <ThemeToggle />
        <button onClick={onLogout} className="btn-ghost text-xs px-3 py-1.5">
          Sign out
        </button>
      </div>
    </header>
  );
}

// ── FAB (Floating Action Button) ───────────────────────────────────────────────
function FAB({ onClick }) {
  return (
    <button
      onClick={onClick}
      aria-label="Log new workout"
      className="fixed bottom-6 right-6 z-40
                 w-14 h-14 rounded-full bg-accent hover:bg-accent-hover
                 text-void text-2xl font-bold
                 shadow-lg shadow-accent/20
                 active:scale-90 transition-all duration-150
                 animate-pulse-accent"
    >
      +
    </button>
  );
}

// ── Skeleton loader ─────────────────────────────────────────────────────────────
function Skeleton({ className = "" }) {
  return (
    <div className={`bg-elevated rounded-card animate-pulse ${className}`} />
  );
}

// ── Main Dashboard ─────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate         = useNavigate();

  const [stats,      setStats]      = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [showModal,  setShowModal]  = useState(false);
  const [error,      setError]      = useState("");

  // ── Fetch dashboard data ─────────────────────────────────────────────────────
  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await getDashboard();
      setStats(data);
    } catch (err) {
      if (err.response?.status === 404) {
        // Vitals not set — redirect to onboarding
        navigate("/onboarding");
      } else {
        setError("Failed to load dashboard. Please refresh.");
      }
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  // ── Handle session deletion from feed ────────────────────────────────────────
  const handleDelete = (deletedId) => {
    setStats((prev) => ({
      ...prev,
      total_sessions:  prev.total_sessions - 1,
      recent_sessions: prev.recent_sessions.filter((s) => s.id !== deletedId),
    }));
  };

  const handleLogout = () => { logout(); navigate("/login"); };

  return (
    <div className="min-h-screen bg-void">
      <Topbar username={user?.username} onLogout={handleLogout} />

      <main className="max-w-xl mx-auto px-4 py-6 pb-24 space-y-6">

        {/* ── Welcome banner ── */}
        {!loading && stats && (
          <div className="animate-fade-up">
            <h1 className="text-xl font-semibold text-text-primary">
              {getGreeting()},{" "}
              <span className="text-accent">{user?.username}</span> 👋
            </h1>
            <p className="text-text-muted text-sm mt-0.5">
              {stats.total_sessions === 0
                ? "Ready to log your first workout?"
                : `${stats.total_sessions} sessions logged. Keep the streak alive.`}
            </p>
          </div>
        )}

        {/* ── Error state ── */}
        {error && (
          <div className="card border-danger/30 text-danger text-sm">
            {error}{" "}
            <button onClick={fetchDashboard} className="underline ml-1">Retry</button>
          </div>
        )}

        {/* ── Stats grid ── */}
        {loading ? (
          <div className="grid grid-cols-3 gap-3">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
        ) : stats && (
          <div className="grid grid-cols-3 gap-3 animate-fade-up" style={{ animationDelay: "60ms" }}>
            <StatCard
              label="Weight"
              value={stats.current_weight_kg ?? "—"}
              unit="kg"
            />
            <StatCard
              label="BMI"
              value={stats.bmi ?? "—"}
              sub={stats.bmi ? bmiLabel(stats.bmi) : ""}
            />
            <StatCard
              label="Sessions"
              value={stats.total_sessions}
              unit="total"
              accent
            />
          </div>
        )}

        {/* ── Streak widget & Heatmap ── */}
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-32" />
            <Skeleton className="h-40" />
          </div>
        ) : stats && (
          <div className="space-y-4 animate-fade-up" style={{ animationDelay: "120ms" }}>
            <StreakWidget streak={stats.streak} />
            <ActivityHeatmap dates={stats.all_sessions_dates} />
          </div>
        )}

        {/* ── Recent sessions ── */}
        <div className="animate-fade-up" style={{ animationDelay: "180ms" }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-sm text-text-secondary uppercase tracking-wider">
              Recent Sessions
            </h2>
            {stats?.recent_sessions?.length > 0 && (
              <span className="text-xs text-text-muted">
                Showing last {stats.recent_sessions.length}
              </span>
            )}
          </div>

          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-28" />
              <Skeleton className="h-28" />
            </div>
          ) : (
            <RecentSessions
              sessions={stats?.recent_sessions ?? []}
              onDelete={handleDelete}
            />
          )}
        </div>
      </main>

      {/* ── Floating Action Button ── */}
      <FAB onClick={() => setShowModal(true)} />

      {/* ── Workout Modal ── */}
      {showModal && (
        <WorkoutModal
          onClose={() => setShowModal(false)}
          onSuccess={fetchDashboard}   // refresh stats after logging
        />
      )}
    </div>
  );
}

// ── Utility helpers ────────────────────────────────────────────────────────────

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function bmiLabel(bmi) {
  if (bmi < 18.5) return "Underweight";
  if (bmi < 25)   return "Normal";
  if (bmi < 30)   return "Overweight";
  return "Obese";
}
