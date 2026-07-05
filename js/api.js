// Static-site version of the API layer. There is no server here — every call
// fetches a small, pre-built JSON file from /data/. Pagination and filtering
// were done once at build time (see build_static.py), so the browser still
// only ever pulls one small chunk at a time, same as the dynamic version.
const api = {
  async get(path) {
    const res = await fetch(path);
    if (!res.ok) throw new Error(`Request failed: ${path} (${res.status})`);
    return res.json();
  },

  liveMatches() {
    return this.get("data/matches/live.json");
  },

  matches({ page = 1, status = "", group = "" } = {}) {
    let dir;
    if (group && status) dir = `data/matches/group-status/${group}-${status}`;
    else if (group) dir = `data/matches/group/${group}`;
    else if (status) dir = `data/matches/status/${status}`;
    else dir = `data/matches/all`;
    return this.get(`${dir}/page-${page}.json`);
  },

  groups() {
    return this.get("data/groups.json");
  },

  groupStandings(letter) {
    return this.get(`data/groups/${letter}.json`);
  },

  highlights({ page = 1 } = {}) {
    return this.get(`data/highlights/page-${page}.json`);
  },
};
