# Agent Telephony State Dashboard

See exactly what your agents are doing on the phone — in real time.

<img width="2055" height="997" alt="image" src="https://github.com/user-attachments/assets/69ad380c-91fc-4829-bd8b-548febb52dd4" />


This solution adds a live dashboard to your Dynamics 365 Contact Center that shows each agent's current phone state: **Idle**, **Talking**, **On Hold**, or **After Call Work (ACW)**. Supervisors see it in a new tab directly inside Customer Service workspace — no extra tools, no separate screens.

## What You Get

- **Live supervisor dashboard** — refreshes every 5 seconds, shows all agents and their current state
- **Agent state tracking** — stored in Dataverse, visible immediately after import
- Everything runs natively inside D365 — nothing to install on agent machines

## Requirements

- Dynamics 365 Contact Center with Customer Service workspace enabled
- System Customizer role (or higher) in your environment

## Install

### Step 1 — Import the solution
1. Go to [make.powerapps.com](https://make.powerapps.com) and select your environment
2. Click **Solutions** in the left menu → **Import solution**
3. Upload `AlAIAgentTelephonyState_1_0_0_0.zip` from the [Releases](../../releases) page and follow the wizard
4. Choose **Unmanaged** when asked

### Step 2 — Add the tracking script to the Active Conversation form
1. In your environment, go to **Settings → Customizations → Customize the System**
2. Navigate to **Entities → Conversation → Forms → Active Conversation**
3. Open **Form Libraries** → click **Add Library** → select `alai_telephonystate.js`
4. Save and click **Publish All Customizations**

### Step 3 — You're done
Refresh Customer Service workspace. A new **Agent State Dashboard** tab will appear in the left navigation sidebar.

---

> For technical details, architecture notes, and developer documentation see [README-technical.md](README-technical.md).

---
*Built by Al Macey · May 2026*
