import { useCallback, useEffect, useMemo, useState } from 'react';
import { isDemo, supabase } from './lib/supabase.js';
import { addEntry, deleteEntry, loadDay, loadProfile, saveProfile, todayKey } from './lib/store.js';
import {
  buildTasks, calcGoals, dayFraction, dollHealth, mostBehind, sumTotals
} from '../supabase/functions/_shared/goals.js';
import Doll from './components/Doll.jsx';
import { Arrow, Dancer, Dumbbell, Gear, INKS, Pen, SketchDefs, Treadmill } from './components/Icons.jsx';
import { DoneNote, TodoNote } from './components/PostIts.jsx';
import JournalList from './components/JournalList.jsx';
import LogSheet from './components/LogSheet.jsx';
import ExerciseSheet from './components/ExerciseSheet.jsx';
import ClosetSheet from './components/ClosetSheet.jsx';
import SettingsSheet from './components/SettingsSheet.jsx';
import SignIn from './components/SignIn.jsx';

const MOODS = {
  water: 'a little thirsty...',
  calories: 'tummy rumbling...',
  protein: 'craving some protein...',
  carbs: 'running low on energy...',
  fat: 'could use some healthy fats...',
  move: 'wants to wiggle...'
};

function readInk() {
  try {
    return localStorage.getItem('nj-ink') || INKS[0].color;
  } catch {
    return INKS[0].color;
  }
}

function shiftDay(day, delta) {
  const [y, m, d] = day.split('-').map(Number);
  return todayKey(new Date(y, m - 1, d + delta));
}

