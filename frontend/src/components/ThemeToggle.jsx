import { useTheme } from "../context/ThemeContext";

export default function ThemeToggle() {
  const { isLightMode, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="btn-ghost px-3 py-1.5 flex items-center justify-center gap-2 rounded-full border-transparent hover:border-border hover:bg-elevated transition-colors"
      title={`Switch to ${isLightMode ? "Dark" : "Light"} Mode`}
    >
      {isLightMode ? "🌙" : "☀️"}
    </button>
  );
}
