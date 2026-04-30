// pages/AuthPage.jsx — Login + Register forms

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { login as apiLogin, register as apiRegister } from "../api/auth";

export default function AuthPage({ mode }) {
  const isLogin    = mode === "login";
  const { login }  = useAuth();
  const navigate   = useNavigate();

  const [form, setForm]     = useState({ email: "", username: "", password: "" });
  const [error, setError]   = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const fn   = isLogin ? apiLogin : apiRegister;
      const { data } = await fn(form);
      login(data);   // persist token + user info in AuthContext
      navigate(data.has_vitals ? "/dashboard" : "/onboarding");
    } catch (err) {
      const detail = err.response?.data?.detail;
      let msg = "Something went wrong. Please try again.";
      if (typeof detail === "string") {
        msg = detail;
      } else if (Array.isArray(detail) && detail.length > 0) {
        msg = detail[0].msg; // FastAPI validation error
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-void flex items-center justify-center px-4">
      {/* Subtle background accent glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-accent/3 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-sm animate-fade-up">
        {/* Logo / Brand */}
        <div className="text-center mb-10">
          <span className="font-display text-accent text-3xl tracking-tight">RepLog</span>
          <p className="text-text-muted text-sm mt-1">
            {isLogin ? "Welcome back. Let's move." : "Start your journey today."}
          </p>
        </div>

        {/* Form Card */}
        <div className="card">
          <h2 className="font-display text-xl text-text-primary mb-6">
            {isLogin ? "Sign In" : "Create Account"}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="you@example.com"
                className="input"
                required
              />
            </div>

            {/* Username only shown on register */}
            {!isLogin && (
              <div>
                <label className="label">Username</label>
                <input
                  type="text"
                  name="username"
                  value={form.username}
                  onChange={handleChange}
                  placeholder="athlete_adi"
                  className="input"
                  required
                />
              </div>
            )}

            <div>
              <label className="label">Password</label>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="••••••••"
                className="input"
                required
                minLength="6"
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
              className="btn-primary w-full mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Please wait…" : isLogin ? "Sign In" : "Create Account"}
            </button>
          </form>
        </div>

        {/* Toggle link */}
        <p className="text-center text-text-muted text-sm mt-6">
          {isLogin ? "New here? " : "Already have an account? "}
          <Link
            to={isLogin ? "/register" : "/login"}
            className="text-accent hover:underline"
          >
            {isLogin ? "Create account" : "Sign in"}
          </Link>
        </p>
      </div>
    </div>
  );
}
