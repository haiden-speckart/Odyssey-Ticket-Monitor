const THEATER_ID  = "1329";
const MOVIE_TITLE = "odyssey";
const NTFY_TOPIC_VAR = "NTFY_TOPIC";
const BUY_URL     = "https://www.regmovies.com/movies/the-odyssey";


function getCheckDates() {
  const dates = [];
  const today = new Date();
  for (let i = 0; i < 45; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    dates.push(d.toISOString().split("T")[0]);
  }
  return dates;
}

async function checkRegal() {
  const found = [];
  for (const date of getCheckDates()) {
    try {
      const url = `https://www.regmovies.com/api/getShowtimes?theatres=${THEATER_ID}&date=${date}&hoCode=&ignoreCache=false&moviesOnly=false`;
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Linux; Android 15; SM-S931B) AppleWebKit/537.36 Chrome/124 Mobile Safari/537.36",
          "Accept":     "application/json, */*",
          "Referer":    "https://www.regmovies.com/",
          "Origin":     "https://www.regmovies.com",
        },
        cf: { cacheTtl: 0 }
      });

      console.log(`${date} → HTTP ${res.status}`);
      if (!res.ok) continue;

      const text = await res.text();
      console.log(`${date} RAW: ${text.slice(0, 300)}`);

      let data;
      try { data = JSON.parse(text); } catch { continue; }

      const films = data?.shows?.[0]?.Film || data?.Film || data?.shows || [];
      for (const film of Array.isArray(films) ? films : []) {
        const title = (film?.Title || film?.title || "").toLowerCase();
        if (title.includes(MOVIE_TITLE)) {
          found.push({ date, title: film.Title || "The Odyssey" });
        }
      }
    } catch (e) {
      console.log(`${date} error: ${e.message}`);
    }
  }
  return found;
}

async function sendAlert(topic, findings) {
  const dates = findings.map(f => f.date).join(", ");
  await fetch(`https://ntfy.sh/${topic}`, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain",
      "Title":    "🎬 ODYSSEY TICKETS LIVE — BUY NOW",
      "Priority": "urgent",
      "Tags":     "rotating_light,movie_camera",
      "Click":    BUY_URL,
      "Actions":  `view, Buy Tickets, ${BUY_URL}, clear=true`,
    },
    body: `Regal UA King of Prussia · 300 Goddard Blvd\nDates: ${dates}\nBuy now before they sell out!`,
  });
}

async function sendTest(topic) {
  await fetch(`https://ntfy.sh/${topic}`, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain",
      "Title":    "✅ Odyssey Monitor — Working",
      "Priority": "default",
      "Tags":     "white_check_mark",
    },
    body: "Monitor is live. Checking July 14–22 window every 5 min. You'll be alerted the instant tickets appear.",
  });
}

async function run(env) {
  const topic = env.NTFY_TOPIC;
  if (!topic) { console.log("NTFY_TOPIC not set"); return; }

  const already = await env.STATE.get("notified").catch(() => null);
  if (already) { console.log("Already notified. Visit ?reset=1 to re-arm."); return; }

  console.log("Checking Regal API for The Odyssey...");
  const findings = await checkRegal();

  if (findings.length > 0) {
    console.log(`FOUND: ${JSON.stringify(findings)}`);
    await sendAlert(topic, findings);
    await env.STATE.put("notified", new Date().toISOString(), { expirationTtl: 604800 });
  } else {
    console.log("Not found yet. Will check again on next cron.");
  }
}

export default {
  async scheduled(event, env, ctx) { ctx.waitUntil(run(env)); },
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.searchParams.get("test") === "1") {
      await sendTest(env.NTFY_TOPIC);
      return new Response("Test sent!", { status: 200 });
    }
    if (url.searchParams.get("reset") === "1") {
      await env.STATE.delete("notified");
      return new Response("Reset done.", { status: 200 });
    }
    ctx.waitUntil(run(env));
    return new Response("Manual check triggered.", { status: 200 });
  }
};