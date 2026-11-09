# Security Policy

## No paid bug bounty

This project pays **no rewards** for bug reports. It is a free, open-source
tracker by Rex Tiwari. If you find a bug, reporting it in a GitHub Issue
helps everyone who uses the tracker — that is the reward.

## How to report a security problem

**Do not open a public Issue for a security problem.** Use GitHub's
private vulnerability reporting on this repo instead
(Security tab → "Report a vulnerability"), so the fix can land before
the details are public.

## What counts as a security problem here

- A way to see a room's live locations **without knowing its Room Code**.
- A way to write fake locations into someone else's room.
- A way to read or change the Firebase database outside the published rules.

## What is NOT a security problem

- The Firebase web API key is visible in `firebase-config.js`. That is by
  design — it only identifies the project. The real protection is the
  Realtime Database rules plus the Room Code, and the key is restricted
  to this GitHub Pages site.
- A website cannot keep tracking after the tab is closed. That is a
  browser rule, not a vulnerability. See the README's honest-limits section.

## Please never include in any report

Your Room Code, live location, phone number, Gmail ID or IMEI. The Room
Code is the password for your room — treat it like one.
