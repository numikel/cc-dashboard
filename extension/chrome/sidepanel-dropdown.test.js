import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDropdown } from "./sidepanel-utils.js";

function setupDom() {
  document.body.innerHTML = `
    <button id="trigger" aria-expanded="false" aria-controls="panel">Settings</button>
    <div id="panel" hidden>
      <input id="inside" />
    </div>
    <button id="outside">Outside</button>
  `;
  return {
    trigger: document.getElementById("trigger"),
    panel: document.getElementById("panel"),
    inside: document.getElementById("inside"),
    outside: document.getElementById("outside")
  };
}

describe("createDropdown", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("toggle() flips aria-expanded on trigger and hidden on panel", () => {
    const { trigger, panel } = setupDom();
    const dd = createDropdown({ trigger, panel });

    expect(dd.isOpen()).toBe(false);
    expect(panel.hidden).toBe(true);
    expect(trigger.getAttribute("aria-expanded")).toBe("false");

    dd.toggle();
    expect(dd.isOpen()).toBe(true);
    expect(panel.hidden).toBe(false);
    expect(trigger.getAttribute("aria-expanded")).toBe("true");

    dd.toggle();
    expect(dd.isOpen()).toBe(false);
    expect(panel.hidden).toBe(true);
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
  });

  it("ESC keydown while open closes the panel and returns focus to the trigger", () => {
    const { trigger, panel } = setupDom();
    const dd = createDropdown({ trigger, panel });

    dd.open();
    expect(dd.isOpen()).toBe(true);

    const focusSpy = vi.spyOn(trigger, "focus");
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));

    expect(dd.isOpen()).toBe(false);
    expect(panel.hidden).toBe(true);
    expect(focusSpy).toHaveBeenCalledOnce();
  });

  it("mousedown outside the panel and trigger closes the panel", () => {
    const { trigger, panel, outside } = setupDom();
    const dd = createDropdown({ trigger, panel });

    dd.open();
    outside.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));

    expect(dd.isOpen()).toBe(false);
    expect(panel.hidden).toBe(true);
  });

  it("mousedown inside the panel keeps the panel open", () => {
    const { trigger, panel, inside } = setupDom();
    const dd = createDropdown({ trigger, panel });

    dd.open();
    inside.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));

    expect(dd.isOpen()).toBe(true);
    expect(panel.hidden).toBe(false);
  });

  it("close() while already closed is a safe no-op", () => {
    const { trigger, panel } = setupDom();
    const onClose = vi.fn();
    const dd = createDropdown({ trigger, panel, onClose });

    expect(() => {
      dd.close();
      dd.close();
    }).not.toThrow();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("onClose callback fires exactly once per close path", () => {
    const { trigger, panel } = setupDom();
    const onClose = vi.fn();
    const dd = createDropdown({ trigger, panel, onClose });

    dd.open();
    dd.close();
    expect(onClose).toHaveBeenCalledTimes(1);

    dd.open();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
