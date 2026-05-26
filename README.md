# 🎬 Odyssey Automated Ticket Monitor

An automated, serverless ticket-scraping bot designed to track movie showtimes for **"The Odyssey"** at a specific Regal Cinemas theater over a rolling 45-day window. 

Built as a **Cloudflare Worker**, this script polls Regal's internal APIs, handles anti-caching, uses KV storage to prevent alert spam, and dispatches instant push notifications via **ntfy.sh** the millisecond tickets go live.

---

## ✨ Features

* **Rolling 45-Day Scan:** Dynamically calculates and checks availability from today up to 45 days into the future.
* **Anti-Cache & Header Spoofing:** Bypasses basic bot protection and edge caching by injecting real-world mobile User-Agents and setting `cacheTtl: 0`.
* **Smart Payload Traversal:** Robust JSON parsing that safely handles multiple structural variations in Regal's API response schemas.
* **Spam Prevention (State Locking):** Utilizes Cloudflare KV storage to log a `notified` state, ensuring you only receive one urgent alert instead of continuous notifications. The lock automatically self-clears after 7 days.
* **Dual Execution Modes:** * **Cron Trigger:** Runs silently in the background at regular intervals.
  * **HTTP Endpoints:** Supports manual overrides, test alerts, and state resets via specific URL queries.

---

## 🛠️ How It Works

1. **The Schedule:** Cloudflare Workers triggers the script via a Cron schedule (e.g., every 5 minutes).
2. **The Lock Check:** The script checks KV storage. If you've already been alerted, it halts to protect your inbox.
3. **The API Poll:** It concurrently queries Regal's API for the next 45 days looking for the keyword `"odyssey"`.
4. **The Alert:** If found, an urgent push notification with a direct **"Buy Tickets"** action button is routed to your devices via `ntfy.sh`.

---

## 🚀 Deployment & Setup

### 1. Prerequisites
* A [Cloudflare Tools](https://dash.cloudflare.com/) account.
* The [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/) installed and authenticated (`npx wrangler login`).
* The **ntfy** app installed on your phone/desktop (or open in-browser) subscribed to a private topic.

### 2. Wrangler Configuration (`wrangler.toml`)
Ensure your configuration file contains a KV namespace binding named `STATE`:

```toml
name = "odyssey-ticket-monitor"
main = "src/index.js"
compatibility_date = "2024-01-01"

[triggers]
crons = [ "*/5 * * * *" ] # Runs every 5 minutes

[[kv_namespaces]]
binding = "STATE"
id = "your_cloudflare_kv_namespace_id_here"