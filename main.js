document.addEventListener("DOMContentLoaded", () => {
  initLiveTicker();
  initLiveSection();
  initSchedule();
  initGroups();
  initHighlights();
});

// ---------------- helpers ----------------

function fillMatchCard(match) {
  const tpl = document.getElementById("match-card-template");
  const node = tpl.content.cloneNode(true);
  const card = node.querySelector(".match-card");

  card.querySelector(".match-group").textContent = `Group ${match.group}`;
  card.querySelector(".match-venue").textContent = `${match.venue.city}`;

  const home = card.querySelector(".team.home");
  home.querySelector(".flag").textContent = match.home.flag;
  home.querySelector(".team-name").textContent = match.home.name;

  const away = card.querySelector(".team.away");
  away.querySelector(".flag").textContent = match.away.flag;
  away.querySelector(".team-name").textContent = match.away.name;

  const scoreEl = card.querySelector(".score-value");
  if (match.status === "upcoming") {
    scoreEl.textContent = "VS";
  } else {
    scoreEl.textContent = `${match.home_score} – ${match.away_score}`;
  }

  const statusEl = card.querySelector(".match-status");
  const timeEl = card.querySelector(".match-time");
  if (match.status === "live") {
    statusEl.textContent = `● LIVE ${match.minute}'`;
    statusEl.classList.add("is-live");
  } else if (match.status === "finished") {
    statusEl.textContent = "Full time";
    statusEl.classList.add("is-finished");
  } else {
    statusEl.textContent = "Upcoming";
    statusEl.classList.add("is-upcoming");
  }
  timeEl.textContent = `${match.date} · ${match.kickoff}`;

  return node;
}

function fillHighlightCard(h) {
  const tpl = document.getElementById("highlight-card-template");
  const node = tpl.content.cloneNode(true);
  node.querySelector(".highlight-duration").textContent = h.duration;
  node.querySelector(".highlight-category").textContent = h.category;
  node.querySelector(".highlight-title").textContent = h.title;
  node.querySelector(".highlight-match").textContent = h.match;
  return node;
}

// ---------------- Live ticker (header) ----------------

async function initLiveTicker() {
  try {
    const { results } = await api.liveMatches();
    if (!results.length) return;
    const ticker = document.getElementById("live-ticker");
    const track = document.getElementById("ticker-track");
    track.innerHTML = "";
    results.forEach((m) => {
      const el = document.createElement("span");
      el.className = "ticker-item";
      el.innerHTML = `${m.home.flag} ${m.home.code} <b>${m.home_score}-${m.away_score}</b> ${m.away.code} ${m.away.flag} · ${m.minute}'`;
      track.appendChild(el);
    });
    ticker.hidden = false;
  } catch (err) {
    console.error(err);
  }
}

// ---------------- Live section ----------------

async function initLiveSection() {
  const grid = document.getElementById("live-grid");
  const empty = document.getElementById("live-empty");
  const countEl = document.getElementById("live-count");
  try {
    const { results, count } = await api.liveMatches();
    countEl.textContent = count ? `${count} in progress` : "";
    if (!results.length) {
      empty.hidden = false;
      return;
    }
    results.forEach((m) => grid.appendChild(fillMatchCard(m)));
  } catch (err) {
    console.error(err);
    empty.hidden = false;
  }
}

// ---------------- Schedule (paginated, loads on demand) ----------------

function initSchedule() {
  const grid = document.getElementById("schedule-grid");
  const loadMoreBtn = document.getElementById("load-more-btn");
  const statusEl = document.getElementById("schedule-status");
  const groupSelect = document.getElementById("filter-group");
  const statusSelect = document.getElementById("filter-status");

  let page = 1;
  let loading = false;
  let hasMore = true;

  async function loadPage(reset = false) {
    if (loading) return;
    loading = true;
    loadMoreBtn.disabled = true;
    if (reset) {
      page = 1;
      grid.innerHTML = "";
    }
    try {
      const { results, hasMore: more, total } = await api.matches({
        page,
        limit: 8,
        status: statusSelect.value,
        group: groupSelect.value,
      });
      results.forEach((m) => grid.appendChild(fillMatchCard(m)));
      hasMore = more;
      statusEl.textContent = `Showing ${grid.children.length} of ${total} matches`;
      loadMoreBtn.hidden = !hasMore;
      page += 1;
    } catch (err) {
      console.error(err);
      statusEl.textContent = "Couldn't load matches — try again.";
    } finally {
      loading = false;
      loadMoreBtn.disabled = false;
    }
  }

  loadMoreBtn.addEventListener("click", () => loadPage());
  groupSelect.addEventListener("change", () => loadPage(true));
  statusSelect.addEventListener("change", () => loadPage(true));

  // Populate group filter from the (tiny) groups list, not the full match set.
  api.groups().then((groups) => {
    groups.forEach((g) => {
      const opt = document.createElement("option");
      opt.value = g.letter;
      opt.textContent = `Group ${g.letter}`;
      groupSelect.appendChild(opt);
    });
  });

  loadPage(true);
}

// ---------------- Groups (standings fetched only when a tab is opened) ----------------

async function initGroups() {
  const tabsEl = document.getElementById("group-tabs");
  const tableWrap = document.getElementById("group-table-wrap");

  const groups = await api.groups();
  groups.forEach((g, i) => {
    const btn = document.createElement("button");
    btn.className = "group-tab";
    btn.textContent = `Group ${g.letter}`;
    btn.addEventListener("click", () => selectGroup(g.letter, btn));
    tabsEl.appendChild(btn);
  });

  async function selectGroup(letter, btn) {
    tabsEl.querySelectorAll(".group-tab").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    tableWrap.innerHTML = `<p class="empty-state">Loading Group ${letter}…</p>`;
    try {
      const { standings } = await api.groupStandings(letter);
      renderStandings(standings);
    } catch (err) {
      tableWrap.innerHTML = `<p class="empty-state">Couldn't load Group ${letter}.</p>`;
    }
  }

  function renderStandings(rows) {
    const table = document.createElement("table");
    table.className = "standings";
    table.innerHTML = `
      <thead>
        <tr>
          <th style="text-align:left">Team</th>
          <th>P</th><th>W</th><th>D</th><th>L</th><th>GF</th><th>GA</th><th>Pts</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map((t) => `
          <tr>
            <td class="team-cell">${t.flag} ${t.name}</td>
            <td>${t.played}</td><td>${t.won}</td><td>${t.drawn}</td><td>${t.lost}</td>
            <td>${t.gf}</td><td>${t.ga}</td><td class="pts">${t.points}</td>
          </tr>`).join("")}
      </tbody>`;
    tableWrap.innerHTML = "";
    tableWrap.appendChild(table);
  }
}

// ---------------- Highlights (fetched only once the section scrolls into view) ----------------

function initHighlights() {
  const section = document.getElementById("highlights");
  const grid = document.getElementById("highlights-grid");
  const moreBtn = document.getElementById("highlights-more-btn");
  const note = document.getElementById("highlights-note");

  let page = 1;
  let loading = false;

  async function loadPage() {
    if (loading) return;
    loading = true;
    try {
      const { results, hasMore } = await api.highlights({ page, limit: 6 });
      results.forEach((h) => grid.appendChild(fillHighlightCard(h)));
      moreBtn.hidden = !hasMore;
      page += 1;
      note.textContent = "";
    } catch (err) {
      console.error(err);
      note.textContent = "Couldn't load highlights.";
    } finally {
      loading = false;
    }
  }

  moreBtn.addEventListener("click", loadPage);

  // Don't fetch anything until the user actually scrolls near this section.
  onceInView(section, loadPage);
}
