/**
 * alai_telephonystate.js  v3
 * D365 Contact Center — Agent Telephony State Interceptor
 *
 * v3: Writes directly to Dataverse via Xrm.WebApi.createRecord (no flow needed).
 *     Traverses ALL same-origin frames from window.top to find the hold button.
 *
 * State picklist values:
 *   100000000 = Idle
 *   100000001 = Talking
 *   100000002 = On Hold
 *   100000003 = ACW
 */

(function (namespace) {
    "use strict";

    const TABLE = "alai_agenttelephonystate";

    const STATE = {
        IDLE:    100000000,
        TALKING: 100000001,
        ON_HOLD: 100000002,
        ACW:     100000003,
    };

    let _currentState  = STATE.IDLE;
    let _conversationId = null;
    let _agentSystemUserId = null;
    let _agentName = null;
    let _holdButtonEl = null;
    let _pollInterval = null;

    // ── Agent identity ────────────────────────────────────────────────────────
    function resolveAgent() {
        try {
            const ctx = Xrm.Utility.getGlobalContext();
            _agentSystemUserId = (ctx.getUserId() || "").replace(/[{}]/g, "");
            _agentName = ctx.getUserName ? ctx.getUserName() : "Agent";
        } catch (e) {
            console.warn("[AlAI TelState] Could not resolve agent:", e);
        }
    }

    // ── Write state record directly to Dataverse ──────────────────────────────
    function postState(newState) {
        if (newState === _currentState) return; // dedupe
        if (!_agentSystemUserId) resolveAgent();

        const record = {
            alai_agentname:      _agentName || "Agent",
            alai_telephonystate: newState,
            alai_conversationid: _conversationId || "unknown",
            alai_statetimestamp: new Date().toISOString(),
        };

        // Add agentid lookup if we have the GUID
        if (_agentSystemUserId && _agentSystemUserId !== "unknown") {
            record["alai_agentid@odata.bind"] = `/systemusers(${_agentSystemUserId})`;
        }

        console.log("[AlAI TelState] → Writing state", newState, record);

        Xrm.WebApi.createRecord(TABLE, record).then(
            function (result) {
                console.log("[AlAI TelState] ✓ Record created:", result.id, "state:", newState);
            },
            function (error) {
                console.error("[AlAI TelState] ✗ createRecord failed:", error.message);
            }
        );

        _currentState = newState;
    }

    // ── Hold button click ─────────────────────────────────────────────────────
    function onHoldButtonClick() {
        const next = _currentState === STATE.ON_HOLD ? STATE.TALKING : STATE.ON_HOLD;
        console.log("[AlAI TelState] Hold button clicked → state", next);
        postState(next);
    }

    function attachHoldListener(btn) {
        if (_holdButtonEl === btn) return;
        if (_holdButtonEl) _holdButtonEl.removeEventListener("click", onHoldButtonClick);
        _holdButtonEl = btn;
        btn.addEventListener("click", onHoldButtonClick);
        console.log("[AlAI TelState] ✓ Hold button listener attached");
    }

    // ── Search a single document for the hold button ──────────────────────────
    function findHoldButtonInDoc(doc) {
        if (!doc) return null;
        const spans = doc.querySelectorAll("[class*='ms-Button-label']");
        for (const span of spans) {
            const txt = (span.textContent || "").trim();
            if (txt === "Hold" || txt === "Unhold") {
                let el = span;
                while (el && el.tagName !== "BUTTON") el = el.parentElement;
                if (el) return el;
            }
        }
        return doc.querySelector("[aria-label='Hold'], [aria-label='Unhold'], button[title='Hold'], button[title='Unhold']");
    }

    // ── Recursively collect all accessible same-origin frames ─────────────────
    function collectFrames(win, results) {
        results = results || [];
        try {
            results.push(win);
            for (let i = 0; i < win.frames.length; i++) {
                collectFrames(win.frames[i], results);
            }
        } catch (e) { /* cross-origin — skip */ }
        return results;
    }

    function findHoldButtonAnywhere() {
        let root = window;
        try { root = window.top; } catch (e) { /* cross-origin top */ }
        const frames = collectFrames(root);
        for (const frame of frames) {
            try {
                const btn = findHoldButtonInDoc(frame.document);
                if (btn) return btn;
            } catch (e) { /* cross-origin frame — skip */ }
        }
        return null;
    }

    // ── Polling: find hold button & track talking state ───────────────────────
    function pollForHoldButton() {
        const btn = findHoldButtonAnywhere();
        if (btn) {
            attachHoldListener(btn);
            if (_currentState === STATE.IDLE || _currentState === STATE.ACW) {
                postState(STATE.TALKING);
            }
        } else if (_currentState === STATE.TALKING || _currentState === STATE.ON_HOLD) {
            // Button gone — call ended, go to ACW
            console.log("[AlAI TelState] Hold button gone → ACW");
            postState(STATE.ACW);
            _holdButtonEl = null;
        }
    }

    // ── postMessage backup listener ───────────────────────────────────────────
    function hookPostMessages() {
        window.addEventListener("message", function (event) {
            try {
                const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
                if (!data) return;
                const str = JSON.stringify(data).toLowerCase();
                if (str.includes("hold") || str.includes("callstate")) {
                    console.log("[AlAI TelState] postMessage (hold-related):", data);
                }
                const eventName = (data.eventName || data.type || data.name || "").toLowerCase();
                if (eventName.includes("hold") || str.includes('"hold":true') || str.includes('"ishold":true')) {
                    postState(STATE.ON_HOLD);
                } else if (eventName.includes("resume") || eventName.includes("unhold") || str.includes('"hold":false')) {
                    postState(STATE.TALKING);
                }
            } catch (e) { /* non-JSON — ignore */ }
        });
    }

    // ── OC SDK lifecycle hooks ─────────────────────────────────────────────────
    function hookOmnichannelEvents() {
        try {
            if (!window.Microsoft || !Microsoft.Omnichannel) return;
            Microsoft.Omnichannel.onConversationLoaded && Microsoft.Omnichannel.onConversationLoaded(function (ctx) {
                _conversationId = ctx.liveWorkItemId || ctx.conversationId || "unknown";
                postState(STATE.TALKING);
            });
            Microsoft.Omnichannel.onConversationClosed && Microsoft.Omnichannel.onConversationClosed(function () {
                postState(STATE.ACW);
            });
            Microsoft.Omnichannel.onConversationCompleted && Microsoft.Omnichannel.onConversationCompleted(function () {
                postState(STATE.IDLE);
            });
            console.log("[AlAI TelState] OC SDK hooks registered");
        } catch (e) {
            console.warn("[AlAI TelState] OC SDK hook failed:", e);
        }
    }

    // ── Manual override ───────────────────────────────────────────────────────
    namespace.setStateManual = function (stateName) {
        const map = { idle: STATE.IDLE, talking: STATE.TALKING, hold: STATE.ON_HOLD, acw: STATE.ACW };
        const s = map[(stateName || "").toLowerCase()];
        if (s !== undefined) { _currentState = s - 1; postState(s); }
        else console.warn("[AlAI TelState] Unknown state. Use: idle, talking, hold, acw");
    };

    // ── Entry point ───────────────────────────────────────────────────────────
    namespace.init = function () {
        resolveAgent();
        hookOmnichannelEvents();
        hookPostMessages();
        _pollInterval = setInterval(pollForHoldButton, 2000);
        setTimeout(pollForHoldButton, 500);
        console.log("[AlAI TelState] v3 initialized. Agent:", _agentName, _agentSystemUserId);
        console.log("[AlAI TelState] Manual test: AlAI_TelephonyState.setStateManual('hold')");
    };

})(window.AlAI_TelephonyState = window.AlAI_TelephonyState || {});

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", AlAI_TelephonyState.init);
} else {
    AlAI_TelephonyState.init();
}
