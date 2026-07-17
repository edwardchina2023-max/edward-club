const briefingUrl = "./data/waic-briefing.json";
const formatTime = (value) => {
  if (!value) return "时间待核验";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium", timeStyle: "short", hour12: false }).format(date);
};
const escapeHtml = (value = "") => String(value).replace(/[&<>'\"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#039;", "\"": "&quot;" }[character]));
const host = (value = "") => {
  try { return new URL(value).hostname.replace(/^www\./, ""); } catch { return value; }
};
const countItems = (sections = []) => sections.reduce((sum, section) => sum + (section.items || []).length, 0);
const fallbackLiveSections = (sections = []) => {
  const live = sections.find((section) => section.id === "直播")?.items || [];
  return [
    { id: "forum", title: "论坛视频直播", en: "Forum Livestreams", description: "主论坛、分论坛、圆桌与会议直播入口。", items: live },
    { id: "exhibition", title: "逛展直播", en: "Expo Walkthroughs", description: "展区、展台和探馆直播入口。", items: [] },
    { id: "guest", title: "嘉宾解读直播", en: "Guest Commentary", description: "嘉宾、专家和创作者解读入口。", items: [] }
  ];
};
const renderLiveSections = (sections = []) => {
  const target = document.querySelector("[data-live-sections]");
  if (!target) return;
  target.innerHTML = sections.map((section) => `
    <article class="live-group" id="${escapeHtml(section.id || "live")}">
      <div class="live-group-heading">
        <div><span>${escapeHtml(section.en || "LIVE")}</span><h2>${escapeHtml(section.title || "直播链接")}</h2><p>${escapeHtml(section.description || "点击进入原始直播/回放链接。")}</p></div>
        <strong>${(section.items || []).length}<small>条链接</small></strong>
      </div>
      <div class="live-link-list">
        ${(section.items || []).map((item, index) => `
          <a class="live-link-card" href="${escapeHtml(item.url || "#")}" target="_blank" rel="noreferrer">
            <span class="live-link-index">${String(index + 1).padStart(2, "0")}</span>
            <div>
              <small>${escapeHtml(item.source || host(item.url))}${item.published_at ? ` · ${escapeHtml(formatTime(item.published_at))}` : ""}</small>
              <h3>${escapeHtml(item.title || "打开直播链接")}</h3>
              <p>${escapeHtml(item.summary || "点击查看原始直播、回放或检索结果。")}</p>
            </div>
            <em>${escapeHtml(host(item.url) || "OPEN")}</em>
          </a>`).join("")}
      </div>
    </article>`).join("");
};
fetch(`${briefingUrl}?t=${Date.now()}`)
  .then((response) => response.json())
  .then((briefing) => {
    const liveSections = briefing.live_sections?.length ? briefing.live_sections : fallbackLiveSections(briefing.sections || []);
    document.querySelector("[data-live-time]").textContent = `更新时间：${formatTime(briefing.generated_at)}`;
    document.querySelector("[data-live-total]").textContent = `${countItems(liveSections)} 条直播/回放入口`;
    renderLiveSections(liveSections);
  })
  .catch(() => {
    document.querySelector("[data-live-time]").textContent = "暂时无法读取直播数据";
    document.querySelector("[data-live-total]").textContent = "请稍后刷新";
  });
