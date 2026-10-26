import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { addKid, listKids, removeKid, type Kid } from '../core/profiles';
import { emptyProgress, recordResults, recordTest, type KidProgress, type TestResult } from '../core/progress';
import type { Level, QuestionType, SubjectId, UnitDef } from '../core/question';
import type { PrintDoc } from '../core/print';
import { openStorage, type Opened } from '../storage';
import { builtUnits, contents } from '../subjects/maths';
import { ENGLISH_BOOK, englishContents } from '../subjects/english';
import { evsChapters, evsContents, evsUnits } from '../subjects/evs';
import { suggestMark } from '../core/aiMark';
import { HomeView } from '../ui/HomeView';
import { KidsView } from '../ui/KidsView';
import { BooksIndex, bookCounts, type BookDef, type BookEntry, type BookId } from '../ui/BooksIndex';
import type { ShelfBook } from '../ui/HomeView';
import { secondsOnDay } from '../core/bookStatus';
import { explainAnotherWay, type SampleFn } from '../core/aiHint';
import { Practice, type Outcome } from '../ui/Practice';
import { PrintPreview } from '../ui/PrintPreview';
import { ProgressView } from '../ui/ProgressView';
import { saveFile } from '../ui/save';
import { TopBar } from '../ui/TopBar';
import { applyCalm, applyTheme, nextTheme, readCalm, readTheme, type ThemeMode } from '../ui/theme';
import { UnitPage } from '../ui/UnitPage';
import { ExamScreen, type ExamState } from '../ui/ExamScreen';
import { ExamSetup } from '../ui/ExamSetup';
import { docPrintable, examPrintable, type Printable } from '../ui/printable';
import { buildExam, type Exam } from '../core/exam';
import { registerExamResolver, resolveExamAny } from '../core/examSheet';
import { registerEnglishMarker } from '../core/examMark';
import { ALL_ENGLISH_DATA } from './englishBooks';
import { buildEnglishExam, markEnglishExam, resolveEnglishExamCode } from './englishExam';
import { buildEvsExam, resolveEvsExamCode, type EvsFormat } from './evsExam';
import { EvsExamSetup } from '../ui/EvsExamSetup';
import { suggestExamMark } from '../core/aiMark';
import { EnglishExamSetup } from '../ui/EnglishExamSetup';
import type { Suggest } from '../ui/ExamScreen';
import { randomExamSeed } from '../core/examCode';
import { avoidMap, loadSeen, pickSeed, remember, saveSeen, seenId, type QuestionRef, type SeenDoc } from '../core/seen';
import { questionHash } from '../core/sheet';
import { baseOfBook, bookOf, buildEntry, emptyLog, normaliseLog, record, recordExam, recordMark, recordQuest, type ActivityLog, type AnswerRecord, type ExamRow, type Mode } from '../core/activity';
import { exportBackup } from '../core/backup';
import { chapterKeyOf } from '../core/chapters';
import { PASS_PERCENT } from '../core/activity';
import { BOOK_WORD, CHAPTERS, chapterState, levelProgress, unitOfChapter } from '../core/chapters';
import { nextStage, orchardOf, pipMeter, pipPoints, stageFor, toNextOrchard } from '../core/pip';
import { planFound, planPopups, popupMode, type PopupPlan } from '../core/popupPlan';
import { STAMP_DEFS } from '../core/stampDefs';
import { catchUpNewBooks, evaluateRewards } from '../core/rewardEval';
import { nextStamp, nextStampLine, recentStamps } from '../core/rewardHints';
import { emptyRewards, normaliseRewards, type RewardsDoc } from '../core/rewards';
import { PipLadder } from '../ui/PipLadder';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { RewardPopups } from '../ui/RewardPopups';
import { SetExtras, type SummaryData } from '../ui/SetSummary';
import { StampAlbum } from '../ui/StampAlbum';
import { defaultSettings, normaliseSettings, showsRing, type KidSettings } from '../core/settings';
import { SettingsView } from '../ui/SettingsView';
import type { Question } from '../core/question';
import { LEVEL_NAME, setDoc, type PracticeSet } from '../core/docs';
import { ResumeCard } from '../ui/ResumeCard';
import { collapseSessions, examKey, freshPractice, isUnfinished, practiceKey, sessionIsFor, type PracticeState, type SavedSession, type TestState } from '../core/session';
import { examIsStale, practiceIsStale, questionsFingerprint, STALE_MESSAGE } from '../core/fingerprint';
import { flatQuestions, makeCode, parseCode, resolveCode } from '../core/worksheet';
import { formatClock } from '../core/practice';
import { WordQuest } from '../ui/WordQuest';
import { topicGroup } from '../ui/topicGroups';
import { PRACTICE_BOOK, practiceContents, readerUnits, practiceUnits, typeTags, unseenUnit } from './englishBooks';
import { questLesson } from './wordQuestData';
import { EnterAnswers } from '../ui/EnterAnswers';
import { newSaved, randomSeed, resolveSpec, subjectOf, topicNumber, type SavedSheet, type Worksheet } from '../core/worksheet';

type Route =
  | { page: 'home' }
  | { page: 'index' }
  | { page: 'english' }
  | { page: 'wordquest'; lesson: UnitDef }
  | { page: 'unit'; unit: UnitDef }
  | { page: 'practice'; unit: UnitDef; set: PracticeSet; key?: string; initial?: PracticeState }
  | { page: 'resume'; unit: UnitDef; session: SavedSession }
  | { page: 'exams'; startUnit?: number }
  | { page: 'englishExams' }
  | { page: 'evsExams' }
  | { page: 'exam'; exam: Exam; unit?: UnitDef; initial?: ExamState }
  | { page: 'preview'; doc: Printable; back: Route; backLabel: string }
  | { page: 'paper'; code?: string }
  | { page: 'progress' }
  | { page: 'kids' }
  | { page: 'settings'; kidId?: string }
  | { page: 'album' }
  | { page: 'pip' };

const newSeed = randomSeed;

// English papers: their codes (EN-A-0111-4F7K) and their marker are handed to the shared exam code once.
registerExamResolver((raw, header) => resolveEnglishExamCode(raw, ALL_ENGLISH_DATA, header));
registerExamResolver((raw, header) => resolveEvsExamCode(raw, evsChapters, header));
registerEnglishMarker(markEnglishExam);

/** English topic groups: a grammar tag on the topic puts it under Grammar; otherwise the title decides. */
const englishGroup = (t: { id: string; title: string; autoMarked?: boolean }) => topicGroup(t, typeTags[t.id]);

/** The book a screen belongs to: it sets the accent (blue Maths, orange English) and the label in the top bar. */
function subjectOfRoute(route: Route, paperSubject?: SubjectId, booksOpen?: BookId): SubjectId | undefined {
  switch (route.page) {
    case 'english':
      return booksOpen === 'evs' ? 'evs' : 'english';
    case 'evsExams':
      return 'evs';
    case 'englishExams':
    case 'wordquest':
      return 'english';
    case 'index':
    case 'exams':
      return 'maths';
    case 'unit':
    case 'practice':
    case 'resume':
      return subjectOf(route.unit);
    case 'exam':
      return route.exam.subject === 'english' || route.exam.subject === 'evs' ? route.exam.subject : route.unit ? subjectOf(route.unit) : 'maths';
    case 'paper':
      return paperSubject ?? (route.code && /^E\d/i.test(route.code.trim()) ? 'english' : route.code && /^V\d/i.test(route.code.trim()) ? 'evs' : 'maths');
    case 'preview':
      return subjectOfRoute(route.back, paperSubject, booksOpen);
    default:
      return undefined;
  }
}

interface Prefs {
  aiHints?: boolean;
  goalMinutes?: number;
  activeKid?: string;
}

