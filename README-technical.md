# Agent Telephony State Dashboard

Real-time agent telephony state tracking for **Dynamics 365 Contact Center**. Surfaces granular sub-states (Idle / Talking / On Hold / ACW) in a live supervisor dashboard embedded in Customer Service workspace (CCW) navigation. Zero external infrastructure — JS web resource + Dataverse table + HTML dashboard, all native to D365.

## What's Included

1. **JS Web Resource** (`webresource/alai_telephonystate.js`) — Polls for telephony sub-state across CCW iframes, writes to Dataverse via `Xrm.WebApi`. Must be added manually to the Active Conversation form as a Form Library after import.
2. **Dataverse Table** (`alai_AgentTelephonyState`) — Stores agent name, state (Idle / Talking / On Hold / ACW), and timestamp. Included in solution, auto-created on import.
3. **Supervisor Dashboard** (`webresource/alai_supervisor_dashboard.html`) — Self-contained HTML web resource. Auto-refreshes every 5s. Embedded in CCW nav sidebar as "Agent State Dashboard" tab.

## Prerequisites

- D365 Contact Center environment with Customer Service workspace (CCW) enabled
- System Customizer role or greater in the target environment

## Quick Start

1. Import the solution zip (`AlAIAgentTelephonyState_1_0_0_0.zip`) via [make.powerapps.com](https://make.powerapps.com) > Solutions > Import solution
2. Open the Active Conversation form in D365 > Form Libraries > add `alai_telephonystate.js` as a Form Library
3. Publish all customizations
4. Add the dashboard to the CCW navigation:
   - Go to make.powerapps.com → **Apps** → find **Customer Service workspace** → **⋯** → **Edit**
   - In the app designer, click **Navigation** → select a group → **Add** → **Subarea**
   - Set **Content type** = Web resource, **Web resource** = `alai_/html/supervisor_dashboard.html`, **Title** = `Agent State Dashboard`
   - **Save** and **Publish**
5. Refresh CCW — the **Agent State Dashboard** tab will now appear in the nav sidebar

> **Note:** The dashboard does not appear automatically after import. The CCW app sitemap is owned by Microsoft and cannot be modified inside a solution package — the nav entry must be added manually via the app designer as described in step 4.

## Note

The Active Conversation form injection (step 2) must be done manually after import. The managed OC form is owned by Microsoft and cannot be modified inside a solution package. Everything else — the Dataverse table, supervisor dashboard web resource, and optional Flow — imports cleanly with no extra steps.

---

*Built with Clawpilot (GitHub Copilot CLI) by Al Macey | May 2026*
