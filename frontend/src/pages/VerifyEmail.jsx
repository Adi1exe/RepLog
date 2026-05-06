import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { verifyEmail as apiVerifyEmail, resendVerification as apiResendVerification, getMe } from "../api/auth";

export default function VerifyEmail() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // If user is already verified, redirect
  useEffect(() => {
    if (user?.is_email_verified) {
      navigate(user.has_vitals ? "/dashboard" : "/onboarding");
    }
  }, [user, navigate]);

  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  // Email could come from location state if we just registered/logged in, or from the user object if they are partially authenticated.
  const email = location.state?.email || user?.email;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      setError("Email not found. Please log in again.");
      return;
    }
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      await apiVerifyEmail({ email, code });
      
      // Update the user context
      if (user) {
        login({ ...user, is_email_verified: true });
        navigate(user.has_vitals ? "/dashboard" : "/onboarding");
      } else {
        navigate("/login");
      }
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Verification failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) return;
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      await apiResendVerification({ email });
      setSuccess("A new code has been sent to your email.");
    } catch (err) {
      setError("Failed to resend code.");
    } finally {
      setLoading(false);
    }
  };

  if (!email && !user) {
    return (
      <div className="min-h-screen bg-void flex items-center justify-center">
        <p className="text-text-primary">Please log in first.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-void flex items-center justify-center px-4">
      <div className="w-full max-w-sm animate-fade-up">
        <div className="text-center mb-8">
          <h2 className="font-display text-2xl text-accent mb-2">Verify Your Email</h2>
          <p className="text-text-muted text-sm">
            We've sent a 6-digit code to <span className="text-text-primary font-medium">{email}</span>.
            Check your console output for the code!
          </p>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Verification Code</label>
              <input
                type="text"
                value={code}
                onChange={(e) => { setCode(e.target.value); setError(""); setSuccess(""); }}
                placeholder="123456"
                className="input text-center text-lg tracking-widest"
                maxLength="6"
                required
              />
            </div>

            {error && (
              <p className="text-danger text-sm bg-danger/10 border border-danger/20 rounded-btn px-3 py-2">
                {error}
              </p>
            )}
            {success && (
              <p className="text-accent text-sm bg-accent/10 border border-accent/20 rounded-btn px-3 py-2">
                {success}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="btn-primary w-full mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Verifying…" : "Verify"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={handleResend}
              disabled={loading}
              className="text-text-muted hover:text-accent text-sm transition-colors"
            >
              Didn't receive a code? Resend
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
