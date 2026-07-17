const briefingUrl = "./data/waic-briefing.json";
const formatTime = (value) => {
  if (!value) return "等待首次自动更新";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium", timeStyle: "short", hour12: false }).format(date);
};
const escapeHtml = (value = "") => String(value).replace(/[&<>'\"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#039;", "\"": "&quot;" }[character]));
const shortenUrl = (value = "") => {
  try { return new URL(value).hostname.replace(/^www\./, ""); } catch { return value; }
};
const renderHighlights = (items = []) => {
  const target = document.querySelector("[data-waic-highlights]");
  if (!target) return;
  target.innerHTML = items.map((item, index) => `<article><span>${String(index + 1).padStart(2, "0")}</span><p>${escapeHtml(item)}</p></article>`).join("");
};
const renderSections = (sections = []) => {
  const target = document.querySelector("[data-waic-sections]");
  if (!target) return;
  target.innerHTML = sections.map((section) => `
    <article class="waic-feed-group">
      <div class="waic-feed-heading"><span>${escapeHtml(section.en || "PUBLIC SIGNAL")}</span><h3>${escapeHtml(section.title || "未命名分组")}</h3></div>
      <div class="waic-feed-items">
        ${(section.items || []).slice(0, 8).map((item) => `
          <a class="waic-feed-card" href="${escapeHtml(item.url || "#")}" target="_blank" rel="noreferrer">
            ${item.image ? `<img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.title || "专题图片")}" loading="lazy" />` : `<div class="waic-feed-fallback"><span>${escapeHtml(item.type || "AI")}</span></div>`}
            <div>
              <small>${escapeHtml(item.source || shortenUrl(item.url))}${item.published_at ? ` · ${escapeHtml(formatTime(item.published_at))}` : ""}</small>
              <h4>${escapeHtml(item.title || "打开原始链接")}</h4>
              <p>${escapeHtml(item.summary || "点击查看原始内容。")}</p>
            </div>
          </a>`).join("")}
      </div>
    </article>`).join("");
};
const renderSources = (sources = [], queryLog = []) => {
  const target = document.querySelector("[data-waic-sources]");
  if (!target) return;
  const sourceLinks = sources.map((source) => `<a href="${escapeHtml(source.url)}" target="_blank" rel="noreferrer">${escapeHtml(source.name || shortenUrl(source.url))}</a>`).join("");
  const queries = queryLog.map((query) => `<span>${escapeHtml(query)}</span>`).join("");
  target.innerHTML = `<div><h3>公开来源</h3>${sourceLinks || "<p>等待自动任务写入来源。</p>"}</div><div><h3>检索关键词</h3><p class="waic-query-tags">${queries || "<span>WAIC</span>"}</p></div>`;
};
fetch(`${briefingUrl}?t=${Date.now()}`)
  .then((response) => response.json())
  .then((briefing) => {
    document.querySelector("[data-waic-status]").textContent = briefing.status === "seed" ? "专题已建立，等待 GitHub Actions 自动刷新" : "最新简报已自动生成";
    document.querySelector("[data-waic-time]").textContent = `更新时间：${formatTime(briefing.generated_at)}`;
    document.querySelector("[data-waic-title]").textContent = briefing.edition_title || "最新图文简报";
    document.querySelector("[data-waic-summary]").textContent = briefing.summary || "暂无摘要。";
    renderHighlights(briefing.highlights || []);
    renderSections(briefing.sections || []);
    renderSources(briefing.sources || [], briefing.query_log || []);
  })
  .catch(() => {
    document.querySelector("[data-waic-status]").textContent = "暂时无法读取简报数据";
    document.querySelector("[data-waic-time]").textContent = "请稍后刷新";
  });
