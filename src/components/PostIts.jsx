import { Box, Strike } from './Icons.jsx';
import { formatAmount } from '../lib/units.js';

export function TodoNote({ tasks, units, onTask }) {
  const todo = tasks.filter((t) => !t.done);
  return (
    <section className="postit" aria-label="To do">
      <h2>to do list ♡</h2>
      {todo.length === 0 ? (
        <span className="empty">all done today. so proud of you ✿</span>
      ) : (
        <ul>
          {todo.map((t) => (
            <li key={t.key}>
              <button className="task" onClick={() => onTask(t)}>
                <Box />
                <span className="label">
                  {t.label}
                  <span className="amount">{formatAmount(t, units)}</span>
                  <span className="bar"><i style={{ width: `${Math.round(t.frac * 100)}%` }} /></span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function DoneNote({ tasks, units, ink }) {
  const done = tasks.filter((t) => t.done);
  return (
    <section className="postit pink" aria-label="Accomplishments">
      <h2>look what I did</h2>
      {done.length === 0 ? (
        <span className="empty">nothing crossed off yet, you've got this</span>
      ) : (
        <ul>
          {done.map((t) => (
            <li key={t.key}>
              <Box checked />
              <span className="task">
                <span className="label">
                  <span className="struck">
                    {t.label}
                    <Strike color={ink} />
                  </span>
                  <span className="amount">
                    {formatAmount(t, units)}
                    {t.over ? ' · a bit over' : ''}
                  </span>
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
