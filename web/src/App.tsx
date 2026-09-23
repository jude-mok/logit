import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUpRight,
  Plus,
  Search,
  Heart,
  X,
  ArrowLeft,
  Grid2X2,
  Images,
  LogOut,
  Upload,
  ChevronDown,
  Leaf,
  Check,
  Trash2,
} from "lucide-react";
import {
  request,
  session,
  imageUrl,
  filterMoments,
  monthKey,
  type Moment,
  type User,
} from "./api";
import { demoMoments } from "./demo";
import "./style.css";
export default function App() {
  const [columnCount, setColumnCount] = useState(journalColumns);
  useEffect(() => {
    const resize = () => setColumnCount(journalColumns());
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);
  const [mode, setMode] = useState<"demo" | "live">(() =>
    session.get() ? "live" : "demo",
  );
  const [moments, setMoments] = useState<Moment[]>(() =>
      session.get() ? [] : demoMoments,
    ),
    [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<"moments" | "favorites" | "albums">(
      "moments",
    ),
    [query, setQuery] = useState(""),
    [month, setMonth] = useState("");
  const [loading, setLoading] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const [modal, setModal] = useState<"new" | "detail" | "auth" | null>(null),
    [selected, setSelected] = useState<Moment | null>(null),
    [caption, setCaption] = useState("");
  const [file, setFile] = useState<File | null>(null),
    [preview, setPreview] = useState(""),
    [signup, setSignup] = useState(false),
    [notice, setNotice] = useState("");
  const [auth, setAuth] = useState({ user_name: "", password: "", email: "" });
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  async function load() {
    const startedWith = session.get();
    setLoading(true);
    setError("");
    try {
      const [u, m] = await Promise.all([
        request<User>("/me/"),
        request<Moment[]>("/moments/?order=chronological"),
      ]);
      if (session.get() !== startedWith) return;
      setUser(u);
      setMoments(m);
    } catch (e) {
      if (session.get() === startedWith) setError(message(e));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    if (mode === "live") void load();
  }, [mode]);
  useEffect(() => {
    const expired = () => {
      setUser(null);
      setMoments([]);
      setModal("auth");
      setError("Your session has expired. Please sign in again.");
    };
    window.addEventListener("logit:expired", expired);
    return () => window.removeEventListener("logit:expired", expired);
  }, []);
  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setPreview(url);
      return () => URL.revokeObjectURL(url);
    }
    setPreview("");
  }, [file]);
  useEffect(() => {
    if (modal) dialogRef.current?.showModal();
    else dialogRef.current?.close();
  }, [modal]);
  useEffect(() => {
    if (!notice) return;
    const id = setTimeout(() => setNotice(""), 3500);
    return () => clearTimeout(id);
  }, [notice]);
  const visible = useMemo(
    () => filterMoments(moments, query, view === "favorites", month),
    [moments, query, view, month],
  );
  const months = useMemo(
    () =>
      [...new Set(moments.map((m) => monthKey(m.created_at)))].sort().reverse(),
    [moments],
  );
  const close = () => {
    if (busy) return;
    setModal(null);
    setError("");
    setDeleteConfirm(false);
  };
  const openNew = () => {
    setFile(null);
    setCaption("");
    setError("");
    setModal("new");
  };
  function replace(m: Moment) {
    setMoments((old) => old.map((item) => (item.id === m.id ? m : item)));
    setSelected(m);
  }
  async function star(m: Moment) {
    if (busy) return;
    setBusy(true);
    try {
      replace(
        mode === "demo"
          ? { ...m, is_starred: !m.is_starred }
          : await request<Moment>(`/moments/${m.id}/star`, { method: "PATCH" }),
      );
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  async function save() {
    setBusy(true);
    setError("");
    try {
      if (modal === "new") {
        if (!file) throw new Error("Choose a photo first.");
        let m: Moment;
        if (mode === "demo") {
          const data = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result));
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
          m = {
            id: Date.now(),
            image_path: data,
            comment: caption,
            is_starred: false,
            created_at: Date.now() / 1000,
          };
        } else {
          const body = new FormData();
          body.append("file", file);
          body.append("comment", caption);
          m = await request<Moment>(
            `/moments/?timezone=${encodeURIComponent(Intl.DateTimeFormat().resolvedOptions().timeZone)}`,
            { method: "POST", body },
          );
        }
        setMoments((old) => [m, ...old]);
        setView("moments");
        setMonth("");
        setQuery("");
      } else if (selected) {
        replace(
          mode === "demo"
            ? { ...selected, comment: caption }
            : await request<Moment>(`/moments/${selected.id}/edit`, {
                method: "PATCH",
                body: JSON.stringify({ new_comment: caption }),
              }),
        );
      }
      setModal(null);
      setNotice(
        mode === "demo"
          ? "Saved in this demo. Refreshing resets your changes."
          : "Your moment is saved.",
      );
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    if (!selected) return;
    setBusy(true);
    try {
      if (mode === "live")
        await request(`/moments/${selected.id}`, { method: "DELETE" });
      setMoments((old) => old.filter((m) => m.id !== selected.id));
      setModal(null);
      setDeleteConfirm(false);
      setNotice("Moment deleted.");
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  async function login(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const tokens = await request<{ access_token: string }>(
        signup ? "/auth/sign_up" : "/auth/signin",
        { method: "POST", body: JSON.stringify(auth) },
      );
      session.set(tokens.access_token);
      setMoments([]);
      setModal(null);
      setAuth({ user_name: "", password: "", email: "" });
      if (mode === "live") await load();
      else setMode("live");
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  function signout() {
    setSelected(null);
    setFile(null);
    setCaption("");
    session.clear();
    setUser(null);
    setMoments(demoMoments);
    setMode("demo");
    setView("moments");
    setMonth("");
    setQuery("");
    setError("");
  }
  return (
    <>
      <header className="topbar">
        <a className="wordmark" href="/">
          logit<span>✳</span>
        </a>
        <nav aria-label="Main navigation">
          {(["moments", "albums", "favorites"] as const).map((v) => (
            <button
              key={v}
              className={view === v ? "nav active" : "nav"}
              onClick={() => {
                setView(v);
                setMonth("");
                setQuery("");
              }}
            >
              {v === "moments"
                ? "My moments"
                : v === "albums"
                  ? "Albums"
                  : "Favorites"}
            </button>
          ))}
        </nav>
        <div className="top-actions">
          <span className="private">
            <span /> A little space, just for you
          </span>
          {mode === "demo" ? (
            <button
              className="login"
              onClick={() => {
                setError("");
                setModal("auth");
              }}
            >
              Sign in <ArrowUpRight size={15} />
            </button>
          ) : (
            <button className="avatar" title="Sign out" onClick={signout}>
              {user?.user_name.slice(0, 1).toUpperCase() || (
                <LogOut size={16} />
              )}
            </button>
          )}
        </div>
      </header>
      <main>
        <div className="intro">
          <div>
            <div className="eyebrow">THE EVERYDAY, WORTH KEEPING</div>
            <h1>
              {view === "favorites"
                ? "The ones you love."
                : view === "albums"
                  ? "A life, in little chapters."
                  : "Keep a little of today."}
            </h1>
            <p>
              {view === "favorites"
                ? "Some moments deserve a second look."
                : view === "albums"
                  ? "Time passes. These stay."
                  : "Not every day is extraordinary. But there’s something in every day."}
            </p>
          </div>
          <button className="primary" onClick={openNew}>
            <Plus size={18} /> Add a moment
          </button>
        </div>
        {mode === "demo" && (
          <div className="demo-banner">
            <span>
              <Leaf size={15} /> You’re wandering through a sample journal. Make
              yourself at home.
            </span>
            <button
              onClick={() => {
                setSignup(true);
                setError("");
                setModal("auth");
              }}
            >
              Start your own <ArrowUpRight size={14} />
            </button>
          </div>
        )}
        <div className="toolbar">
          <div className="section-label">
            {month ? (
              <button
                className="back"
                onClick={() => {
                  setMonth("");
                  setView("albums");
                }}
              >
                <ArrowLeft size={16} />
                {monthName(month)}
              </button>
            ) : (
              <>
                <span className="tiny-icon">
                  {view === "albums" ? (
                    <Images size={17} />
                  ) : view === "favorites" ? (
                    <Heart size={17} />
                  ) : (
                    <Grid2X2 size={17} />
                  )}
                </span>
                {view === "albums"
                  ? "Your albums"
                  : view === "favorites"
                    ? "Favorite moments"
                    : "All moments"}{" "}
                <span className="count">
                  {view === "albums" ? months.length : visible.length}
                </span>
              </>
            )}
          </div>
          <div className="filters">
            <label className="search">
              <Search size={16} />
              <input
                aria-label="Search moments"
                placeholder="Find a little memory…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            {view !== "albums" && (
              <label className="month-select">
                <select
                  aria-label="Filter by month"
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                >
                  <option value="">All time</option>
                  {months.map((m) => (
                    <option key={m} value={m}>
                      {monthName(m)}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} />
              </label>
            )}
          </div>
        </div>
        {error && !modal && (
          <div className="error" role="alert">
            {error} <button onClick={() => void load()}>Try again</button>
          </div>
        )}
        {loading ? (
          <div className="empty">
            <span className="loader" />
            <h2>Gathering your moments…</h2>
            <p>A little patience for the good things.</p>
          </div>
        ) : view === "albums" ? (
          <div className="album-grid">
            {months
              .filter((key) =>
                moments.some(
                  (m) =>
                    monthKey(m.created_at) === key &&
                    (m.comment || "")
                      .toLowerCase()
                      .includes(query.toLowerCase()),
                ),
              )
              .map((key) => {
                const items = moments.filter(
                  (m) => monthKey(m.created_at) === key,
                );
                return (
                  <button
                    className="album"
                    key={key}
                    onClick={() => {
                      setMonth(key);
                      setView("moments");
                      setQuery("");
                    }}
                  >
                    <img
                      src={imageUrl(items[0].image_path)}
                      alt={monthName(key)}
                    />
                    <div>
                      <h2>{monthName(key)}</h2>
                      <span>
                        {items.length} moments <ArrowUpRight size={16} />
                      </span>
                    </div>
                  </button>
                );
              })}
          </div>
        ) : (
          <div
            className="masonry"
            style={{
              gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))`,
            }}
          >
            {Array.from({ length: columnCount }, (_, column) => (
              <div className="masonry-column" key={column}>
                {visible
                  .filter((_, index) => index % columnCount === column)
                  .map((m, i) => (
                    <article className="moment" key={m.id}>
                      <div className={`photo photo-${m.id % 5}`}>
                        <button
                          className="photo-open"
                          aria-label={`Open ${m.comment || "moment"}`}
                          onClick={() => {
                            setSelected(m);
                            setCaption(m.comment || "");
                            setError("");
                            setDeleteConfirm(false);
                            setModal("detail");
                          }}
                        >
                          <img
                            src={imageUrl(m.image_path)}
                            alt={m.comment || "A saved moment"}
                            loading={i < 4 ? "eager" : "lazy"}
                          />
                        </button>
                        <button
                          className={`heart ${m.is_starred ? "hearted" : ""}`}
                          disabled={busy}
                          aria-label={
                            m.is_starred
                              ? "Remove from favorites"
                              : "Add to favorites"
                          }
                          onClick={() => void star(m)}
                        >
                          <Heart
                            size={17}
                            fill={m.is_starred ? "currentColor" : "none"}
                          />
                        </button>
                        <span className="photo-hint">
                          A closer look <ArrowUpRight size={14} />
                        </span>
                      </div>
                      <div className="moment-caption">
                        <p>{m.comment || "A moment worth keeping."}</p>
                        <time>{dateLabel(m.created_at)}</time>
                      </div>
                    </article>
                  ))}
              </div>
            ))}
          </div>
        )}
        {!loading &&
          ((view !== "albums" && visible.length === 0) ||
            (view === "albums" && months.length === 0)) && (
            <div className="empty">
              <Leaf size={32} />
              <h2>
                {query || month
                  ? "No moments found."
                  : view === "favorites"
                    ? "Keep your favorites close."
                    : "Your story starts with a moment."}
              </h2>
              <p>
                {view === "favorites"
                  ? "Tap the heart on a photo to find it here."
                  : "A photo. A few words. A little piece of your day."}
              </p>
              <button
                className="secondary"
                onClick={
                  query || month
                    ? () => {
                        setQuery("");
                        setMonth("");
                      }
                    : openNew
                }
              >
                {query || month ? "Clear filters" : "Add your first moment"}
              </button>
            </div>
          )}
        <footer>
          <span className="footer-logo">logit✳</span>
          <span>A small collection of a life well noticed.</span>
          <span>
            {mode === "demo"
              ? "Sample journal · Changes reset on refresh"
              : "Your moments, at your own pace."}
          </span>
        </footer>
      </main>
      {notice && (
        <div className="toast" role="status">
          <Check size={17} />
          {notice}
        </div>
      )}
      <dialog
        ref={dialogRef}
        onCancel={(e) => {
          e.preventDefault();
          close();
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) close();
        }}
      >
        <div className={`dialog-content ${modal === "detail" ? "detail" : ""}`}>
          <button
            className="close"
            aria-label="Close dialog"
            disabled={busy}
            onClick={close}
          >
            <X size={20} />
          </button>
          {modal === "auth" ? (
            <>
              <div className="wordmark">
                logit<span>✳</span>
              </div>
              <h2>
                {signup ? "Make room for your everyday." : "Welcome back."}
              </h2>
              <p className="muted">
                {signup
                  ? "One photo. One day. A journal that feels like you."
                  : "Your little collection is waiting for you."}
              </p>
              <form onSubmit={login}>
                <label>
                  Username
                  <input
                    required
                    minLength={2}
                    maxLength={30}
                    autoComplete="username"
                    value={auth.user_name}
                    onChange={(e) =>
                      setAuth({ ...auth, user_name: e.target.value })
                    }
                  />
                </label>
                {signup && (
                  <label>
                    Email
                    <input
                      type="email"
                      required
                      autoComplete="email"
                      value={auth.email}
                      onChange={(e) =>
                        setAuth({ ...auth, email: e.target.value })
                      }
                    />
                  </label>
                )}
                <label>
                  Password
                  <input
                    required
                    type="password"
                    minLength={signup ? 8 : 1}
                    autoComplete={signup ? "new-password" : "current-password"}
                    value={auth.password}
                    onChange={(e) =>
                      setAuth({ ...auth, password: e.target.value })
                    }
                  />
                </label>
                <button className="primary full" disabled={busy}>
                  {busy
                    ? "Just a moment…"
                    : signup
                      ? "Create your journal"
                      : "Sign in"}
                </button>
              </form>
              <button
                className="text-button"
                disabled={busy}
                onClick={() => {
                  setSignup(!signup);
                  setError("");
                }}
              >
                {signup
                  ? "Already have a journal? Sign in"
                  : "New here? Create an account"}
              </button>
            </>
          ) : (
            <>
              <h2>
                {modal === "new"
                  ? "What will you keep today?"
                  : "A little piece of your day."}
              </h2>
              <p className="muted">
                {modal === "new"
                  ? "One photo a day. It doesn’t have to be perfect."
                  : selected
                    ? dateLabel(selected.created_at)
                    : ""}
              </p>
              {modal === "detail" && selected ? (
                <img
                  className="detail-image"
                  src={imageUrl(selected.image_path)}
                  alt={selected.comment || "Your moment"}
                />
              ) : (
                <label className={`upload ${preview ? "has-photo" : ""}`}>
                  {preview ? (
                    <img src={preview} alt="Selected photo preview" />
                  ) : (
                    <>
                      <Upload size={28} />
                      <strong>Choose a photo</strong>
                      <span>JPEG, PNG or WebP · up to 10 MB</span>
                    </>
                  )}
                  <input
                    aria-label="Choose a photo"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    disabled={busy}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      if (
                        !["image/jpeg", "image/png", "image/webp"].includes(
                          f.type,
                        ) ||
                        f.size > 10 * 1024 * 1024
                      ) {
                        setError(
                          "Choose a JPEG, PNG or WebP photo under 10 MB.",
                        );
                        return;
                      }
                      setError("");
                      setFile(f);
                    }}
                  />
                </label>
              )}
              <label className="caption-label">
                A few words to remember
                <textarea
                  placeholder="What made this moment yours?"
                  value={caption}
                  maxLength={2000}
                  disabled={busy}
                  onChange={(e) => setCaption(e.target.value)}
                />
              </label>
              <div className="dialog-actions">
                {modal === "detail" && (
                  <button
                    className="delete"
                    disabled={busy}
                    onClick={() => setDeleteConfirm(true)}
                  >
                    <Trash2 size={16} /> Delete
                  </button>
                )}
                <button
                  className="primary"
                  onClick={() => void save()}
                  disabled={busy || (modal === "new" && !file)}
                >
                  {busy ? "Saving…" : "Save moment"}
                  <ArrowUpRight size={16} />
                </button>
              </div>
              {deleteConfirm && (
                <div className="confirm">
                  <p>Delete this moment permanently?</p>
                  <button disabled={busy} onClick={() => void remove()}>
                    Yes, delete
                  </button>
                  <button
                    disabled={busy}
                    onClick={() => setDeleteConfirm(false)}
                  >
                    Keep it
                  </button>
                </div>
              )}
            </>
          )}
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
        </div>
      </dialog>
    </>
  );
}
function message(e: unknown) {
  return e instanceof Error
    ? e.message
    : "Something went wrong. Please try again.";
}
function monthName(key: string) {
  return new Date(`${key}-02T12:00:00`).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}
function dateLabel(time: number) {
  return new Date(time * 1000).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function journalColumns() {
  if (window.innerWidth <= 700) return 2;
  if (window.innerWidth <= 1050) return 3;
  return 4;
}