/** Every unit that can have chapters, for the rewards (Maths, the Reader, the Practice Book, unseen passages). */
const REWARD_UNITS: UnitDef[] = [...builtUnits, ...readerUnits, ...practiceUnits, unseenUnit, ...evsUnits];
const reducedMotion = (): boolean => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

export function App() {
  const [opened, setOpened] = useState<Opened>();
  const [kids, setKids] = useState<Kid[]>([]);
  const [activeId, setActiveId] = useState<string>();
  const [progress, setProgress] = useState<Record<string, KidProgress>>({});
  const [booksOpen, setBooksOpen] = useState<BookId>('maths');
  const [route, setRoute] = useState<Route>({ page: 'index' });
  const [backupMsg, setBackupMsg] = useState('');
  const [sheets, setSheets] = useState<SavedSheet[]>([]);
  const [sessions, setSessions] = useState<SavedSession[]>([]);
  const [theme, setTheme] = useState<ThemeMode>(() => readTheme());
  const [calm, setCalm] = useState<boolean>(() => readCalm());
  const [settingsMap, setSettingsMap] = useState<Record<string, KidSettings>>({});
  const [rewardsMap, setRewardsMap] = useState<Record<string, RewardsDoc>>({});
  const rewardsRef = useRef<Record<string, RewardsDoc>>({});
  const progressRef = useRef<Record<string, KidProgress>>({});
  const [popup, setPopup] = useState<{ plan: PopupPlan; key: number }>();
  const [summary, setSummary] = useState<SummaryData>();
  const [toast, setToast] = useState<string[]>([]);
  const [confirm, setConfirm] = useState<{ title: string; body: string[]; confirmLabel: string; cancelLabel: string; onConfirm(): void }>();
  const [paperSubject, setPaperSubject] = useState<SubjectId>();
  const [sample, setSample] = useState<SampleFn | null>(null);
  const [aiHints, setAiHints] = useState(true);
  const [lessons, setLessons] = useState<UnitDef[]>(readerUnits);
  const seenRef = useRef<Record<string, SeenDoc>>({});
  const activityRef = useRef<Record<string, ActivityLog>>({});
  const preSeen = useRef<Set<string>>(new Set());
  const aiMarks = useRef<Map<string, number>>(new Map());
  const main = useRef<HTMLElement>(null);
  const prefsRef = useRef<Prefs>({});

  useEffect(() => {
    (async () => {
      const o = await openStorage();
      let prefs: Prefs = {};
      let ks: Kid[] = [];
      let pr: Record<string, KidProgress> = {};
      let sh: SavedSheet[] = [];
      let ss: SavedSession[] = [];
      let sn: Record<string, SeenDoc> = {};
      const st: Record<string, KidSettings> = {};
      const rwm: Record<string, RewardsDoc> = {};
      try {
        prefs = (await o.store.get<Prefs>('prefs', 'app')) ?? {};
        ks = await listKids(o.store);
        sh = await o.store.list<SavedSheet>('worksheets');
        ss = await o.store.list<SavedSession>('sessions');
        // older saves kept one unfinished mixed set per size: keep the newest of each kind, quietly
        const merged = collapseSessions(ss);
        if (merged.remove.length > 0) {
          for (const id of merged.remove) await o.store.remove('sessions', id).catch(() => undefined);
          for (const s of merged.keep) if (!ss.some((x) => x.id === s.id)) await o.store.set('sessions', s.id, s).catch(() => undefined);
          ss = merged.keep;
        }
        sn = await loadSeen(o.store);
        for (const k of ks) {
          const p = await o.store.get<KidProgress>('progress', k.id);
          if (p) {
            pr[k.id] = p;
            progressRef.current[k.id] = p;
          }
          // first load after the update: one baseline marker holding the cumulative totals so far, and today's date
          const raw = await o.store.get<ActivityLog>('activity', k.id);
          const log = normaliseLog(raw, k.id, new Date().toISOString(), p);
          activityRef.current[k.id] = log;
          if (!raw) await o.store.set('activity', k.id, log).catch(() => undefined);
          st[k.id] = normaliseSettings(await o.store.get<KidSettings>('settings', k.id), k.id);
          // first evaluation for a kid with earlier history: what is already true is written quietly (pre), no popups
          const rawRewards = await o.store.get<RewardsDoc>('rewards', k.id);
          let rw = normaliseRewards(rawRewards, k.id);
          if (!rw.init || !rw.milestonesInit) {
            rw = evaluateRewards({ rewards: rw, progress: p, log, units: REWARD_UNITS, now: new Date().toISOString(), silent: true }).rewards;
            await o.store.set('rewards', k.id, rw).catch(() => undefined);
          } else {
            // a book added since the last visit: what is already true in it is found once, quietly
            const caught = catchUpNewBooks({ rewards: rw, progress: p, log, units: REWARD_UNITS, now: new Date().toISOString() });
            if (caught !== rw) {
              rw = caught;
              await o.store.set('rewards', k.id, rw).catch(() => undefined);
            }
          }
          rewardsRef.current[k.id] = rw;
          rwm[k.id] = rw;
        }
      } catch {
        /* start empty: the app still works */
      }
      prefsRef.current = prefs;
      if (prefs.aiHints === false) setAiHints(false);
      setKids(ks);
      setProgress(pr);
      setSettingsMap(st);
      setRewardsMap(rwm);
      setSheets(sh);
      setSessions(ss);
      seenRef.current = sn;
      setActiveId(ks.find((k) => k.id === prefs.activeKid)?.id ?? ks[0]?.id);
      setOpened(o);
    })();
  }, []);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);
  // Calm belongs to the picked kid; with no kid picked, this browser's own choice applies.
  const kidSettings: KidSettings = activeId ? settingsMap[activeId] ?? defaultSettings(activeId) : { ...defaultSettings(''), calm };
  useEffect(() => {
    applyCalm(kidSettings.calm, !activeId);
  }, [kidSettings.calm, activeId]);
  useEffect(() => {
    const sub = subjectOfRoute(route, paperSubject, booksOpen);
    if (sub === 'english' || sub === 'evs') document.documentElement.setAttribute('data-subject', sub);
    else document.documentElement.removeAttribute('data-subject');
  }, [route, paperSubject, booksOpen]);

  // "Explain it another way" uses Claude through the artifact's sample capability, when this view has it.
  useEffect(() => {
    (async () => {
      try {
        const claude = (globalThis as { claude?: { use?: (n: string) => Promise<unknown> } }).claude;
        const fn = (await claude?.use?.('sample')) as SampleFn | null | undefined;
        if (fn) setSample(() => fn);
      } catch {
        /* not available: the ordinary hints stay */
      }
    })();
  }, []);

  // Development only: "?fixture" adds a small made-up English lesson so the screens can be tried before real lessons open.
  useEffect(() => {
    if (!import.meta.env.DEV || !new URLSearchParams(location.search).has('fixture')) return;
    void Promise.all([import('../../tests/fixtures/lesson'), import('../subjects/english/build')]).then(([f, b]) => setLessons([...readerUnits, b.lessonToUnit(f.lesson)]));
  }, []);

  // Move focus to the page heading and scroll up whenever the screen changes.
  const routeKey = route.page + ('lesson' in route ? String(route.lesson.number) : '') + ('session' in route ? route.session.id : '') + ('code' in route ? route.code ?? '' : '') + ('exam' in route ? route.exam.code : '') + ('unit' in route && route.unit ? subjectOf(route.unit) + route.unit.id : '') + ('set' in route ? route.set.questions.length + route.set.title + (route.set.questions[0]?.prompt ?? '') : '');
  // The quiet line goes by itself after a few seconds.
  useEffect(() => {
    if (toast.length === 0) return;
    const t = setTimeout(() => setToast([]), 9000);
    return () => clearTimeout(t);
  }, [toast]);
  useEffect(() => {
    if (route.page !== 'practice') setSummary(undefined);
  }, [route.page]);
  // Stamps found from earlier practice are told about once, on Home, in one friendly popup (never silently)
  useEffect(() => {
    if (!opened || route.page !== 'home' || !activeId) return;
    const cur = rewardsRef.current[activeId];
    if (!cur || (cur.foundShown && cur.milestonesShown)) return;
    const found = cur.foundShown ? [] : STAMP_DEFS.filter((d) => cur.stamps[d.id]?.pre && !cur.seen.includes(d.id));
    const preMilestones = cur.milestonesShown ? 0 : Object.values(cur.milestones).flatMap((m) => Object.values(m)).filter((e) => e?.pre).length;
    const stamp = new Date().toISOString();
    const next = { ...cur, foundShown: cur.foundShown ?? stamp, milestonesShown: cur.milestonesShown ?? stamp };
    rewardsRef.current[activeId] = next;
    setRewardsMap((all) => ({ ...all, [activeId]: next }));
    opened.store.set('rewards', activeId, next).catch(() => undefined);
    if (found.length === 0 && preMilestones === 0) return;
    const s = settingsMap[activeId] ?? defaultSettings(activeId);
    const plan = planFound(found, popupMode(s.reward, s.calm, reducedMotion()), preMilestones);
    if (plan.queue.length > 0) setPopup({ plan, key: Date.now() });
    else if (s.reward !== 'minimal') setToast(plan.lines);
  }, [route.page, activeId, opened]);
  useEffect(() => {
    window.scrollTo(0, 0);
    const h = document.getElementById('page-h');
    (h ?? main.current)?.focus({ preventScroll: true });
  }, [routeKey]);

  const store = opened?.store;
  const savePrefs = useCallback(
    (patch: Prefs) => {
      prefsRef.current = { ...prefsRef.current, ...patch };
      store?.set('prefs', 'app', prefsRef.current).catch(() => undefined);
    },
    [store],
  );

  if (!opened || !store) return <div class="loading" role="status">Opening Homework Buddy…</div>;

  const kid = kids.find((k) => k.id === activeId);
  const myProgress = kid ? progress[kid.id] : undefined;
  const myFirsts = kid ? activityRef.current[kid.id]?.firsts : undefined;

  const updateProgress = (fn: (p: KidProgress) => KidProgress) => {
    if (!kid) return;
    const next = fn(progressRef.current[kid.id] ?? progress[kid.id] ?? emptyProgress(kid.id));
    progressRef.current[kid.id] = next;
    setProgress((all) => ({ ...all, [kid.id]: next }));
    store.set('progress', kid.id, next).catch(() => undefined);
  };
  /** The child has seen these stamps: their New tag goes. */
  const markSeen = (ids: string[]) => {
    if (!kid) return;
    const cur = rewardsRef.current[kid.id];
    if (!cur) return;
    const add = ids.filter((id) => !cur.seen.includes(id));
    if (add.length === 0) return;
    const next = { ...cur, seen: [...cur.seen, ...add] };
    rewardsRef.current[kid.id] = next;
    setRewardsMap((all) => ({ ...all, [kid.id]: next }));
    store.set('rewards', kid.id, next).catch(() => undefined);
  };
  /**
   * At the end of every set, exam or Word Quest session (after the activity log and the progress are written): which chapters became Done,
   * which stamps were earned, and what to show. Popups come only now, never mid-question.
   */
  const runRewards = (opts: { answers?: { q?: string; correct: boolean }[]; chapterKey?: string; unit?: UnitDef; level?: Level; topicSet?: boolean } = {}) => {
    if (!kid) return;
    const log = activityRef.current[kid.id];
    if (!log) return;
    const now = new Date().toISOString();
    const ev = evaluateRewards({ rewards: rewardsRef.current[kid.id] ?? { ...emptyRewards(kid.id), init: now }, progress: progressRef.current[kid.id], log, units: REWARD_UNITS, now, answers: opts.answers, chapterKey: opts.chapterKey });
    rewardsRef.current[kid.id] = ev.rewards;
    setRewardsMap((all) => ({ ...all, [kid.id]: ev.rewards }));
    store.set('rewards', kid.id, ev.rewards).catch(() => undefined);
    const s = settingsMap[kid.id] ?? defaultSettings(kid.id);
    const plan = planPopups(ev, popupMode(s.reward, s.calm, reducedMotion()));
    // where the unit stands at the level just practised (a topic set passes a topic; a mixed sheet does not)
    let unitLine: string | undefined;
    const ck = opts.unit ? chapterKeyOf(opts.unit) : undefined;
    const ch = ck ? CHAPTERS.find((x) => x.key === ck) : undefined;
    if (opts.unit && ch && opts.level) {
      const lp = levelProgress(progressRef.current[kid.id], log.firsts, opts.unit, opts.level);
      const lv = LEVEL_NAME[opts.level];
      const ans = opts.answers ?? [];
      const passedNow = Boolean(opts.topicSet) && ans.length >= 3 && ans.filter((x) => x.correct).length * 100 >= PASS_PERCENT * ans.length;
      unitLine = passedNow ? `Topic passed: ${lp.passed} of ${lp.of} ${lv} topics in ${BOOK_WORD[ch.book]} ${ch.n}.` : opts.topicSet ? `${BOOK_WORD[ch.book]} ${ch.n} · ${lv}: ${lp.passed} of ${lp.of} topics passed.` : `${BOOK_WORD[ch.book]} ${ch.n} · ${lv}: ${lp.passed} of ${lp.of} topics passed. A mixed sheet is good practice, but only a topic set can pass a topic.`;
    }
    setSummary({ reward: s.reward, plan, meter: ev.meter, stage: ev.stage, leaves: ev.leaves, minutesToday: Math.round(secondsOnDay(log, new Date()) / 60), goalMinutes: s.goalMinutes, chapter: ev.chapter, unitLine });
    if (plan.queue.length > 0) setPopup({ plan, key: Date.now() });
    else if (s.reward !== 'minimal' && plan.lines.length > 0) setToast(plan.lines);
  };

  /** Change one kid's reward settings and save them. */
  const updateSettings = (kidId: string, patch: Partial<KidSettings>) => {
    const next = normaliseSettings({ ...(settingsMap[kidId] ?? defaultSettings(kidId)), ...patch }, kidId);
    setSettingsMap((all) => ({ ...all, [kidId]: next }));
    store.set('settings', kidId, next).catch(() => undefined);
  };
  /** Change one kid's activity log and save it. Counts and ids only. */
  const updateActivity = (fn: (l: ActivityLog) => ActivityLog) => {
    if (!kid) return;
    const now = new Date().toISOString();
    const next = fn(activityRef.current[kid.id] ?? emptyLog(kid.id, now, progress[kid.id]));
    activityRef.current[kid.id] = next;
    store.set('activity', kid.id, next).catch(() => undefined);
  };
  const logSet = (mode: Mode, unit: UnitDef, size: number, seconds: number, answers: AnswerRecord[]) => {
    if (!kid || answers.length === 0) return;
    const subject = subjectOf(unit);
    const entry = buildEntry({ at: new Date().toISOString(), kid: kid.id, mode, subject, book: bookOf(subject, unit.number), unit: String(baseOfBook(subject, unit.number)), size, seconds, answers });
    updateActivity((l) => record(l, entry, answers));
  };
  const logExam = (mode: 'exam' | 'paper', e: Exam, r: TestResult) => {
    const subject = e.subject ?? 'maths';
    const row: ExamRow = { at: r.date, mode, label: r.label ?? e.header.examination, subject, portion: e.unitsUsed.map((n) => (subject === 'maths' ? String(n) : subject === 'evs' ? `e${n}` : n < 11 ? `r${n}` : `p${n - 10}`)), got: r.got, of: r.of, secs: r.seconds, sections: r.sections.map((s, i) => ({ n: i + 1, got: s.got, of: s.of })) };
    updateActivity((l) => recordExam(l, row));
  };
  const logMark = (kind: 'practice' | 'exam', qq: Question, max: number, fin: number, ai?: number) => {
    const a = ai ?? aiMarks.current.get(questionHash(qq));
    updateActivity((l) => recordMark(l, { at: new Date().toISOString(), kind, q: questionHash(qq), max, ...(a !== undefined ? { ai: a } : {}), fin, by: a !== undefined && a === fin ? 'ai' : 'parent' }));
  };

  const pick = (id: string) => {
    setActiveId(id);
    savePrefs({ activeKid: id });
  };

  const backup = async () => {
    const data = {
      app: 'Homework Buddy',
      exportedAt: new Date().toISOString(),
      kids: await listKids(store),
      ...(await (async () => {
        const b = await exportBackup(store, kids, prefsRef.current, new Date().toISOString());
        return { progress: b.progress, activity: b.activity, settings: b.settings, rewards: b.rewards };
      })()),
      prefs: prefsRef.current,
    };
    const r = await saveFile(`homework-buddy-backup-${new Date().toISOString().slice(0, 10)}.json`, new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    setBackupMsg(r.message);
  };

  /** Maths units and English lessons together: worksheet codes (M01-…, E01-…) pick the subject. */
  const allUnits = [...builtUnits, ...lessons, ...practiceUnits, unseenUnit, ...evsUnits];
  const indexOf = (unit: UnitDef): Route => (subjectOf(unit) === 'maths' ? { page: 'index' } : { page: 'english' });
  const sheetFor = (unit: UnitDef, spec: Parameters<typeof resolveSpec>[0]) => {
    const r = resolveSpec(spec, allUnits);
    return r.ok ? r.sheet : undefined;
  };
  const mySessions = sessions.filter((x) => x.kidId === kid?.id);
  const saveSession = (x: SavedSession) => {
    setSessions((all) => [...all.filter((y) => y.id !== x.id), x]);
    store.set('sessions', x.id, x).catch(() => undefined);
  };
  const dropSession = (id: string) => {
    setSessions((all) => all.filter((y) => y.id !== id));
    store.remove('sessions', id).catch(() => undefined);
  };
  const practiceRef = useRef<PracticeState | undefined>(undefined);

  /** No repeats: what this kid has seen is remembered, and a new sheet is made from the seed that repeats least. */
  const refsOf = (qs: Question[]): QuestionRef[] => qs.map((q) => ({ typeId: q.typeId, level: q.level, hash: questionHash(q) }));
  const rememberQuestions = (qs: Question[]) => {
    if (!kid) return;
    const before = seenRef.current;
    for (const r of refsOf(qs)) if (before[seenId(kid.id, r.typeId)]?.cells[r.level]?.includes(r.hash)) preSeen.current.add(`${r.typeId}|${r.level}|${r.hash}`);
    const next = remember(before, kid.id, refsOf(qs));
    seenRef.current = next;
    void saveSeen(store, before, next).catch(() => undefined);
  };
  const examQuestions = (e: Exam): Question[] => e.sections.flatMap((x) => x.questions);
  const betterExamSeed = (format: 'A' | 'B' | 'U', units: number[], header?: Parameters<typeof buildExam>[0]['header']): string =>
    pickSeed(
      (sd) => {
        const r = buildExam({ format, units, seed: sd, header }, builtUnits);
        return r.ok ? refsOf(examQuestions(r.exam)) : undefined;
      },
      avoidMap(seenRef.current, kid?.id),
      randomExamSeed,
      5,
    );

  const betterEnglishSeed = (format: 'A' | 'B', units: number[], header?: Parameters<typeof buildEnglishExam>[0]['header']): string =>
    pickSeed(
      (sd) => {
        const r = buildEnglishExam({ format, units, seed: sd, header }, ALL_ENGLISH_DATA);
        return r.ok ? refsOf(examQuestions(r.exam)) : undefined;
      },
      avoidMap(seenRef.current, kid?.id),
      randomExamSeed,
      4,
    );
  const betterEvsSeed = (format: EvsFormat, chapters: number[], header?: Parameters<typeof buildEvsExam>[0]['header']): string =>
    pickSeed(
      (sd) => {
        const r = buildEvsExam({ format, chapters, seed: sd, header }, evsChapters);
        return r.ok ? refsOf(examQuestions(r.exam)) : undefined;
      },
      avoidMap(seenRef.current, kid?.id),
      randomExamSeed,
      4,
    );
  /** Claude's suggested mark for a written answer in an English paper (a suggestion only). Not offered when AI help is off or unavailable. */
  const suggestExam: Suggest | undefined =
    sample && aiHints
      ? async (qq, answer, max, passage) => {
          const r = await suggestExamMark({ sample, enabled: aiHints, q: qq, answer, max, passage, store });
          if (r) aiMarks.current.set(questionHash(qq), r.mark);
          return r;
        }
      : undefined;

  /** What an unfinished set holds, in words that are true: its place and its answers so far; nothing is counted until the set ends. */
  const askReplace = (old: SavedSession, go: () => void) =>
    setConfirm({
      title: 'You have an unfinished set',
      body: [`${old.title}, at question ${(old.practice?.idx ?? 0) + 1}. Starting a new one removes your place in it and the answers you gave in it so far: they are not counted until a set ends.`, 'Your stars and your finished sets stay.'],
      confirmLabel: 'Start new set',
      cancelLabel: 'Keep the old one',
      onConfirm: go,
    });
  /** Clear unfinished sets (one, or all on a page) after asking. Nothing already counted is touched. */
  const askClear = (list: SavedSession[]) =>
    setConfirm({
      title: list.length === 1 ? 'Clear this unfinished set?' : `Clear all ${list.length} unfinished sets?`,
      body: [
        list.length === 1 ? `${list[0]!.title}${list[0]!.kind === 'practice' ? `, question ${(list[0]!.practice?.idx ?? 0) + 1}` : ''}.` : list.map((x) => x.title).slice(0, 4).join('; ') + (list.length > 4 ? `; and ${list.length - 4} more.` : '.'),
        'This removes your place and the answers given so far in them. Those answers are not counted until a set ends, so no stars or scores change. Finished sets, stars and everything else stay.',
      ],
      confirmLabel: list.length === 1 ? 'Clear it' : 'Clear all',
      cancelLabel: list.length === 1 ? 'Keep it' : 'Keep them',
      onConfirm: () => list.forEach((x) => dropSession(x.id)),
    });

  /** Start a practice set (one topic, or all topics mixed). An unfinished set for this kid is offered first. */
  const beginPractice = (unit: UnitDef, type: QuestionType | undefined, level: Level, size = 20) => {
    const topic = type ? topicNumber(type.id) : 'MIX';
    const subject = subjectOf(unit);
    const key = (kidId: string) => practiceKey(kidId, unit.number, topic, level, subject);
    const go = () => {
    const base = subject === 'maths' ? { unitNumber: unit.number } : { subject, unitNumber: unit.number };
    const specOf = (seed: string) => (type ? ({ ...base, kind: 'topic', topic, level, seed } as const) : ({ ...base, kind: 'mixed', level, size, seed } as const));
    const seed = pickSeed((sd) => {
      const w0 = sheetFor(unit, specOf(sd));
      return w0?.set ? refsOf(w0.set.questions) : undefined;
    }, avoidMap(seenRef.current, kid?.id), newSeed);
    const w = sheetFor(unit, specOf(seed));
    if (w?.set) rememberQuestions(w.set.questions);
    practiceRef.current = undefined;
    if (w?.set) setRoute({ page: 'practice', unit, set: w.set, key: kid ? key(kid.id) : undefined });
    };
    const old = kid ? mySessions.find((x) => x.id === key(kid.id)) : undefined;
    if (isUnfinished(old)) return askReplace(old, () => { dropSession(old.id); go(); });
    go();
  };
  /** The book's own exercise (or the whole lesson) exactly as printed, in book order. An unfinished one is offered first. */
  const beginBook = (unit: UnitDef, key: string) => {
    const subject = subjectOf(unit);
    const topic = key === 'ALL' ? 'BOOK' : `BX${key}`;
    const sk = (kidId: string) => practiceKey(kidId, unit.number, topic, 'medium', subject);
    const go = () => {
      const w = sheetFor(unit, { subject, unitNumber: unit.number, kind: 'book', topic: key, level: 'medium', seed: '' });
      practiceRef.current = undefined;
      if (w?.set) setRoute({ page: 'practice', unit, set: w.set, key: kid ? sk(kid.id) : undefined });
    };
    const old = kid ? mySessions.find((x) => x.id === sk(kid.id)) : undefined;
    if (isUnfinished(old)) return askReplace(old, () => { dropSession(old.id); go(); });
    go();
  };
  const bookKeyOf = (code?: string): string => (/-BX(\d{2})$/.exec(code ?? '')?.[1] ?? 'ALL');
  const printBook = (unit: UnitDef, key: string) => {
    const w = sheetFor(unit, { subject: subjectOf(unit), unitNumber: unit.number, kind: 'book', topic: key, level: 'medium', seed: '' });
    if (w) setRoute({ page: 'preview', doc: docPrintable(w.doc), back: { page: 'unit', unit }, backLabel: 'Back to the lesson' });
  };
  const startPractice = (unit: UnitDef, type: QuestionType, level: Level) => beginPractice(unit, type, level);
  const startMixed = (unit: UnitDef, level: Level, size = 20) => beginPractice(unit, undefined, level, size);
  const unitExamSession = (unit: UnitDef) => mySessions.find((x) => x.kind === 'exam' && x.code.startsWith(`EX-U-${String(unit.number).padStart(2, '0')}-`) && isUnfinished(x));
  const beginTest = (unit: UnitDef) => {
    const old = kid ? unitExamSession(unit) : undefined;
    if (old) return setRoute({ page: 'resume', unit, session: old });
    const header = { className: 'III', subject: 'Mathematics' };
    const r = buildExam({ format: 'U', units: [unit.number], seed: betterExamSeed('U', [unit.number], header), header }, builtUnits);
    if (r.ok) {
      rememberQuestions(examQuestions(r.exam));
      setRoute({ page: 'exam', exam: r.exam, unit });
    }
  };
  const continueSession = (unit: UnitDef | undefined, x: SavedSession) => {
    if (x.kind === 'exam') {
      const r = resolveExamAny(x.code, allUnits, x.header);
      if (r?.ok) {
        // answers saved against questions that have since changed are not mixed into the rebuilt paper
        const stale = examIsStale(x.test, r.exam.sections.flatMap((s) => s.questions));
        if (stale) setToast([STALE_MESSAGE]);
        setRoute({ page: 'exam', exam: r.exam, unit, ...(stale ? {} : { initial: x.test }) });
      }
      return;
    }
    const r = resolveCode(x.code, allUnits);
    if (r.ok && r.sheet.set && unit) {
      // a set saved against questions that have since changed starts again: old answers and phases are never put on new questions
      const here = r.sheet.set.questions;
      const stale = practiceIsStale(x.practice, here);
      if (stale) setToast([STALE_MESSAGE]);
      practiceRef.current = stale ? undefined : x.practice;
      setRoute({ page: 'practice', unit, set: r.sheet.set, key: x.id, ...(stale ? {} : { initial: x.practice }) });
    }
  };
  const finish = (level: Level, unit: UnitDef, size: number, set: PracticeSet) => (outcomes: Outcome[], topicSetRun: boolean, seconds = 0) => {
    if (outcomes.length === 0) return;
    updateProgress((p) => recordResults(p, level, outcomes, new Date().toISOString(), topicSetRun));
    const wrong = new Set(kid ? rewardsRef.current[kid.id]?.wrong ?? [] : []);
    logSet(topicSetRun ? 'topic' : 'mixed', unit, size, seconds, outcomes.map((o) => ({ typeId: o.typeId, level: o.level ?? level, correct: o.correct, q: o.q, firstTry: o.firstTry, hints: o.hints, seconds: o.seconds, seen: o.q ? preSeen.current.has(`${o.typeId}|${o.level ?? level}|${o.q}`) : undefined, wasWrong: o.q ? wrong.has(o.q) : undefined })));
    for (const o of outcomes) if (o.mark && o.q) updateActivity((l) => recordMark(l, { at: new Date().toISOString(), kind: 'practice', q: o.q!, max: 1, ...(o.mark!.ai !== undefined ? { ai: o.mark!.ai } : {}), fin: o.mark!.fin, by: o.mark!.by }));
    runRewards({ answers: outcomes.map((o) => ({ q: o.q, correct: o.correct })), chapterKey: chapterKeyOf(unit), unit, level, topicSet: topicSetRun && !set.book });
  };

  const mySheets = sheets.filter((x) => x.kidId === kid?.id).sort((a, b) => b.printedAt.localeCompare(a.printedAt));
  const saveSheet = async (sheet: SavedSheet) => {
    setSheets((all) => [...all.filter((x) => x.id !== sheet.id), sheet]);
    await store.set('worksheets', sheet.id, sheet).catch(() => undefined);
  };
  /** Remember a printed worksheet for the picked kid so the answers can be entered later. */
  const printed = (doc: Printable) => {
    if (!kid || !doc.code) return;
    if (sheets.some((x) => x.kidId === kid.id && x.code === doc.code)) return;
    const r = resolveCode(doc.code, allUnits);
    void saveSheet({ ...newSaved(kid.id, doc.code, doc.title, new Date().toISOString()), ...(r.ok ? { fp: questionsFingerprint(flatQuestions(r.sheet)) } : {}) });
  };
  const checked = (w: Worksheet, outcomes: Outcome[], test?: TestResult) => {
    if (test) {
      updateProgress((p) => recordTest(p, test));
      if (w.exam) logExam('paper', w.exam, test);
      runRewards({});
    } else if (outcomes.length > 0) {
      updateProgress((p) => recordResults(p, w.level ?? 'medium', outcomes, new Date().toISOString(), w.kind === 'topic' || w.kind === 'book'));
      const wrong = new Set(kid ? rewardsRef.current[kid.id]?.wrong ?? [] : []);
      logSet('worksheet', w.unit, outcomes.length, 0, outcomes.map((o) => ({ typeId: o.typeId, level: o.level ?? w.level ?? 'medium', correct: o.correct, q: o.q, wasWrong: o.q ? wrong.has(o.q) : undefined })));
      runRewards({ answers: outcomes.map((o) => ({ q: o.q, correct: o.correct })), chapterKey: chapterKeyOf(w.unit) });
    }
  };

  // The five books: Maths, the English Reader, the Practice Book, the unseen passages, and exam preparation.
  const entriesOf = (cts: { number: number; title: string; printedPage: number }[], built: UnitDef[], word: string, label: (n: number) => string): BookEntry[] =>
    [...cts, ...built.filter((u) => !cts.some((c) => c.number === u.number)).map((u) => ({ number: u.number, title: u.title, printedPage: u.printedPages[0] }))].map((c) => ({
      label: `${word} ${label(c.number)}`,
      title: c.title,
      page: c.printedPage,
      unit: built.find((u) => u.number === c.number),
    }));
  const bookDefs: BookDef[] = [
    { id: 'maths', title: 'Maths', count: `${contents.length} units`, tone: 'maths', word: 'unit', entries: entriesOf(contents, builtUnits, 'Unit', (n) => String(n)) },
    { id: 'reader', title: 'English Reader', count: `${englishContents.length} lessons`, tone: 'english', word: 'lesson', entries: entriesOf(englishContents, lessons, 'Lesson', (n) => String(n)) },
    { id: 'practice', title: 'English Practice Book', count: `${practiceContents.length} sections`, tone: 'english', word: 'section', entries: entriesOf(practiceContents, practiceUnits, 'Section', (n) => String(n - 10)) },
    { id: 'evs', title: 'EVS: We and Our World', count: `${evsContents.length} chapters`, tone: 'evs', word: 'chapter', entries: entriesOf(evsContents, evsUnits, 'Chapter', (n) => String(n)) },
    { id: 'unseen', title: 'Unseen passages', count: 'New passages to read', tone: 'english', word: 'set', entries: [{ label: 'Set', title: 'Unseen passages', unit: unseenUnit }] },
    {
      id: 'exams',
      title: 'Exam preparation',
      count: '2 kinds of paper',
      tone: 'exam',
      word: 'paper',
      entries: [
        { label: 'Maths', title: 'Maths exam papers', sub: 'Periodic Test (25 marks) or Term Exam (50 marks) from the units you choose', onOpen: () => setRoute({ page: 'exams' }) },
        { label: 'EVS', title: 'EVS exam papers', sub: 'Periodic Test (25 marks) or Term Exam (50 marks) like your school\'s EVS paper, from the chapters you choose', onOpen: () => setRoute({ page: 'evsExams' }) },
        { label: 'English', title: 'English exam papers', sub: "Periodic Test (25 marks) or Term Exam (50 marks) like your school's English paper", onOpen: () => setRoute({ page: 'englishExams' }) },
      ],
    },
  ];
  const shelf: ShelfBook[] = bookDefs.map((b) => {
    const total = b.entries.filter((e) => e.unit).length;
    return { id: b.id, title: b.title, count: b.count, tone: b.tone, ...(total ? { done: bookCounts(b, myProgress, myFirsts).done, total } : {}) };
  });
  const openBook = (id: BookId) => {
    setBooksOpen(id);
    setRoute({ page: id === 'maths' || id === 'exams' ? 'index' : 'english' });
  };
  // "Where you left off": this kid's newest unfinished practice set or exam.
  const lastSession = mySessions.filter((x) => isUnfinished(x)).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
  const resumeInfo = (() => {
    if (!lastSession) return undefined;
    const sub = lastSession.subject ?? 'maths';
    const unit = allUnits.find((u) => subjectOf(u) === sub && u.number === lastSession.unitNumber);
    const detail = lastSession.kind === 'exam' ? `${formatClock(lastSession.test?.left ?? 0)} left · the clock waited while you were away` : `Question ${(lastSession.practice?.idx ?? 0) + 1} · same questions as before`;
    return { title: lastSession.title, detail, subject: sub, onContinue: () => continueSession(unit, lastSession) };
  })();

  // Rewards for the picked kid: Pip, recent stamps and the next stamp to aim for.
  const myRewards = (kid ? rewardsMap[kid.id] : undefined) ?? emptyRewards(kid?.id ?? '');
  const pipLeaves = CHAPTERS.filter((c) => {
    const u = unitOfChapter(c, REWARD_UNITS);
    return u ? chapterState(myProgress, myFirsts, u).challenge : false;
  }).length;
  const doneCount = pipPoints(myRewards);
  const pipStage = stageFor(doneCount);
  const pipNext = nextStage(pipStage);
  const homePip = { stage: pipStage, meter: pipMeter(myRewards, kid ? activityRef.current[kid.id] : undefined), leaves: pipLeaves, done: doneCount, toNext: pipNext ? pipNext.at - doneCount : toNextOrchard(doneCount), nextName: pipNext?.name, orchard: orchardOf(doneCount) };
  const nextHint = nextStamp(myProgress, myFirsts, REWARD_UNITS, myRewards);
  // a New tag stays until the child has seen the stamp: in a popup, or by opening it in the album
  const newStampIds = Object.keys(myRewards.stamps).filter((id) => !myRewards.seen.includes(id));

  let screen;
  switch (route.page) {
    case 'index':
    case 'english':
      screen = (
        <BooksIndex
          books={bookDefs}
          open={booksOpen}
          onOpenBook={(id) => {
            setBooksOpen(id);
            setRoute({ page: id === 'maths' || id === 'exams' ? 'index' : 'english' });
          }}
          onOpen={(unit) => setRoute({ page: 'unit', unit })}
          onHome={() => setRoute({ page: 'home' })}
          onPaper={() => setRoute({ page: 'paper' })}
          progress={myProgress}
          firsts={myFirsts}
        />
      );
      break;
    case 'wordquest':
      screen = <WordQuest key={route.lesson.number} lesson={route.lesson} data={questLesson(route.lesson.number)} kidId={kid?.id} kidName={kid?.name} store={store} onBack={() => setRoute({ page: 'unit', unit: route.lesson })} help={kidSettings.keyboardHelp} onHelp={kid ? (on) => updateSettings(kid.id, { keyboardHelp: on }) : undefined} onActivity={(row) => {
        updateActivity((l) => recordQuest(l, { at: new Date().toISOString(), ...row }));
        runRewards({});
      }} />;
      break;
    case 'home':
      screen = (
        <HomeView
          kidName={kid?.name}
          kids={kids}
          activeId={activeId}
          onPick={pick}
          onAddKid={() => setRoute({ page: 'kids' })}
          resume={resumeInfo}
          shelf={shelf}
          onBook={openBook}
          minutesToday={Math.round(secondsOnDay(kid ? activityRef.current[kid.id] : undefined, new Date()) / 60)}
          goalMinutes={kidSettings.goalMinutes}
          showRing={showsRing(kidSettings)}
          reward={kidSettings.reward}
          pip={homePip}
          recent={recentStamps(myRewards, 5)}
          stampCount={Object.keys(myRewards.stamps).length}
          newIds={newStampIds}
          nextLine={nextHint ? nextStampLine(nextHint) : undefined}
          onAlbum={() => setRoute({ page: 'album' })}
          onPip={() => setRoute({ page: 'pip' })}
          onPaper={() => setRoute({ page: 'paper' })}
        />
      );
      break;
    case 'unit': {
      const unit = route.unit;
      const subject = subjectOf(unit);
      screen = (
        <UnitPage
          unit={unit}
          progress={myProgress}
          onBack={() => setRoute(indexOf(unit))}
          onPractice={(t, l) => startPractice(unit, t, l)}
          onBook={subject !== 'maths' ? (k) => beginBook(unit, k) : undefined}
          onBookPrint={subject !== 'maths' ? (k) => printBook(unit, k) : undefined}
          onMixed={(l, n) => startMixed(unit, l, n)}
          onPaper={() => setRoute({ page: 'paper' })}
          onTest={subject === 'maths' ? () => beginTest(unit) : undefined}
          groupOf={subject !== 'maths' ? (t) => englishGroup(t) : undefined}
          onWordQuest={subject === 'english' && unit.number <= 4 ? () => setRoute({ page: 'wordquest', lesson: unit }) : undefined}
          hasSession={(topic, level, size) => (kid ? isUnfinished(mySessions.find((x) => x.id === practiceKey(kid.id, unit.number, topic ?? 'MIX', level, subject))) : false)}
          testSession={Boolean(kid && subject === 'maths' && unitExamSession(unit))}
          banners={mySessions
            .filter((x) => sessionIsFor(x, subject, unit.number) && isUnfinished(x) && x.kind !== 'test' && (subject === 'maths' || x.kind === 'practice'))
            .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
            .map((x) => {
              const r = x.kind === 'practice' ? resolveCode(x.code, allUnits) : undefined;
              const n = r && r.ok && r.sheet.set ? r.sheet.set.questions.length : 0;
              return {
                id: x.id,
                title: x.title,
                detail: x.kind === 'exam' ? `${formatClock(x.test?.left ?? 0)} left · the clock waited while you were away` : `question ${(x.practice?.idx ?? 0) + 1}${n ? ` of ${n}` : ''} · same questions as before`,
                onContinue: () => continueSession(unit, x),
                onClear: () => askClear([x]),
              };
            })}
          levelCounts={kid && chapterKeyOf(unit) ? { easy: levelProgress(myProgress, myFirsts, unit, 'easy'), medium: levelProgress(myProgress, myFirsts, unit, 'medium'), challenge: levelProgress(myProgress, myFirsts, unit, 'challenge') } : undefined}
          onClearAll={() => askClear(mySessions.filter((x) => sessionIsFor(x, subject, unit.number) && isUnfinished(x) && x.kind !== 'test' && (subject === 'maths' || x.kind === 'practice')))}
        />
      );
      break;
    }
    case 'resume': {
      const { unit, session } = route;
      screen = (
        <ResumeCard
          title={session.kind === 'exam' ? 'Your paper is waiting' : 'Your practice set is waiting'}
          detail={
            session.kind === 'exam'
              ? `${session.title}. Time left: ${formatClock(session.test?.left ?? 0)}. The clock waited while you were away.`
              : `${session.title}. You are on question ${(session.practice?.idx ?? 0) + 1}. The same questions and your answers so far are kept.`
          }
          onContinue={() => continueSession(unit, session)}
          onReset={() => {
            dropSession(session.id);
            setRoute({ page: 'unit', unit });
          }}
          onBack={() => setRoute({ page: 'unit', unit })}
        />
      );
      break;
    }
    case 'practice': {
      const { unit, set } = route;
      const type = unit.types.find((t) => t.id === set.topicId);
      screen = (
        <Practice
          key={routeKey}
          unit={unit}
          set={set}
          kidName={kid?.name}
          onBack={() => setRoute({ page: 'unit', unit })}
          initial={route.initial}
          explain={sample && aiHints ? (qq, wrong) => explainAnotherWay({ sample, enabled: aiHints, q: qq, wrong, store }) : undefined}
          suggest={sample && aiHints ? (qq, answer) => suggestMark({ sample, enabled: aiHints, q: qq, answer, passage: unit.texts?.find((t) => t.id === qq.passage), store }) : undefined}
          onState={(st) => {
            practiceRef.current = st;
            if (route.key && kid) saveSession({ id: route.key, kidId: kid.id, kind: 'practice', code: set.code ?? '', ...(subjectOf(unit) === 'maths' ? {} : { subject: subjectOf(unit) }), unitNumber: unit.number, title: `${unit.title}: ${set.title}${set.book ? ', exactly as in the book' : `, ${LEVEL_NAME[set.level]}`}`, updatedAt: new Date().toISOString(), practice: st });
          }}
          onPrint={() => setRoute({ page: 'preview', doc: docPrintable(setDoc(unit, set)), back: { ...route, initial: practiceRef.current ?? route.initial }, backLabel: 'Back to practice' })}
          onAnother={() => (set.book ? beginBook(unit, bookKeyOf(set.code)) : type ? startPractice(unit, type, set.level) : startMixed(unit, set.level))}
          onFinish={finish(set.level, unit, set.questions.length, set)}
          headline={summary && summary.reward !== 'minimal' && summary.plan.lines.length > 0 ? <div class="earned-note" role="status">{summary.plan.lines.map((l) => <p key={l}>{l}</p>)}</div> : undefined}
          extras={summary ? <SetExtras data={summary} onAlbum={() => setRoute({ page: 'album' })} /> : undefined}
        />
      );
      break;
    }
    case 'exams': {
      const unfinished = mySessions.filter((x) => x.kind === 'exam' && !x.code.startsWith('EN-') && isUnfinished(x));
      screen = (
        <ExamSetup
          key={route.startUnit ?? 0}
          contents={contents}
          built={builtUnits}
          startUnit={route.startUnit}
          unfinished={unfinished}
          onBack={() => setRoute({ page: 'index' })}
          betterSeed={betterExamSeed}
          onPreview={(exam) => {
            rememberQuestions(examQuestions(exam));
            setRoute({ page: 'preview', doc: examPrintable(exam), back: route, backLabel: 'Exam setup' });
          }}
          onTake={(exam) => {
            rememberQuestions(examQuestions(exam));
            setRoute({ page: 'exam', exam });
          }}
          onPaper={(exam) => {
            rememberQuestions(examQuestions(exam));
            setRoute({ page: 'paper', code: exam.code });
          }}
          onContinue={(sx) => continueSession(undefined, sx)}
          onDiscard={(sx) => dropSession(sx.id)}
        />
      );
      break;
    }
    case 'englishExams': {
      const unfinished = mySessions.filter((x) => x.kind === 'exam' && x.code.startsWith('EN-') && isUnfinished(x));
      screen = (
        <EnglishExamSetup
          data={ALL_ENGLISH_DATA}
          reader={englishContents}
          practice={practiceContents}
          unfinished={unfinished}
          betterSeed={betterEnglishSeed}
          onBack={() => setRoute({ page: 'english' })}
          onPreview={(exam) => {
            rememberQuestions(examQuestions(exam));
            setRoute({ page: 'preview', doc: examPrintable(exam), back: route, backLabel: 'English exam setup' });
          }}
          onTake={(exam) => {
            rememberQuestions(examQuestions(exam));
            setRoute({ page: 'exam', exam });
          }}
          onPaper={(exam) => {
            rememberQuestions(examQuestions(exam));
            setRoute({ page: 'paper', code: exam.code });
          }}
          onContinue={(sx) => continueSession(undefined, sx)}
          onDiscard={(sx) => dropSession(sx.id)}
        />
      );
      break;
    }
    case 'evsExams': {
      const unfinished = mySessions.filter((x) => x.kind === 'exam' && x.code.startsWith('EV-') && isUnfinished(x));
      screen = (
        <EvsExamSetup
          data={evsChapters}
          unfinished={unfinished}
          betterSeed={betterEvsSeed}
          onBack={() => setRoute({ page: 'english' })}
          onPreview={(exam) => {
            rememberQuestions(examQuestions(exam));
            setRoute({ page: 'preview', doc: examPrintable(exam), back: route, backLabel: 'EVS exam setup' });
          }}
          onTake={(exam) => {
            rememberQuestions(examQuestions(exam));
            setRoute({ page: 'exam', exam });
          }}
          onPaper={(exam) => {
            rememberQuestions(examQuestions(exam));
            setRoute({ page: 'paper', code: exam.code });
          }}
          onContinue={(sx) => continueSession(undefined, sx)}
          onDiscard={(sx) => dropSession(sx.id)}
        />
      );
      break;
    }
    case 'exam': {
      const { exam, unit } = route;
      const isEnglish = exam.subject === 'english';
      const examHome: Route = exam.subject === 'evs' ? { page: 'evsExams' } : isEnglish ? { page: 'englishExams' } : { page: 'exams' };
      const back = () => setRoute(unit ? { page: 'unit', unit } : examHome);
      screen = (
        <ExamScreen
          key={exam.code}
          exam={exam}
          initial={route.initial}
          onBack={back}
          onAgain={() => {
            if (exam.format === 'U' && unit) return beginTest(unit);
            setRoute(examHome);
          }}
          onPrint={() => setRoute({ page: 'preview', doc: examPrintable(exam), back: route, backLabel: 'Back to the paper' })}
          onState={(st) => {
            if (!kid) return;
            const id = examKey(kid.id, exam.code);
            if (!st) return dropSession(id);
            st = { ...st, fp: questionsFingerprint(examQuestions(exam)) };
            saveSession({ id, kidId: kid.id, kind: 'exam', code: exam.code, ...(exam.subject === 'english' || exam.subject === 'evs' ? { subject: exam.subject } : {}), unitNumber: exam.unitsUsed[0] ?? 0, title: `${exam.header.examination}, Class ${exam.header.className}`, header: { examination: exam.header.examination, session: exam.header.session, school: exam.header.school ?? '', className: exam.header.className, subject: exam.header.subject }, updatedAt: new Date().toISOString(), test: st });
          }}
          suggest={suggestExam}
          onResult={(r: TestResult) => {
            updateProgress((p) => recordTest(p, r));
            logExam('exam', exam, r);
            runRewards({});
          }}
          onMark={(qq, mark) => logMark('exam', qq, qq.marks, mark)}
        />
      );
      break;
    }
    case 'preview':
      screen = <PrintPreview doc={route.doc} backLabel={route.backLabel} onBack={() => setRoute(route.back)} onPrinted={() => printed(route.doc)} onEnter={() => setRoute({ page: 'paper', code: route.doc.code })} />;
      break;
    case 'paper':
      screen = (
        <EnterAnswers
          key={route.code ?? 'pick'}
          units={allUnits}
          kidName={kid?.name}
          kidId={kid?.id}
          saved={mySheets}
          startCode={route.code}
          onBack={() => setRoute({ page: 'index' })}
          onSave={saveSheet}
          onChecked={checked}
          onMark={(qq, mark) => logMark('exam', qq, qq.marks, mark)}
          onPickKid={() => setRoute({ page: 'kids' })}
          onSubject={setPaperSubject}
          suggest={suggestExam}
          onPrintAgain={(w) =>
            setRoute({
              page: 'preview',
              doc: w.exam ? examPrintable(w.exam) : docPrintable(w.doc),
              back: { page: 'paper', code: w.code },
              backLabel: 'Back to the answer sheet',
            })
          }
        />
      );
      break;
    case 'progress':
      screen = (
        <ProgressView
          kid={kid}
          kids={kids}
          progress={myProgress}
          log={kid ? activityRef.current[kid.id] : undefined}
          rewards={myRewards}
          units={REWARD_UNITS}
          goalMinutes={kidSettings.goalMinutes}
          onBackup={backup}
          backupMsg={backupMsg}
          onPick={pick}
          onAddKid={() => setRoute({ page: 'kids' })}
          onAlbum={() => setRoute({ page: 'album' })}
          onPip={() => setRoute({ page: 'pip' })}
          onOpenChapter={(key) => {
            const c = CHAPTERS.find((x) => x.key === key);
            const u = c ? unitOfChapter(c, REWARD_UNITS) : undefined;
            if (u) setRoute({ page: 'unit', unit: u });
          }}
        />
      );
      break;
    case 'album':
      screen = <StampAlbum kidName={kid?.name} rewards={myRewards} next={nextHint} newIds={newStampIds} onSeen={(id) => markSeen([id])} onBack={() => setRoute({ page: 'home' })} />;
      break;
    case 'pip':
      screen = <PipLadder kidName={kid?.name} rewards={myRewards} progress={myProgress} firsts={myFirsts} units={REWARD_UNITS} meter={pipMeter(myRewards, kid ? activityRef.current[kid.id] : undefined)} leaves={pipLeaves} onBack={() => setRoute({ page: 'home' })} />;
      break;
    case 'settings': {
      const sk = kids.find((k) => k.id === (route.kidId ?? activeId)) ?? kids[0];
      screen = (
        <SettingsView
          kids={kids}
          kid={sk}
          settings={sk ? settingsMap[sk.id] ?? defaultSettings(sk.id) : undefined}
          onPickKid={(id) => setRoute({ page: 'settings', kidId: id })}
          onChange={(patch) => sk && updateSettings(sk.id, patch)}
          onReset={() => sk && updateSettings(sk.id, defaultSettings(sk.id))}
          onBack={() => setRoute({ page: 'kids' })}
        />
      );
      break;
    }
    case 'kids':
      screen = (
        <KidsView
          onSettings={(id) => setRoute({ page: 'settings', kidId: id })}
          kids={kids}
          activeId={activeId}
          where={opened.kind}
          onAdd={async (name, grade) => {
            const k = await addKid(store, name, grade);
            const nowIso = new Date().toISOString();
            const fresh = emptyLog(k.id, nowIso);
            activityRef.current[k.id] = fresh;
            store.set('activity', k.id, fresh).catch(() => undefined);
            const rw = { ...emptyRewards(k.id), init: nowIso, milestonesInit: nowIso };
            rewardsRef.current[k.id] = rw;
            setRewardsMap((all) => ({ ...all, [k.id]: rw }));
            store.set('rewards', k.id, rw).catch(() => undefined);
            setKids(await listKids(store));
            pick(k.id);
          }}
          onPick={pick}
          onRemove={async (id) => {
            await removeKid(store, id);
            await store.remove('progress', id);
            await store.remove('activity', id).catch(() => undefined);
            await store.remove('settings', id).catch(() => undefined);
            await store.remove('rewards', id).catch(() => undefined);
            delete activityRef.current[id];
            delete rewardsRef.current[id];
            delete progressRef.current[id];
            const rest = await listKids(store);
            setKids(rest);
            setProgress((all) => {
              const { [id]: _gone, ...others } = all;
              return others;
            });
            if (activeId === id) pick(rest[0]?.id ?? '');
          }}
          onBackup={backup}
          backupMsg={backupMsg}
          aiHints={aiHints}
          aiAvailable={sample !== null}
          onAiHints={(on) => {
            setAiHints(on);
            savePrefs({ aiHints: on });
          }}
        />
      );
      break;
  }

  return (
    <>
      <TopBar
        kids={kids}
        activeId={activeId}
        page={route.page}
        onPick={pick}
        onHome={() => setRoute({ page: 'home' })}
        onProgress={() => setRoute({ page: 'progress' })}
        onKids={() => setRoute({ page: 'kids' })}
        subject={subjectOfRoute(route, paperSubject, booksOpen)}
        theme={theme}
        onTheme={() => setTheme(nextTheme(theme))}
        calm={kidSettings.calm}
        onCalm={() => (kid ? updateSettings(kid.id, { calm: !kidSettings.calm }) : setCalm(!calm))}
        onBooks={() => {
          setBooksOpen('maths');
          setRoute({ page: 'index' });
        }}
      />
      <main ref={main} tabIndex={-1} aria-label={route.page === 'preview' ? 'Print preview' : undefined}>
        {screen}
      </main>
      {confirm && (
        <ConfirmDialog
          title={confirm.title}
          confirmLabel={confirm.confirmLabel}
          cancelLabel={confirm.cancelLabel}
          onCancel={() => setConfirm(undefined)}
          onConfirm={() => {
            const go = confirm.onConfirm;
            setConfirm(undefined);
            go();
          }}
        >
          {confirm.body.map((t) => (
            <p key={t}>{t}</p>
          ))}
        </ConfirmDialog>
      )}
      {popup && <RewardPopups key={popup.key} plan={popup.plan} sound={kidSettings.sound} onSeen={markSeen} onDone={() => setPopup(undefined)} />}
      {toast.length > 0 && route.page !== 'practice' && (
        <div class="toast no-print" role="status" aria-live="polite">
          <div>
            {toast.map((l) => (
              <p key={l}>{l}</p>
            ))}
          </div>
          <button class="btn quiet" onClick={() => setToast([])}>
            Close
          </button>
        </div>
      )}
    </>
  );
}

export { LEVEL_NAME };
