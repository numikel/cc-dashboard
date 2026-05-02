export const DEFAULT_BASE_URL = "http://localhost:3000";
export const STORAGE_KEY = "ccDashboardBaseUrl";

const ALLOWED_HOSTS = ["localhost", "127.0.0.1"];

export function formatTokens(value) {
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

export function normalizeBaseUrl(value) {
  return (value || DEFAULT_BASE_URL).replace(/\/+$/, "");
}

export function validateBaseUrl(value) {
  try {
    const u = new URL(value || DEFAULT_BASE_URL);
    if (!ALLOWED_HOSTS.includes(u.hostname)) return null;
    if (u.protocol !== "http:") return null;
    return u.origin;
  } catch {
    return null;
  }
}

export function createDropdown({ trigger, panel, onClose } = {}) {
  if (!trigger || !panel) {
    throw new Error("createDropdown requires { trigger, panel }");
  }

  let open = false;
  let outsideHandler = null;
  let keyHandler = null;

  function setOpen(next) {
    if (next === open) return;
    open = next;
    panel.hidden = !open;
    trigger.setAttribute("aria-expanded", open ? "true" : "false");
    if (open) {
      attachListeners();
    } else {
      detachListeners();
      if (typeof onClose === "function") onClose();
    }
  }

  function attachListeners() {
    outsideHandler = (event) => {
      const target = event.target;
      if (panel.contains(target) || trigger.contains(target)) return;
      setOpen(false);
    };
    keyHandler = (event) => {
      if (event.key === "Escape" && open) {
        setOpen(false);
        if (typeof trigger.focus === "function") trigger.focus();
      }
    };
    document.addEventListener("mousedown", outsideHandler);
    document.addEventListener("keydown", keyHandler);
  }

  function detachListeners() {
    if (outsideHandler) {
      document.removeEventListener("mousedown", outsideHandler);
      outsideHandler = null;
    }
    if (keyHandler) {
      document.removeEventListener("keydown", keyHandler);
      keyHandler = null;
    }
  }

  return {
    open: () => setOpen(true),
    close: () => setOpen(false),
    toggle: () => setOpen(!open),
    isOpen: () => open
  };
}
