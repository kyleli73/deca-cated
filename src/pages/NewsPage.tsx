import { useLiveQuery } from 'dexie-react-hooks';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Segmented } from '../components/ui.tsx';
import { useSettings } from '../hooks.ts';
import { db } from '../lib/db.ts';
import { allSources, forgetSource, markRead, refreshNews, sortTime, studyLinks, TOPICS, type NewsSource, type SourceStatus, type Topic } from '../lib/news.ts';
import { getSettings, modifySettings } from '../lib/repo.ts';
import { dayKey, formatDate } from '../lib/time.ts';
import type { NewsItem } from '../lib/types.ts';

const STALE_MS = 30 * 60_000;
const PAGE = 40;

function ago(t: number): string {
  const min = Math.round((Date.now() - t) / 60_000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min} min ago`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} h ago`;
  return formatDate(t);
}

function groupLabel(t: number): string {
  const day = dayKey(t);
  const today = dayKey();
  if (day === today) return 'Today';
  if (day === dayKey(Date.now() - 86_400_000)) return 'Yesterday';
  if (Date.now() - t < 7 * 86_400_000) return 'This week';
  return 'Earlier';
}

export default function NewsPage() {
  const settings = useSettings();
  const items = useLiveQuery(() => db.news.toArray());
  const [topic, setTopic] = useState<Topic | 'all'>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [status, setStatus] = useState<Map<string, SourceStatus>>(new Map());
  const [shown, setShown] = useState(PAGE);
  const started = useRef(false);
  const running = useRef(false);
  const again = useRef(false);

  // One refresh at a time; asking again while one runs queues a single re-run.
  const refresh = useCallback(async () => {
    if (running.current) {
      again.current = true;
      return;
    }
    running.current = true;
    setRefreshing(true);
    try {
      do {
        again.current = false;
        setStatus(await refreshNews());
      } while (again.current);
    } finally {
      running.current = false;
      setRefreshing(false);
    }
  }, []);

  // Refresh when the page opens if the saved news is more than 30 minutes old.
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void getSettings().then((s) => {
      if (Date.now() - s.newsFetchedAt > STALE_MS) void refresh();
    });
  }, [refresh]);

  if (!items) return null;

  const sources = allSources(settings);
  const enabled = new Map(sources.filter((s) => !settings.newsDisabled.includes(s.id)).map((s) => [s.id, s]));
  /** The enabled sources that list an article (topic filter applied). */
  const sourcesOf = (i: NewsItem, t: Topic | 'all') =>
    i.sourceIds.map((id) => enabled.get(id)).filter((s): s is NewsSource => !!s && (t === 'all' || s.topic === t));
  const visible = items.filter((i) => sourcesOf(i, topic).length > 0).sort((a, b) => sortTime(b) - sortTime(a));
  const deca = topic === 'all' ? visible.filter((i) => sourcesOf(i, 'deca').length > 0).slice(0, 4) : [];
  const list = visible.filter((i) => !deca.includes(i));
  const failed = [...status.values()].filter((s) => !s.ok);
  const offline = status.size > 0 && failed.length === status.size;

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>News</h1>
          <p className="lede">Business, finance and DECA news to read between study sessions.</p>
        </div>
        <div className="row">
          <span className="muted small" aria-live="polite">
            {refreshing ? 'Updating…' : settings.newsFetchedAt ? `Updated ${ago(settings.newsFetchedAt)}` : ''}
          </span>
          <button type="button" className="btn" onClick={() => void refresh()} disabled={refreshing}>
            Refresh
          </button>
        </div>
      </div>

      {offline && (
        <div className="notice warn" role="status" style={{ marginBottom: 20 }}>
          Couldn't reach the news sites.{' '}
          {failed.every((f) => !f.ok && f.error === 'offline')
            ? 'News loads through the app (npm run dev or npm run app) and needs internet. '
            : ''}
          {items.length ? 'Showing the articles saved last time.' : ''}
        </div>
      )}

      <div className="row" style={{ marginBottom: 24 }}>
        <Segmented label="Topic" value={topic} onChange={(t) => (setTopic(t), setShown(PAGE))} options={TOPICS} />
      </div>

      {deca.length > 0 && (
        <section style={{ marginBottom: 32 }} aria-labelledby="from-deca">
          <h2 id="from-deca" style={{ marginBottom: 12 }}>
            From DECA Direct
          </h2>
          <div className="news-cards">
            {deca.map((i) => (
              <NewsCard key={i.id} item={i} source={sourcesOf(i, 'deca')[0]} compact />
            ))}
          </div>
        </section>
      )}

      {visible.length === 0 ? (
        <div className="empty">
          <h2>{refreshing ? 'Loading news…' : 'No articles yet'}</h2>
          {!refreshing && <p className="muted">Press Refresh to load the latest news.</p>}
        </div>
      ) : (
        <div className="news-list">
          {list.slice(0, shown).map((i, n, arr) => {
            const label = groupLabel(sortTime(i));
            const first = n === 0 || groupLabel(sortTime(arr[n - 1])) !== label;
            return (
              <div key={i.id}>
                {first && <h2 className="news-group">{label}</h2>}
                <NewsCard item={i} source={sourcesOf(i, topic)[0]} />
              </div>
            );
          })}
          {list.length > shown && (
            <button type="button" className="btn" onClick={() => setShown(shown + PAGE)} style={{ justifySelf: 'start' }}>
              Show more
            </button>
          )}
        </div>
      )}

      <Sources sources={sources} disabled={settings.newsDisabled} status={status} onChanged={() => void refresh()} />
    </div>
  );
}