export default function App() {
  const [session, setSession] = useState(isDemo ? { user: { id: 'demo' } } : undefined);

  useEffect(() => {
    if (isDemo) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  if (session === undefined) return <SketchDefs />;
  return (
    <>
      <SketchDefs />
      {session ? <Today userId={session.user.id} /> : <SignIn />}
    </>
  );
}

function Today({ userId }) {
  const [profile, setProfile] = useState(null);
  const [day, setDay] = useState(todayKey());
  const [logs, setLogs] = useState({ food: [], water: [], exercise: [] });
  const [ink, setInkState] = useState(readInk);
  const [sheet, setSheet] = useState(null);
  const [toastMsg, setToastMsg] = useState('');
  const [now, setNow] = useState(() => new Date());

  const toast = useCallback((msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 2800);
  }, []);

  const setInk = (c) => {
    setInkState(c);
    try {
      localStorage.setItem('nj-ink', c);
    } catch {
      /* fine, ink just won't be remembered */
    }
  };

  useEffect(() => {
    loadProfile(userId)
      .then(async (p) => {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (!isDemo && p.timezone !== tz) p = await saveProfile({ ...p, timezone: tz });
        setProfile(p);
        if (!p.weight_kg) setSheet({ type: 'settings', firstRun: true });
      })
      .catch((e) => toast(e.message));
  }, [userId, toast]);

  const refresh = useCallback(() => {
    loadDay(day).then(setLogs).catch((e) => toast(e.message));
  }, [day, toast]);

  useEffect(refresh, [refresh]);

  // Keep the clock (doll pace) fresh, and re-sync when the app comes back to the foreground.
  useEffect(() => {
    const tick = setInterval(() => setNow(new Date()), 60_000);
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      setNow(new Date());
      setDay((d) => (d === todayKey(now) ? todayKey() : d));
      refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(tick);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [refresh, now]);

  const goals = useMemo(() => calcGoals(profile ?? {}), [profile]);
  const tasks = useMemo(() => buildTasks(goals, sumTotals(logs)), [goals, logs]);

  const today = todayKey(now);
  const expected =
    day < today ? 1 : day > today
      ? 0
      : dayFraction(now.getHours(), now.getMinutes(), profile?.reminder_start_hour ?? 8, profile?.reminder_end_hour ?? 21);
  const health = dollHealth(tasks, expected);
  const allDone = tasks.every((t) => t.done);
  const behind = mostBehind(tasks, expected);
  const mood = allDone
    ? 'thriving! ♡'
    : health >= 0.85
      ? 'feeling cute today'
      : health >= 0.4
        ? MOODS[behind?.key] ?? 'drooping a bit...'
        : 'wilting... please help';

  const add = async (kind, row) => {
    try {
      const saved = await addEntry(kind, { ...row, day });
      setLogs((l) => ({ ...l, [kind]: [...l[kind], saved] }));
      setSheet(null);
    } catch (e) {
      toast(e.message);
    }
  };

  const remove = async (kind, id) => {
    try {
      await deleteEntry(kind, id);
      setLogs((l) => ({ ...l, [kind]: l[kind].filter((r) => r.id !== id) }));
    } catch (e) {
      toast(e.message);
    }
  };

  const save = async (p, keepOpen = false) => {
    try {
      setProfile(await saveProfile(p));
      if (!keepOpen) setSheet(null);
    } catch (e) {
      toast(e.message);
    }
  };

  const onTask = (t) => {
    if (t.key === 'water') setSheet({ type: 'log', tab: 'water' });
    else if (t.key === 'move') toast('tap the dumbbell, treadmill, or dancer below ↓');
    else setSheet({ type: 'log', tab: 'food' });
  };

  if (!profile) return <main className="page" />;

  const [y, m, d] = day.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const units = profile.units || 'imperial';

  return (
    <main className="page">
      <header className="top">
        <div className="date">
          <button className="icon-btn" onClick={() => setDay(shiftDay(day, -1))} aria-label="Previous day">
            <Arrow />
          </button>
          <span>
            {day === today ? 'today' : date.toLocaleDateString([], { weekday: 'long' }).toLowerCase()}
            <small>{date.toLocaleDateString([], { month: 'long', day: 'numeric' }).toLowerCase()}</small>
          </span>
          <button className="icon-btn" onClick={() => setDay(shiftDay(day, 1))} disabled={day >= today} aria-label="Next day">
            <Arrow dir="right" />
          </button>
        </div>
        <button className="icon-btn" onClick={() => setSheet({ type: 'settings' })} aria-label="Settings">
          <Gear />
        </button>
      </header>

      {isDemo && <p className="muted" style={{ margin: 0, fontSize: 15 }}>demo mode: saved on this device only</p>}

      <div className="desk">
        <div className="notes">
          <TodoNote tasks={tasks} units={units} onTask={onTask} />
          <DoneNote tasks={tasks} units={units} ink={ink} />
        </div>
        <div className="pen-wrap">
          <Pen
            ink={ink}
            onPick={(c) => {
              setInk(c);
              setSheet({ type: 'log', tab: 'food' });
            }}
          />
          <span className="hint">pick an ink to write</span>
        </div>
      </div>

      <JournalList logs={logs} units={units} onDelete={remove} />

      <section className="doll-zone" aria-label="Your doll">
        <button className="doll-btn" onClick={() => setSheet({ type: 'closet' })} aria-label="Customize your doll">
          <Doll doll={profile.doll} health={health} celebrate={allDone} className="doll-svg" />
        </button>
        <div className="doll-mood">{mood}</div>
        <div className="moves">
          <button className="move" onClick={() => setSheet({ type: 'exercise', kind: 'weights' })}>
            <Dumbbell />
            weights
          </button>
          <button className="move" onClick={() => setSheet({ type: 'exercise', kind: 'treadmill' })}>
            <Treadmill />
            treadmill
          </button>
          <button className="move" onClick={() => setSheet({ type: 'exercise', kind: 'dance' })}>
            <Dancer />
            dance
          </button>
        </div>
      </section>

      {sheet?.type === 'log' && (
        <LogSheet tab={sheet.tab} ink={ink} setInk={setInk} units={units} onAdd={add} onClose={() => setSheet(null)} />
      )}
      {sheet?.type === 'exercise' && (
        <ExerciseSheet
          kind={sheet.kind}
          ink={ink}
          setInk={setInk}
          weightKg={profile.weight_kg}
          onAdd={add}
          onClose={() => setSheet(null)}
        />
      )}
      {sheet?.type === 'closet' && (
        <ClosetSheet doll={profile.doll} onSave={(doll) => save({ ...profile, doll })} onClose={() => setSheet(null)} />
      )}
      {sheet?.type === 'settings' && (
        <SettingsSheet
          profile={profile}
          firstRun={sheet.firstRun}
          onSave={save}
          onSignOut={() => supabase?.auth.signOut()}
          onClose={() => setSheet(null)}
          toast={toast}
        />
      )}
      {toastMsg && <div className="toast" role="status">{toastMsg}</div>}
    </main>
  );
}
