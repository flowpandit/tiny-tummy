import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import "./test-dom.ts";
import { DatabaseProvider, type DbClient } from "../src/contexts/DatabaseContext.tsx";
import { useLoggingSheetLifecycle } from "../src/hooks/useLoggingSheetLifecycle.ts";
import { usePhotoField } from "../src/hooks/usePhotoField.ts";
import { useVisibilityRefresh } from "../src/hooks/useVisibilityRefresh.ts";
import { useChildWorkflowActions } from "../src/hooks/useChildWorkflowActions.ts";
import { useSleepLogSheetState } from "../src/hooks/useSleepLogSheetState.ts";
import type { Child } from "../src/lib/types.ts";

afterEach(() => {
  cleanup();
});

const child: Child = {
  id: "child-1",
  name: "Mila",
  date_of_birth: "2026-01-01",
  sex: "female",
  feeding_type: "mixed",
  avatar_color: "#f6b26b",
  is_active: 1,
  created_at: "2026-04-14T00:00:00",
  updated_at: "2026-04-14T00:00:00",
};

test("useLoggingSheetLifecycle closes immediately and schedules a reset", () => {
  const originalSetTimeout = window.setTimeout;
  const originalClearTimeout = window.clearTimeout;
  const scheduled: Array<() => void> = [];
  const cleared: number[] = [];

  window.setTimeout = ((callback: TimerHandler) => {
    scheduled.push(callback as () => void);
    return scheduled.length;
  }) as typeof window.setTimeout;

  window.clearTimeout = ((id?: number) => {
    if (typeof id === "number") {
      cleared.push(id);
    }
  }) as typeof window.clearTimeout;

  try {
    const calls: string[] = [];
    const { result, unmount } = renderHook(() => useLoggingSheetLifecycle({
      onClose: () => {
        calls.push("close");
      },
      onReset: () => {
        calls.push("reset");
      },
      onLogged: async () => {
        calls.push("logged");
      },
    }));

    act(() => {
      result.current.handleClose();
    });

    assert.deepEqual(calls, ["close"]);
    assert.equal(scheduled.length, 1);

    scheduled[0]?.();
    assert.deepEqual(calls, ["close", "reset"]);
    assert.deepEqual(cleared, []);

    unmount();
  } finally {
    window.setTimeout = originalSetTimeout;
    window.clearTimeout = originalClearTimeout;
  }
});

test("useLoggingSheetLifecycle runs logged success flow and clears pending timers on unmount", async () => {
  const originalSetTimeout = window.setTimeout;
  const originalClearTimeout = window.clearTimeout;
  const scheduled: Array<() => void | Promise<void>> = [];
  const cleared: number[] = [];

  window.setTimeout = ((callback: TimerHandler) => {
    scheduled.push(callback as () => void);
    return scheduled.length;
  }) as typeof window.setTimeout;

  window.clearTimeout = ((id?: number) => {
    if (typeof id === "number") {
      cleared.push(id);
    }
  }) as typeof window.clearTimeout;

  try {
    const calls: string[] = [];
    const { result, unmount } = renderHook(() => useLoggingSheetLifecycle({
      onClose: () => {
        calls.push("close");
      },
      onReset: () => {
        calls.push("reset");
      },
      onLogged: async () => {
        calls.push("logged");
      },
      successDelayMs: 1200,
      resetDelayMs: 300,
    }));

    act(() => {
      result.current.handleLoggedSuccess();
    });

    assert.equal(scheduled.length, 1);
    await scheduled[0]?.();
    assert.deepEqual(calls, ["logged", "close"]);
    assert.equal(scheduled.length, 2);

    scheduled[1]?.();
    assert.deepEqual(calls, ["logged", "close", "reset"]);

    act(() => {
      result.current.handleClose();
    });
    assert.equal(scheduled.length, 3);

    unmount();
    assert.deepEqual(cleared, [3]);
  } finally {
    window.setTimeout = originalSetTimeout;
    window.clearTimeout = originalClearTimeout;
  }
});

