const DEFAULT_BASE_URL = "http://localhost:3000";
const STORAGE_KEY = "ccDashboardBaseUrl";

const elements = {
  statusText: document.querySelector("#statusText"),
  baseUrl: document.querySelector("#baseUrl"),
  saveUrl: document.querySelector("#saveUrl"),
  totalTokens: document.querySelector("#totalTokens"),
  sessions: document.querySelector("#sessions"),
  activeSessions: document.querySelector("#activeSessions"),
  topModel: document.querySelector("#topModel"),
  usageSource: document.querySelector("#usageSource"),
  usageRows: document.querySelector("#usageRows"),
  activeList: document.querySelector("#activeList"),
  syncNow: document.querySelector("#syncNow"),
  syncStatus: document.querySelector("#syncStatus"),
  openDashboard: document.querySelector("#openDashboard")
};

function formatTokens(value) {
  if (!Number.isFinite(value)) {
    return "-";
  }
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(2)}M`;
  }
  if (value >= 1_000) {
    return `${Math.round(value / 1_000)}k`;
  }
  return value.toLocaleString();
}

function setText(element, value) {
  element.textContent = String(value ?? "-");
}

function normalizeBaseUrl(value) {
  return (value || DEFAULT_BASE_URL).replace(/\/+$/, "");
}

function storageGet(key) {
  return new Promise((resolve) => {
    chrome.storage.local.get([key], (result) => resolve(result[key]));
  });
}

function storageSet(key, value) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [key]: value }, resolve);
  });
}

function apiUrl(path) {
  return `${normalizeBaseUrl(elements.baseUrl.value)}${path}`;
}

async function fetchJson(path, options = {}) {
  const headers = {
    Accept: "application/json",
    "X-Requested-With": "cc-dashboard",
    ...(options.headers ?? {})
  };
  const response = await fetch(apiUrl(path), {
    ...options,
    headers
  });
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
  return response.json();
}

function renderUsage(data) {
  elements.usageRows.replaceChildren();
  const rows = [data.currentSession, ...data.weekly.filter((row) => ["weekly-all", "weekly-sonnet"].includes(row.id))];
  for (const row of rows) {
    const wrapper = document.createElement("div");
    wrapper.className = "row";

    const title = document.createElement("div");
    title.className = "row-title";

    const label = document.createElement("span");
    label.textContent = row.label;
    const value = document.createElement("span");
    value.textContent = row.valueLabel ?? `${row.percentage}%`;

    title.append(label, value);

    const meta = document.createElement("p");
    meta.className = "usage-meta";
    meta.textContent = row.resetLabel ?? row.description;

    const bar = document.createElement("div");
    bar.className = "usage-bar";
    const fill = document.createElement("span");
    fill.style.setProperty("--value", `${Math.max(0, Math.min(100, row.percentage))}%`);
    bar.append(fill);

    wrapper.append(title, meta, bar);
    elements.usageRows.append(wrapper);
  }
}

function renderActiveSessions(activeSessions) {
  elements.activeList.replaceChildren();
  if (activeSessions.length === 0) {
    const empty = document.createElement("p");
    empty.className = "muted";
    empty.textContent = "No active sessions detected.";
    elements.activeList.append(empty);
    return;
  }

  for (const session of activeSessions.slice(0, 5)) {
    const wrapper = document.createElement("div");
    wrapper.className = "row";

    const title = document.createElement("div");
    title.className = "row-title";

    const name = document.createElement("span");
    name.textContent = session.name ?? session.id;
    const status = document.createElement("span");
    status.textContent = session.status ?? "active";

    title.append(name, status);

    const cwd = document.createElement("p");
    cwd.className = "usage-meta";
    cwd.textContent = session.cwd ?? "Working directory unavailable";

    wrapper.append(title, cwd);
    elements.activeList.append(wrapper);
  }
}

async function refresh() {
  const baseUrl = normalizeBaseUrl(elements.baseUrl.value);
  elements.openDashboard.href = baseUrl;
  elements.statusText.classList.remove("error");
  setText(elements.statusText, "Refreshing local service...");

  try {
    const [health, overview, usage, active] = await Promise.all([
      fetchJson("/api/health"),
      fetchJson("/api/stats/overview"),
      fetchJson("/api/usage-limits"),
      fetchJson("/api/active-sessions")
    ]);

    setText(elements.statusText, `Online, version ${health.version}`);
    setText(elements.totalTokens, formatTokens(overview.totalTokens));
    setText(elements.sessions, overview.sessions.toLocaleString());
    setText(elements.activeSessions, active.activeSessions.length.toLocaleString());
    setText(elements.topModel, overview.mostUsedModel ?? "unknown");
    setText(elements.usageSource, usage.source === "official" ? "Official" : "Local estimate");
    renderUsage(usage);
    renderActiveSessions(active.activeSessions);
    setText(elements.syncStatus, `Last updated ${new Date().toLocaleTimeString()}`);
  } catch (error) {
    elements.statusText.classList.add("error");
    setText(elements.statusText, error instanceof Error ? error.message : "Unable to reach local service.");
  }
}

elements.saveUrl.addEventListener("click", async () => {
  const baseUrl = normalizeBaseUrl(elements.baseUrl.value);
  elements.baseUrl.value = baseUrl;
  await storageSet(STORAGE_KEY, baseUrl);
  await refresh();
});

elements.syncNow.addEventListener("click", async () => {
  elements.syncNow.disabled = true;
  setText(elements.syncStatus, "Syncing...");
  try {
    const result = await fetchJson("/api/sync", { method: "POST" });
    setText(elements.syncStatus, `Indexed ${result.status.indexedFiles} files, skipped ${result.status.skippedFiles}.`);
    await refresh();
  } catch (error) {
    setText(elements.syncStatus, error instanceof Error ? error.message : "Sync failed.");
  } finally {
    elements.syncNow.disabled = false;
  }
});

document.addEventListener("DOMContentLoaded", async () => {
  const storedBaseUrl = await storageGet(STORAGE_KEY);
  elements.baseUrl.value = normalizeBaseUrl(storedBaseUrl);
  await refresh();
  window.setInterval(refresh, 60_000);
});
