# warden.systems -> Vercel — DNS runbook

Goal: `warden.systems` (apex) serves the WARDEN Vercel deployment over HTTPS, with `www`
redirecting to it. Verified against Vercel docs (see sources). **Vercel's Add-Domain screen is
the source of truth** — the CNAME target varies by project; the values below are the current
defaults to sanity-check against.

## Step 0 — buy it
`.systems` is **not** a £9 `.com` — budget **~£20–30/yr**. Cheapest at **Cloudflare Registrar**
(at-cost) or **Porkbun**. Keep the registrar's default nameservers; you'll just add two records.

## Step 1 — add the domain in Vercel
Project `warden` -> **Settings -> Domains** -> add `warden.systems`, then `www.warden.systems`.
Vercel prints the exact records it wants — trust those over anything here.

## Step 2 — add two records at the registrar
| Type | Host | Value | TTL |
|---|---|---|---|
| A | `@` (apex) | `76.76.21.21` | 300 |
| CNAME | `www` | `cname.vercel-dns.com` *(use the exact target Vercel shows — some projects get `cname.vercel-dns-0.com`)* | 300 |

- **Never** put a CNAME on the apex (`@`) — it violates DNS at the zone root; the A record is correct there.
- Low TTL (300s) during setup = fast propagation, quick fixes.

## Step 3 — set canonical
Make `warden.systems` the **primary** in Vercel; let `www` redirect to it, so the signature is the
clean apex.

## Step 4 — verify
DNS propagates in minutes-to-an-hour; Vercel auto-issues the Let's Encrypt cert once it resolves.
Done = `https://warden.systems` loads WARDEN with a valid padlock and `www` redirects to it. Buy
Thu/Fri -> settled over the weekend for the Tuesday send.

## Sources
- Vercel — Set up a custom domain: https://vercel.com/docs/domains/set-up-custom-domain
- Vercel KB — A records: https://vercel.com/kb/guide/a-record-and-caa-with-vercel