test("usePhotoField creates previews, revokes old previews, and resets the input", async () => {
  const originalUrl = globalThis.URL;
  const file = new File(["image-bytes"], "photo.jpg", { type: "image/jpeg" });
  const revoked: string[] = [];
  let nextId = 0;

  globalThis.URL = {
    ...originalUrl,
    createObjectURL: () => `blob:preview-${++nextId}`,
    revokeObjectURL: (value: string | URL) => {
      revoked.push(String(value));
    },
  } as typeof URL;

  try {
    const { result, unmount } = renderHook(() => usePhotoField());
    const input = document.createElement("input");
    result.current.fileInputRef.current = input;

    await act(async () => {
      result.current.setPhotoFromChange({
        target: { files: [file] },
      } as React.ChangeEvent<HTMLInputElement>);
    });

    await waitFor(() => {
      assert.equal(result.current.photoFile?.name, "photo.jpg");
      assert.equal(result.current.photoPreview, "blob:preview-1");
    });

    await act(async () => {
      result.current.setPhotoFromChange({
        target: { files: [file] },
      } as React.ChangeEvent<HTMLInputElement>);
    });

    await waitFor(() => {
      assert.equal(result.current.photoPreview, "blob:preview-2");
      assert.deepEqual(revoked, ["blob:preview-1", "blob:preview-1"]);
    });

    act(() => {
      result.current.resetPhoto();
    });

    await waitFor(() => {
      assert.equal(result.current.photoFile, null);
      assert.equal(result.current.photoPreview, null);
      assert.equal(input.value, "");
      assert.deepEqual(revoked, ["blob:preview-1", "blob:preview-1", "blob:preview-2", "blob:preview-2"]);
    });

    unmount();
  } finally {
    globalThis.URL = originalUrl;
  }
});

test("usePhotoField revokes the active preview on unmount", async () => {
  const originalUrl = globalThis.URL;
  const file = new File(["image-bytes"], "photo.jpg", { type: "image/jpeg" });
  const revoked: string[] = [];

  globalThis.URL = {
    ...originalUrl,
    createObjectURL: () => "blob:active-preview",
    revokeObjectURL: (value: string | URL) => {
      revoked.push(String(value));
    },
  } as typeof URL;

  try {
    const { result, unmount } = renderHook(() => usePhotoField());

    await act(async () => {
      result.current.setPhotoFromChange({
        target: { files: [file] },
      } as React.ChangeEvent<HTMLInputElement>);
    });

    await waitFor(() => {
      assert.equal(result.current.photoPreview, "blob:active-preview");
    });

    unmount();
    assert.deepEqual(revoked, ["blob:active-preview"]);
  } finally {
    globalThis.URL = originalUrl;
  }
});

test("useVisibilityRefresh subscribes to focus and visibility events and cleans up on unmount", async () => {
  const calls: string[] = [];
  const addWindowListener = window.addEventListener.bind(window);
  const addDocumentListener = document.addEventListener.bind(document);
  const removeWindowListener = window.removeEventListener.bind(window);
  const removeDocumentListener = document.removeEventListener.bind(document);
  const windowListeners = new Map<string, EventListener>();
  const documentListeners = new Map<string, EventListener>();

  window.addEventListener = ((type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions) => {
    windowListeners.set(type, listener as EventListener);
    addWindowListener(type, listener, options);
  }) as typeof window.addEventListener;

  document.addEventListener = ((type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions) => {
    documentListeners.set(type, listener as EventListener);
    addDocumentListener(type, listener, options);
  }) as typeof document.addEventListener;

  window.removeEventListener = ((type: string, listener: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions) => {
    windowListeners.delete(type);
    removeWindowListener(type, listener, options);
  }) as typeof window.removeEventListener;

  document.removeEventListener = ((type: string, listener: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions) => {
    documentListeners.delete(type);
    removeDocumentListener(type, listener, options);
  }) as typeof document.removeEventListener;

  try {
    const { unmount } = renderHook(() => useVisibilityRefresh(async () => {
      calls.push("refresh");
    }));

    assert.equal(typeof windowListeners.get("focus"), "function");
    assert.equal(typeof documentListeners.get("visibilitychange"), "function");

    await act(async () => {
      window.dispatchEvent(new Event("focus"));
      document.dispatchEvent(new Event("visibilitychange"));
    });

    await waitFor(() => {
      assert.deepEqual(calls, ["refresh", "refresh"]);
    });

    unmount();
    assert.equal(windowListeners.size, 0);
    assert.equal(documentListeners.size, 0);
  } finally {
    window.addEventListener = addWindowListener;
    document.addEventListener = addDocumentListener;
    window.removeEventListener = removeWindowListener;
    document.removeEventListener = removeDocumentListener;
  }
});

