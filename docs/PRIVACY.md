# Privacy policy

> Source: [jojopen.com/privacy](https://jojopen.com/privacy)
> Last updated: 10 November 2026

JojoPen is a drawing app for diagrams, boards and slide decks. You can use it without an account: boards then stay in your browser and never reach our servers. This page explains what changes when you sign in, save boards to the cloud or connect an AI app.

---

## What we collect

| Data | Why |
| :--- | :--- |
| **From Google sign-in:** your Google account id, email address, name and profile picture link | To create your account and show who is signed in. We ask Google only for basic profile and email (`openid email profile`), nothing else in your Google account. |
| **The username you choose** | It forms your board links (`jojopen.com/<username>/…`) and your public profile page. |
| **Boards you save to the cloud:** their content, titles, collections and visibility | To store them, sync them between your devices and share them when you choose to. |
| **A sign-in cookie (`jp_session`)** | To keep you signed in for up to 30 days. We store only a hash of it. |
| **Connections from AI apps (MCP)** | When you approve an AI app such as Claude, Codex or Cursor, we keep the app's name and an access token so it can act on your boards with the permissions you granted. |
| **Error reports** | When the app crashes, your browser sends us the error message, the page address, the app version, your browser type and your account id if signed in. Never board content. |
| **Server logs** | Our host records requests (address, time, IP address, browser) for security and debugging. They are kept for a short time. |

We do not use advertising, tracking pixels or third-party analytics, and we do not sell or rent your data.

---

## What stays on your device

- **Boards you don't save to the cloud** live only in your browser's storage.
- **Your own AI keys** (Anthropic, OpenAI, Google or other providers) for the in-app assistant are kept in your browser, and requests go straight from your browser to that provider. JojoPen never receives them. What you send to that provider is covered by their privacy policy.

---

## Who can see your boards

- **Private** (the default): only you, and AI apps you have connected.
- **Unlisted**: anyone with the link.
- **Public**: anyone, and it appears on your profile page.

Your username, name and profile picture are shown on your profile page and on boards you share.

---

## Where it is kept

JojoPen runs on Cloudflare. Accounts and cloud boards are stored in a Postgres database hosted by Neon. A compressed backup of accounts and boards is made each night and kept in Cloudflare storage for 30 days, so we can recover from mistakes or outages. Sign-in tokens are not included in backups. These providers process data only to run JojoPen for us, and your data may be processed in countries other than your own.

---

## How long we keep it

- Boards are kept until you delete them. A deleted board disappears from backups within 30 days.
- Your account is kept until you ask us to delete it. We then delete your account, collections and boards; backups that contain them expire within 30 days.
- Sign-in sessions expire after 30 days.

---

## Your choices and rights

- Delete any board from the app, or ask your AI app to.
- Make any board private again at any time.
- Download any board as a `.jojo` file, PNG, SVG or PDF.
- Disconnect an AI app by removing it in that app, or ask us to revoke its access.
- Ask us for a copy of your data, to correct it, or to delete your account, by emailing [privacy@jojopen.com](mailto:privacy@jojopen.com).
- You can also revoke JojoPen's access to your Google account at [myaccount.google.com/permissions](https://myaccount.google.com/permissions).

---

## Google user data

JojoPen's use of information received from Google APIs adheres to the [Google API Services User Data Policy](https://developers.google.com/terms/api-services-user-data-policy), including the Limited Use requirements. We use your Google profile and email only to sign you in and run your account, never for advertising, and we don't transfer them to anyone except as needed to run JojoPen or when required by law.

---

## Children

JojoPen is not meant for children under 13, and we don't knowingly collect data from them.

---

## Changes

If we change this policy, we'll update the date above. For significant changes we'll tell signed-in users in the app.

---

## Contact

Questions or requests: [privacy@jojopen.com](mailto:privacy@jojopen.com).
