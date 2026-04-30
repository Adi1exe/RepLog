import { useState, useEffect } from "react";
import { getWorkoutsHistory } from "../api/workouts";
import RecentSessions from "./RecentSessions";

export default function WorkoutHistory({ onDelete }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState("");

  const limit = 10;

  const fetchHistory = async (pageIndex, append = false) => {
    setLoading(true);
    setError("");
    try {
      const { data } = await getWorkoutsHistory(pageIndex * limit, limit);
      if (data.length < limit) setHasMore(false);
      
      if (append) {
        setSessions((prev) => [...prev, ...data]);
      } else {
        setSessions(data);
      }
    } catch (err) {
      setError("Failed to load workout history.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory(0, false);
  }, []);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchHistory(nextPage, true);
  };

  const handleLocalDelete = (deletedId) => {
    setSessions((prev) => prev.filter((s) => s.id !== deletedId));
    if (onDelete) onDelete(deletedId); // also notify parent to update dashboard stats
  };

  return (
    <div className="space-y-4 animate-fade-up">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-sm text-text-secondary uppercase tracking-wider">
          Workout History
        </h2>
        <span className="text-xs text-text-muted">All time</span>
      </div>

      {error && <div className="text-danger text-sm">{error}</div>}

      {sessions.length === 0 && !loading && !error ? (
        <div className="card text-center text-text-muted py-10">
          No workouts found.
        </div>
      ) : (
        <RecentSessions sessions={sessions} onDelete={handleLocalDelete} />
      )}

      {loading && (
        <div className="flex justify-center py-4">
          <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}

      {hasMore && !loading && sessions.length > 0 && (
        <button
          onClick={handleLoadMore}
          className="btn-ghost w-full py-2 text-sm"
        >
          Load More
        </button>
      )}
    </div>
  );
}
