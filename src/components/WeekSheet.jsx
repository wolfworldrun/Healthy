import { useEffect, useState } from 'react';
import Sheet from './Sheet.jsx';
import { Box } from './Icons.jsx';
import { loadRange, todayKey } from '../lib/store.js';
import { formatWater } from '../lib/units.js';
import { buildTasks, calcGoals, sumTotals } from '../../supabase/functions/_shared/goals.js';

const ROW_LABELS = { water: 'water', calories: 'calories', protein: 'protein', carbs: 'carbs', fat: 'fats', move: 'move' };

function lastSevenDays() {
  const now = new Date();
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6 + i);
    return { key: todayKey(d), label: d.toLocaleDateString([], { weekday: 'short' }).toLowerCase() };
  });
}

export default function WeekSheet({ profile, units, onPickDay, onClose, toast }) {
  const [days] = useState(lastSevenDays);
  const [logs, setLogs] = useState(null);

  useEffect(() => {
    loadRange(days[0].key, days[6].key).then(setLogs).catch((e) => toast(e.message));
  }, [days, toast]);

  if (!logs) {
    return (
      <Sheet title="my week" onClose={onClose}>
        <p className="muted">flipping back through the pages...</p>
      </Sheet>
    );
  }

  const goals = calcGoals(profile);
  const summary = days.map(({ key }) => {
    const entries = {
      food: logs.food.filter((r) => r.day === key),
      water: logs.water.filter((r) => r.day === key),
      exercise: logs.exercise.filter((r) => r.day === key)
    };
    const totals = sumTotals(entries);
    return {
      key,
      totals,
      tasks: buildTasks(goals, totals),
      logged: entries.food.length + entries.water.length + entries.exercise.length > 0
    };
  });

  const active = summary.filter((s) => s.logged);
  const avg = (field) => (active.length ? active.reduce((sum, s) => sum + s.totals[field], 0) / active.length : 0);
  const crossedOff = summary.reduce((sum, s) => sum + s.tasks.filter((t) => t.done).length, 0);
  const moved = summary.reduce((sum, s) => sum + s.totals.exercise_min, 0);

  return (
    <Sheet title="my week" onClose={onClose}>
      {active.length === 0 ? (
        <p className="muted">nothing written down this week yet.</p>
      ) : (
        <p style={{ margin: '0 0 6px' }}>
          {crossedOff} goal{crossedOff === 1 ? '' : 's'} crossed off across {active.length} day{active.length === 1 ? '' : 's'}.
        </p>
      )}
      <div className="week-wrap">
        <table className="week">
          <thead>
            <tr>
              <td />
              {days.map((d) => (
                <th key={d.key} scope="col">
                  <button type="button" className="link-btn" onClick={() => onPickDay(d.key)} aria-label={`Open ${d.key}`}>
                    {d.label}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Object.entries(ROW_LABELS).map(([key, label]) => (
              <tr key={key}>
                <th scope="row">{label}</th>
                {summary.map((s) => {
                  const done = s.tasks.find((t) => t.key === key).done;
                  return (
                    <td key={s.key} aria-label={done ? 'done' : 'not done'}>
                      <Box checked={done} />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {active.length > 0 && (
        <>
          <p className="muted" style={{ margin: '10px 0 0' }}>on days you wrote something down, you averaged:</p>
          <div className="macros">
            <div><b>{Math.round(avg('calories'))}</b><span>kcal</span></div>
            <div><b>{Math.round(avg('protein'))}g</b><span>protein</span></div>
            <div><b>{formatWater(avg('water_ml'), units)}</b><span>water</span></div>
            <div><b>{moved}</b><span>total min</span></div>
          </div>
        </>
      )}
      <p className="muted" style={{ margin: 0, fontSize: 15 }}>tap a day to open that page.</p>
    </Sheet>
  );
}
