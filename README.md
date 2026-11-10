# Gmail Smart CC Assistant (Public Demo)

A Chrome extension that monitors Gmail compose windows and uses configurable staff-to-supervisor email mappings to suggest or attempt to add a supervisor to CC. Includes a diagnostic status panel and a copy-address fallback.

## Privacy and demo data

All email addresses in this repository are **fictional examples** using `example.com`. No actual staff directory or internal reporting relationships are included. This demo will **not** recognise real staff addresses until you configure mappings in your own private copy. Do not publish real employee email mappings without authorisation.

## Features

- Detects Gmail compose windows and recipients using DOM events and `MutationObserver`
- Looks up supervisor addresses from the `GROUPS` mapping in `content.js`
- Attempts to add the matching supervisor to CC
- Shows diagnostic status and provides a manual copy fallback
- Does not send emails

## Install locally

1. Download and extract the ZIP.
2. Open `chrome://extensions` in Google Chrome.
3. Turn on **Developer mode**, choose **Load unpacked**, and select the extracted folder containing `manifest.json`.
4. In extension details, allow site access to `mail.google.com`.
5. Refresh Gmail and open Compose. The status panel should appear.
6. Test with `staff.one@example.com` in **To**; the mapped supervisor is `supervisor.alpha@example.com`. Gmail may reject simulated keyboard events, so **always verify the actual CC chip** before sending and use the copy fallback when needed.

## Technologies

JavaScript, Chrome Extensions, DOM APIs, `MutationObserver`, Clipboard API.

## Notes

This is a Chrome extension, **not** a GitHub Pages website. It runs locally in Chrome after loading it as an unpacked extension. Gmail UI changes may affect its operation.
