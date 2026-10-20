import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const chartColors = ['#f28c28', '#8a5a00', '#26733d'];

function TaskSummary({ tasks = [] }) {
  const summary = useMemo(() => {
    const counts = { total: tasks.length, completed: 0, inProgress: 0, high: 0, medium: 0, low: 0 };

    tasks.forEach((task) => {
      const priority = String(task.priority || 'medium').toLowerCase();

      if (task.completed) {
        counts.completed += 1;
      } else {
        counts.inProgress += 1;
      }

      if (priority === 'high') counts.high += 1;
      if (priority === 'medium') counts.medium += 1;
      if (priority === 'low') counts.low += 1;
    });

    return {
      counts,
      data: [
        { name: 'Completed', count: counts.completed },
        { name: 'In progress', count: counts.inProgress },
        { name: 'High', count: counts.high },
        { name: 'Medium', count: counts.medium },
        { name: 'Low', count: counts.low },
      ],
    };
  }, [tasks]);

  return (
    <section className="card task-summary-card">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Overview</p>
          <h2>Task statistics</h2>
        </div>
        <span className="api-status">{summary.counts.total} tracked</span>
      </div>

      <div className="summary-metrics">
        <div className="summary-metric">
          <span className="summary-value">{summary.counts.total}</span>
          <span className="summary-label">Total</span>
        </div>
        <div className="summary-metric">
          <span className="summary-value">{summary.counts.completed}</span>
          <span className="summary-label">Completed</span>
        </div>
        <div className="summary-metric">
          <span className="summary-value">{summary.counts.inProgress}</span>
          <span className="summary-label">In progress</span>
        </div>
      </div>

      <div className="summary-chart-wrap">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={summary.data} margin={{ top: 20, right: 10, left: -10, bottom: 15 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" tickLine={false} axisLine={false} />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
            <Tooltip />
            <Bar dataKey="count" radius={[6, 6, 0, 0]}>
              {summary.data.map((entry, index) => (
                <Cell key={`${entry.name}-${index}`} fill={chartColors[index % chartColors.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

export default TaskSummary;
