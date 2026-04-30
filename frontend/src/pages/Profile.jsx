import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getMe, updateMe } from "../api/auth";
import { getVitals, submitVitals } from "../api/workouts";
import { useAuth } from "../context/AuthContext";
import ThemeToggle from "../components/ThemeToggle";

export default function Profile() {
  const navigate = useNavigate();
  const { user, login } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [account, setAccount] = useState({ username: "", email: "" });
  const [vitals, setVitals] = useState({
    name: "", age: "", height_cm: "", weight_kg: "", goal: "", experience: ""
  });

  useEffect(() => {
    async function fetchData() {
      try {
        const [meRes, vitalsRes] = await Promise.all([
          getMe(),
          getVitals()
        ]);
        setAccount({ username: meRes.data.username, email: meRes.data.email });
        setVitals({
          name: vitalsRes.data.name,
          age: vitalsRes.data.age,
          height_cm: vitalsRes.data.height_cm,
          weight_kg: vitalsRes.data.weight_kg,
          goal: vitalsRes.data.goal,
          experience: vitalsRes.data.experience
        });
      } catch (err) {
        setError("Failed to load profile data.");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      await Promise.all([
        updateMe(account),
        submitVitals({
          name: vitals.name,
          age: parseInt(vitals.age),
          height_cm: parseFloat(vitals.height_cm),
          weight_kg: parseFloat(vitals.weight_kg),
          goal: vitals.goal,
          experience: vitals.experience
        })
      ]);
      setSuccess("Profile updated successfully!");
      // Update global context username if it changed
      if (user.username !== account.username) {
        login({ ...user, username: account.username });
      }
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-void pb-24">
      {/* Topbar */}
      <header className="flex items-center justify-between px-5 py-4 border-b border-border bg-surface sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/dashboard")} className="btn-ghost text-xs px-3 py-1.5">
            ← Back
          </button>
          <span className="font-display font-medium text-text-primary">Settings</span>
        </div>
        <ThemeToggle />
      </header>

      <main className="max-w-xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex justify-center mt-20">
            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="animate-fade-up">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-16 h-16 rounded-full bg-accent flex items-center justify-center text-void text-2xl font-bold uppercase">
                {account.username.charAt(0)}
              </div>
              <div>
                <h1 className="text-xl font-semibold text-text-primary">{account.username}</h1>
                <p className="text-text-muted text-sm">{account.email}</p>
              </div>
            </div>

            {error && <div className="card border-danger text-danger text-sm mb-4">{error}</div>}
            {success && <div className="card border-success text-success text-sm mb-4">{success}</div>}

            <form onSubmit={handleSave} className="space-y-8">
              
              {/* Account Section */}
              <section className="space-y-4">
                <h2 className="font-display text-sm text-text-secondary uppercase tracking-wider border-b border-border pb-2">
                  Account Details
                </h2>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="label">Username</label>
                    <input
                      type="text"
                      className="input"
                      value={account.username}
                      onChange={(e) => setAccount({ ...account, username: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="label">Email Address</label>
                    <input
                      type="email"
                      className="input"
                      value={account.email}
                      onChange={(e) => setAccount({ ...account, email: e.target.value })}
                      required
                    />
                  </div>
                </div>
              </section>

              {/* Physical Profile Section */}
              <section className="space-y-4">
                <h2 className="font-display text-sm text-text-secondary uppercase tracking-wider border-b border-border pb-2">
                  Physical Profile
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="label">Display Name</label>
                    <input
                      type="text"
                      className="input"
                      value={vitals.name}
                      onChange={(e) => setVitals({ ...vitals, name: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="label">Age</label>
                    <input
                      type="number"
                      className="input"
                      value={vitals.age}
                      onChange={(e) => setVitals({ ...vitals, age: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="label">Height (cm)</label>
                    <input
                      type="number"
                      step="0.1"
                      className="input"
                      value={vitals.height_cm}
                      onChange={(e) => setVitals({ ...vitals, height_cm: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="label">Weight (kg)</label>
                    <input
                      type="number"
                      step="0.1"
                      className="input"
                      value={vitals.weight_kg}
                      onChange={(e) => setVitals({ ...vitals, weight_kg: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="label">Experience Level</label>
                    <select
                      className="input cursor-pointer"
                      value={vitals.experience}
                      onChange={(e) => setVitals({ ...vitals, experience: e.target.value })}
                    >
                      <option value="Beginner">Beginner</option>
                      <option value="Intermediate">Intermediate</option>
                      <option value="Expert">Expert</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="label">Primary Goal</label>
                    <select
                      className="input cursor-pointer"
                      value={vitals.goal}
                      onChange={(e) => setVitals({ ...vitals, goal: e.target.value })}
                    >
                      <option value="Fat Loss">Fat Loss</option>
                      <option value="Muscle Gain">Muscle Gain</option>
                      <option value="Maintenance">Maintenance</option>
                      <option value="Strength">Strength</option>
                    </select>
                  </div>
                </div>
              </section>

              <button
                type="submit"
                disabled={saving}
                className="btn-primary w-full disabled:opacity-50"
              >
                {saving ? "Saving Changes..." : "Save Profile"}
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
