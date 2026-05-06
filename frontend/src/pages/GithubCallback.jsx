import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { oauthLogin } from "../api/auth";

export default function GithubCallback() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [error, setError] = useState("");

  useEffect(() => {
    const handleCallback = async () => {
      const params = new URLSearchParams(location.search);
      const code = params.get("code");

      if (!code) {
        setError("No authorization code provided by GitHub.");
        return;
      }

      try {
        const { data } = await oauthLogin({ provider: "github", token: code });
        login(data);
        if (!data.is_email_verified) {
          navigate("/verify-email", { state: { email: data.email || "" } });
        } else {
          navigate(data.has_vitals ? "/dashboard" : "/onboarding");
        }
      } catch (err) {
        console.error(err);
        setError("Failed to authenticate with GitHub. " + (err.response?.data?.detail || ""));
      }
    };

    handleCallback();
  }, [location, login, navigate]);

  if (error) {
    return (
      <div className="min-h-screen bg-void flex items-center justify-center px-4">
        <div className="text-center card">
          <h2 className="text-danger text-xl mb-4">Authentication Failed</h2>
          <p className="text-text-muted mb-6">{error}</p>
          <button onClick={() => navigate("/login")} className="btn-primary">
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-void flex items-center justify-center px-4">
      <div className="text-center animate-pulse">
        <h2 className="text-accent text-2xl mb-2">Authenticating...</h2>
        <p className="text-text-muted text-sm">Please wait while we connect your GitHub account.</p>
      </div>
    </div>
  );
}
