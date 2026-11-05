import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { isDemo, recoveryLanding, setDemo, supabase } from './lib/supabase.js';
import {
  addEntry, clearDemo, deleteEntry, loadDay, loadProfile, saveProfile, saveWins, seedDemo, todayKey
} from './lib/store.js';
import { sampleData } from './lib/demoData.js';
import {
  buildTasks, calcGoals, dayFraction, dollHealth, mostBehind, sumTotals
} from '../supabase/functions/_shared/goals.js';
import Doll from './components/Doll.jsx';
import { Arrow, Dancer, Dumbbell, Gear, Hanger, INKS, Pen, SketchDefs, Treadmill, Walk, Yoga } from './components/Icons.jsx';
import { DoneNote, TodoNote } from './components/PostIts.jsx';
import JournalList from './components/JournalList.jsx';
import LogSheet from './components/LogSheet.jsx';
import ExerciseSheet from './components/ExerciseSheet.jsx';
import ClosetSheet from './components/ClosetSheet.jsx';
import SettingsSheet from './components/SettingsSheet.jsx';
import SignIn, { NewPassword } from './components/SignIn.jsx';
import WeightSheet from './components/WeightSheet.jsx';
import WeekSheet from './components/WeekSheet.jsx';
import SocialSheet from './components/SocialSheet.jsx';

// How long the doll's tumbles run; these match the animations in styles.css.
const FALL_MS = 1900;
const KO_MS = 5200;

const MOVES = [
  ['weights', Dumbbell, 'weights'],
  ['treadmill', Treadmill, 'treadmill'],
  ['dance', Dancer, 'dance'],
  ['yoga', Yoga, 'yoga'],
  ['walk', Walk, 'walk']
];

const FOOD_KEYS = ['calories', 'protein', 'carbs', 'fat'];

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
  const [recovering, setRecovering] = useState(recoveryLanding);
  const [trying, setTrying] = useState(false);

  const startTrying = () => {
    setDemo(true);
    seedDemo(sampleData());
    setTrying(true);
  };

  const stopTrying = () => {
    clearDemo();
    setDemo(false);
    setTrying(false);
  };

  useEffect(() => {
    if (isDemo) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === 'PASSWORD_RECOVERY') setRecovering(true);
      setSession(s);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  if (recovering) {
    return (
      <>
        <SketchDefs />
        <NewPassword onDone={() => setRecovering(false)} />
      </>
    );
  }
  if (session === undefined) return <SketchDefs />;
  if (trying) {
    return (
      <>
        <SketchDefs />
        <Today userId="demo" onExitDemo={stopTrying} />
      </>
    );
  }
  return (
    <>
      <SketchDefs />
      {session ? <Today userId={session.user.id} /> : <SignIn onTry={startTrying} />}
    </>
  );
}