function NewsCard({ item, source, compact }: { item: NewsItem; source?: NewsSource; compact?: boolean }) {
  const links = studyLinks(item);
  const when = item.published;
  return (
    <article className={`news-item${item.readAt ? ' read' : ''}${compact ? ' compact' : ''}`}>
      <div className="news-meta">
        <span>{source?.name ?? 'News'}</span>
        {when !== null && <span>{ago(when)}</span>}
        {item.audio && <span>Listen</span>}
      </div>
      <a className="news-title" href={item.id} target="_blank" rel="noopener noreferrer" onClick={() => void markRead(item.id)}>
        {item.title}
      </a>
      {item.summary && <p className="news-summary">{item.summary}</p>}
      {links.length > 0 && (
        <div className="news-tags" aria-label="Study areas">
          {links.map((l) => (
            <span key={l} className="tag">
              {l}
            </span>
          ))}
        </div>
      )}
    </article>
  );
}

function Sources({
  sources,
  disabled,
  status,
  onChanged,
}: {
  sources: NewsSource[];
  disabled: string[];
  status: Map<string, SourceStatus>;
  onChanged: () => void;
}) {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  // Checkboxes flip immediately; the setting saves in the background.
  const [off, setOff] = useState(disabled);
  useEffect(() => setOff(disabled), [disabled]);

  const toggle = async (id: string, on: boolean) => {
    setOff((o) => (on ? o.filter((d) => d !== id) : [...o, id]));
    await modifySettings((s) => ({ newsDisabled: on ? s.newsDisabled.filter((d) => d !== id) : [...new Set([...s.newsDisabled, id])] }));
    if (on) onChanged();
  };

  const add = async (e: FormEvent) => {
    e.preventDefault();
    let parsed: URL;
    try {
      parsed = new URL(url.trim());
      if (!/^https?:$/.test(parsed.protocol)) throw new Error();
    } catch {
      setError('Enter the full feed address, starting with https://');
      return;
    }
    if (allSources(await getSettings()).some((x) => x.url === parsed.href)) {
      setError('That feed is already in your list.');
      return;
    }
    const feed = { id: `custom-${crypto.randomUUID()}`, name: name.trim() || parsed.hostname, url: parsed.href };
    await modifySettings((s) => ({ newsCustom: [...s.newsCustom, feed] }));
    setName('');
    setUrl('');
    setError('');
    onChanged();
  };

  const remove = async (id: string) => {
    await modifySettings((s) => ({ newsCustom: s.newsCustom.filter((c) => c.id !== id), newsDisabled: s.newsDisabled.filter((d) => d !== id) }));
    await forgetSource(id);
  };

  return (
    <section className="card" style={{ marginTop: 40 }} aria-labelledby="news-sources">
      <h2 id="news-sources">Sources</h2>
      <p className="muted small">Choose what shows up. You can add any news site's RSS feed.</p>
      <ul className="source-list">
        {sources.map((s) => {
          const st = status.get(s.id);
          return (
            <li key={s.id}>
              <label className="check">
                <input type="checkbox" checked={!off.includes(s.id)} onChange={(e) => void toggle(s.id, e.target.checked)} />
                {s.name}
              </label>
              <span className="muted small source-status">
                {st ? (st.ok ? `${st.count} article${st.count === 1 ? '' : 's'}` : `Couldn't load: ${st.error === 'offline' ? 'no connection' : st.error}`) : ''}
              </span>
              {s.custom && (
                <button type="button" className="btn ghost small danger" onClick={() => void remove(s.id)}>
                  Remove
                </button>
              )}
            </li>
          );
        })}
      </ul>
      <form className="fields" onSubmit={(e) => void add(e)} style={{ marginTop: 16, alignItems: 'end' }}>
        <label className="field">
          Name
          <input type="text" value={name} placeholder="Optional" onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="field" style={{ gridColumn: 'span 2' }}>
          Feed address (RSS or Atom)
          <input type="text" inputMode="url" value={url} placeholder="https://…" onChange={(e) => setUrl(e.target.value)} />
        </label>
        <button type="submit" className="btn" disabled={!url.trim()}>
          Add feed
        </button>
      </form>
      {error && (
        <p className="small" style={{ color: 'var(--bad)', marginTop: 8 }} role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
