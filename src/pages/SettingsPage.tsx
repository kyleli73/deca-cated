import { useEffect, useRef, useState } from 'react';
import { download } from '../components/ui.tsx';
import { useSettings } from '../hooks.ts';
import { backupFileName, eraseAll, exportBackup, restoreBackup, validateBackup } from '../lib/backup.ts';
import { requestPersistentStorage, updateSettings } from '../lib/repo.ts';
import type { Settings } from '../lib/types.ts';

export default function SettingsPage() {
  const settings = useSettings();
  const [message, setMessage] = useState<{ kind: 'ok' | 'bad'; text: string } | null>(null);
  const [persisted, setPersisted] = useState<boolean | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void navigator.storage?.persisted?.().then(setPersisted);
  }, []);

  const set = (patch: Partial<Settings>) => void updateSettings(patch);

  const doExport = async () => {
    const backup = await exportBackup();
    download(backupFileName(), JSON.stringify(backup), 'application/json');
    setMessage({ kind: 'ok', text: `Downloaded a backup of ${backup.exams.length} exams, ${backup.questions.length} questions and ${backup.sessions.length} sessions.` });
  };

  const doImport = async (file: File) => {
    try {
      const backup = validateBackup(JSON.parse(await file.text()));
      const ok = confirm(
        `Restore “${file.name}”?\n\nThis replaces everything on this device with the backup: ${backup.exams.length} exams, ${backup.questions.length} questions, ${backup.sessions.length} sessions.`,
      );
      if (!ok) return;
      await restoreBackup(backup);
      setMessage({ kind: 'ok', text: `Restored ${backup.exams.length} exams and ${backup.questions.length} questions from ${file.name}.` });
    } catch (e) {
      setMessage({ kind: 'bad', text: e instanceof SyntaxError ? "That file isn't valid JSON." : e instanceof Error ? e.message : String(e) });
    }
  };

  return (
    <div className="stack" style={{ gap: 24 }}>
      <div>
        <h1>Settings</h1>
        <p className="lede" style={{ marginBottom: 0 }}>
          Changes save automatically.
        </p>
      </div>

      <section className="card">
        <h2 style={{ marginBottom: 16 }}>Study</h2>
        <div className="fields">
          <NumberField label="Questions-answered goal" value={settings.goal} min={1} onSave={(v) => set({ goal: v })} />
          <NumberField label="Full exam time (minutes)" hint="Ontario DECA: 70 for 100 questions" value={settings.examMinutes} min={1} onSave={(v) => set({ examMinutes: v })} />
          <NumberField label="Drill pace (seconds per question)" hint="Sets the default timer for drills" value={settings.secondsPerQuestion} min={5} onSave={(v) => set({ secondsPerQuestion: v })} />
        </div>
        <div className="fields" style={{ marginTop: 16 }}>
          <label className="field">
            Countdown to
            <input type="text" value={settings.eventName} onChange={(e) => set({ eventName: e.target.value })} />
          </label>
          <label className="field">
            Date
            <input type="date" value={settings.eventDate} onChange={(e) => set({ eventDate: e.target.value })} />
            <span className="field-hint">Clear it to hide the countdown</span>
          </label>
        </div>
      </section>

      <section className="card">
        <h2>Backup</h2>
        <p className="muted small">
          Everything is stored in this browser on this device. Download a backup now and then, and to move to another computer, restore it there.
          {persisted === true && ' The browser has agreed not to clear this data automatically.'}
          {persisted === false && (
            <>
              {' '}
              <button type="button" className="link-btn" onClick={() => void requestPersistentStorage().then(setPersisted)}>
                Ask the browser to keep this data
              </button>
            </>
          )}
        </p>
        <div className="row" style={{ marginTop: 12 }}>
          <button type="button" className="btn primary" onClick={() => void doExport()}>
            Download backup (.json)
          </button>
          <button type="button" className="btn" onClick={() => fileInput.current?.click()}>
            Restore from backup…
          </button>
          <input
            ref={fileInput}
            type="file"
            accept=".json,application/json"
            hidden
            data-testid="backup-input"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void doImport(f);
              e.target.value = '';
            }}
          />
        </div>
        {message && (
          <div className={`notice${message.kind === 'bad' ? ' bad' : ''}`} style={{ marginTop: 16 }} role="status">
            {message.text}
          </div>
        )}
      </section>

      <section className="card">
        <h2>Erase everything</h2>
        <p className="muted small">Deletes all exams, questions, results and settings on this device. Download a backup first.</p>
        <button
          type="button"
          className="btn danger"
          onClick={() => {
            if (confirm('Erase all DECA Study data on this device? This cannot be undone.')) {
              void eraseAll().then(() => setMessage({ kind: 'ok', text: 'All data erased.' }));
            }
          }}
        >
          Erase all data
        </button>
      </section>
    </div>
  );
}

/** Number input that saves on blur/enter so half-typed values aren't stored. */
function NumberField({ label, hint, value, min, onSave }: { label: string; hint?: string; value: number; min: number; onSave: (v: number) => void }) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  const commit = () => {
    const v = Math.round(Number(draft));
    if (Number.isFinite(v) && v >= min) onSave(v);
    else setDraft(String(value));
  };
  return (
    <label className="field">
      {label}
      <input
        type="number"
        min={min}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && commit()}
      />
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  );
}