function Today({ userId, onExitDemo }) {
  const [profile, setProfile] = useState(null);
  const [day, setDay] = useState(todayKey());
  const [logs, setLogs] = useState({ food: [], water: [], exercise: [] });
  const [logsDay, setLogsDay] = useState(null);
  const [ink, setInkState] = useState(readInk);
  const [sheet, setSheet] = useState(null);
  const [toastMsg, setToastMsg] = useState('');
  const [now, setNow] = useState(() => new Date());
  const [tumble, setTumble] = useState(null); // null | 'fall' | 'ko'
  const pokes = useRef({ count: 0, last: 0 });

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
    loadDay(day)
      .then((l) => {
        setLogs(l);
        setLogsDay(day);
      })
      .catch((e) => toast(e.message));
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

  // Keep today's crossed-off goals current for the friends page, once today's logs have loaded.
  const doneKeys = tasks.filter((t) => t.done).map((t) => t.key).join(',');
  const sharing = !!profile?.share_social;
  useEffect(() => {
    if (!sharing || day !== today || logsDay !== today) return;
    saveWins(today, doneKeys ? doneKeys.split(',') : []).catch(() => {});
  }, [sharing, day, today, logsDay, doneKeys]);

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

  // Which food idea list to open on: whatever food goal is furthest behind.
  const foodFocus = mostBehind(tasks.filter((t) => FOOD_KEYS.includes(t.key)), expected)?.key;

  const onTask = (t) => {
    if (t.key === 'water') setSheet({ type: 'log', tab: 'water' });
    else if (t.key === 'move') toast('tap one of the activities under your doll ↓');
    else setSheet({ type: 'log', tab: 'food', focus: t.key });
  };

  // Tap her and she topples over; the third tap in a row knocks her out for a moment.
  const poke = () => {
    if (tumble) return;
    const p = pokes.current;
    const t = Date.now();
    p.count = t - p.last > 20_000 ? 1 : p.count + 1;
    p.last = t;
    if (p.count >= 3) {
      p.count = 0;
      setTumble('ko');
      setTimeout(() => setTumble(null), KO_MS);
    } else {
      setTumble('fall');
      setTimeout(() => setTumble(null), FALL_MS);
    }
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

      {onExitDemo ? (
        <div className="demo-bar">
          <span>you're trying it out with sample data. nothing is kept.</span>
          <button className="btn primary" onClick={onExitDemo}>join</button>
        </div>
      ) : (
        isDemo && <p className="muted" style={{ margin: 0, fontSize: 15 }}>demo mode: saved on this device only</p>
      )}

      <nav className="page-nav" aria-label="More pages">
        <button className="chip" onClick={() => setSheet({ type: 'week' })}>my week</button>
        <button className="chip" onClick={() => setSheet({ type: 'social' })}>friends</button>
      </nav>

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
              setSheet({ type: 'log', tab: 'food', focus: foodFocus });
            }}
          />
          <span className="hint">pick an ink to write</span>
        </div>
      </div>

      <JournalList
        logs={logs}
        units={units}
        onDelete={remove}
        aside={
          <button className="coy-btn" onClick={() => setSheet({ type: 'weight' })} aria-label="Private weight log">
            <Doll doll={profile.doll} coy />
          </button>
        }
      />

      <section className="doll-zone" aria-label="Your doll">
        <button className="icon-btn closet-btn" onClick={() => setSheet({ type: 'closet' })} aria-label="Dress her up">
          <Hanger />
        </button>
        <button className={`doll-btn ${tumble ?? ''}`} onClick={poke} aria-label="Poke your doll">
          <Doll
            doll={profile.doll}
            health={tumble ? 1 : health}
            celebrate={allDone && !tumble}
            dazed={tumble === 'ko'}
            moving={!!tumble}
            className="doll-svg"
          />
        </button>
        <div className="doll-mood">{tumble === 'ko' ? 'seeing birds...' : tumble === 'fall' ? 'oof!' : mood}</div>
        <div className="moves">
          {MOVES.map(([kind, Icon, label]) => (
            <button key={kind} className="move" onClick={() => setSheet({ type: 'exercise', kind })}>
              <Icon />
              {label}
            </button>
          ))}
        </div>
      </section>

      {sheet?.type === 'log' && (
        <LogSheet
          tab={sheet.tab}
          focus={sheet.focus}
          ink={ink}
          setInk={setInk}
          units={units}
          onAdd={add}
          onClose={() => setSheet(null)}
        />
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
      {sheet?.type === 'weight' && (
        <WeightSheet
          profile={profile}
          day={day}
          onLogged={(kg) => save({ ...profile, weight_kg: kg }, true)}
          onClose={() => setSheet(null)}
          toast={toast}
        />
      )}
      {sheet?.type === 'week' && (
        <WeekSheet
          profile={profile}
          units={units}
          onPickDay={(k) => {
            setDay(k);
            setSheet(null);
          }}
          onClose={() => setSheet(null)}
          toast={toast}
        />
      )}
      {sheet?.type === 'social' && (
        <SocialSheet profile={profile} ink={ink} onSave={save} onClose={() => setSheet(null)} toast={toast} />
      )}
      {sheet?.type === 'settings' && (
        <SettingsSheet
          profile={profile}
          firstRun={sheet.firstRun}
          onSave={save}
          onSignOut={onExitDemo ?? (() => supabase?.auth.signOut())}
          onClose={() => setSheet(null)}
          toast={toast}
        />
      )}
      {toastMsg && <div className="toast" role="status">{toastMsg}</div>}
    </main>
  );
}