test("useSleepLogSheetState blocks future manual sleep logs", async () => {
  const createSleepLogCalls: Array<Record<string, unknown>> = [];
  const errors: string[] = [];
  const success: string[] = [];
  const dbClient = {
    getSetting: async () => "",
    setSetting: async () => {},
    createSleepLog: async (input: Record<string, unknown>) => {
      createSleepLogCalls.push(input);
    },
  } as unknown as DbClient;
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    React.createElement(DatabaseProvider, { client: dbClient }, children)
  );

  const { result } = renderHook(() => useSleepLogSheetState({
    open: true,
    childId: child.id,
    onLogged: () => {},
    onClose: () => {},
    onError: (message) => {
      errors.push(message);
    },
    onSuccess: (message) => {
      success.push(message);
    },
  }), { wrapper });

  await waitFor(() => {
    assert.equal(result.current.timerSession, null);
  });

  act(() => {
    result.current.setStartDate("2026-04-10");
    result.current.setStartTime("11:00");
    result.current.setEndDate("2026-04-11");
    result.current.setEndTime("11:00");
  });

  const realDateNow = Date.now;
  Date.now = () => new Date("2026-04-10T12:00:00.000Z").getTime();

  try {
    let saved = false;
    await act(async () => {
      saved = await result.current.handleSaveManual();
    });

    assert.equal(saved, false);
    assert.deepEqual(errors, ["Sleep logs cannot be saved in the future."]);
    assert.deepEqual(success, []);
    assert.equal(createSleepLogCalls.length, 0);
  } finally {
    Date.now = realDateNow;
  }
});

test("useVisibilityRefresh does not subscribe when disabled", () => {
  const addWindowListener = window.addEventListener.bind(window);
  const addDocumentListener = document.addEventListener.bind(document);
  const windowListeners = new Map<string, EventListener>();
  const documentListeners = new Map<string, EventListener>();

  window.addEventListener = ((type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions) => {
    windowListeners.set(type, listener as EventListener);
    addWindowListener(type, listener, options);
  }) as typeof window.addEventListener;

  document.addEventListener = ((type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions) => {
    documentListeners.set(type, listener as EventListener);
    addDocumentListener(type, listener, options);
  }) as typeof document.addEventListener;

  try {
    const { unmount } = renderHook(() => useVisibilityRefresh(() => undefined, false));
    assert.equal(windowListeners.size, 0);
    assert.equal(documentListeners.size, 0);
    unmount();
  } finally {
    window.addEventListener = addWindowListener;
    document.addEventListener = addDocumentListener;
  }
});

test("useChildWorkflowActions runs refresh, alert, and reminder steps in order", async () => {
  const originalSetTimeout = globalThis.setTimeout;
  const scheduled: Array<() => void> = [];
  globalThis.setTimeout = ((callback: TimerHandler) => {
    scheduled.push(callback as () => void);
    return scheduled.length as unknown as number;
  }) as typeof globalThis.setTimeout;

  const calls: string[] = [];
  try {
    const { result } = renderHook(() => useChildWorkflowActions(
      child,
      async () => {
        calls.push("refreshAlerts");
      },
      {
        runChecks: async () => {
          calls.push("runChecks");
        },
        syncSmartRemindersForChild: async () => {
          calls.push("syncReminders");
        },
      },
    ));

    await result.current.runPostLogActions({
      refresh: [
        async () => {
          calls.push("refreshA");
        },
        async () => {
          calls.push("refreshB");
        },
      ],
      alerts: true,
      reminders: true,
    });

    assert.deepEqual(calls, [
      "refreshA",
      "refreshB",
      "runChecks",
      "refreshAlerts",
    ]);
    assert.equal(scheduled.length, 1);

    scheduled[0]?.();

    assert.deepEqual(calls, [
      "refreshA",
      "refreshB",
      "runChecks",
      "refreshAlerts",
      "syncReminders",
    ]);
  } finally {
    globalThis.setTimeout = originalSetTimeout;
  }
});

test("useChildWorkflowActions does not schedule reminders when the child is missing", async () => {
  const originalSetTimeout = globalThis.setTimeout;
  const scheduled: Array<() => void> = [];
  globalThis.setTimeout = ((callback: TimerHandler) => {
    scheduled.push(callback as () => void);
    return scheduled.length as unknown as number;
  }) as typeof globalThis.setTimeout;

  const calls: string[] = [];
  try {
    const { result } = renderHook(() => useChildWorkflowActions(
      null,
      async () => {
        calls.push("refreshAlerts");
      },
      {
        runChecks: async () => {
          calls.push("runChecks");
        },
        syncSmartRemindersForChild: async () => {
          calls.push("syncReminders");
        },
      },
    ));

    await result.current.refreshChildAlerts();
    await result.current.syncChildReminders();
    await result.current.runPostLogActions({ alerts: true, reminders: true });

    assert.deepEqual(calls, []);
    assert.equal(scheduled.length, 0);
  } finally {
    globalThis.setTimeout = originalSetTimeout;
  }
});
