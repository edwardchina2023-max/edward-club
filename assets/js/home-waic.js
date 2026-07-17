const viewpointUrl = "./data/waic-briefing.json";
const viewpointEscape = (value = "") => String(value).replace(/[&<>'\"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#039;", "\"": "&quot;" }[character]));
const viewpointTime = (value) => {
  if (!value) return "等待首次自动更新";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium", timeStyle: "short", hour12: false }).format(date);
};
const fallbackViewpoints = [
  { channel: "官方 / 论坛", en: "Official & Forum", source: "WAIC", title: "等待自动任务写入最新论坛观点", point: "系统会从公开来源中提取论坛、主论坛和议程相关信号。", url: "./waic.html" },
  { channel: "媒体快讯", en: "Media Signals", source: "公开媒体", title: "等待自动任务写入媒体观点", point: "系统会整理媒体报道中的产业发布、产品动态和治理议题。", url: "./waic.html" },
  { channel: "直播 / 逛展", en: "Live & Expo", source: "直播专题", title: "等待自动任务写入直播观点", point: "系统会把论坛直播、云逛展和现场回放链接合并展示。", url: "./waic-live.html" },
  { channel: "嘉宾 / 自媒体", en: "Guests & Creators", source: "公开检索", title: "等待自动任务写入嘉宾解读", point: "系统会收拢专家、企业家和科技创作者的公开解读入口。", url: "./waic.html" }
];
const renderViewpoints = (items = []) => {
  const target = document.querySelector("[data-channel-viewpoints]");
  if (!target) return;
  const cards = (items.length ? items : fallbackViewpoints).slice(0, 12);
  target.innerHTML = cards.map((item, index) => `
    <a class="viewpoint-card" href="${viewpointEscape(item.url || "./waic.html")}" target="${(item.url || "").startsWith("http") ? "_blank" : "_self"}" rel="noreferrer">
      <span class="viewpoint-index">${String(index + 1).padStart(2, "0")}</span>
      <small>${viewpointEscape(item.en || "PUBLIC SIGNAL")} · ${viewpointEscape(item.source || "公开来源")}</small>
      <h3>${viewpointEscape(item.title || "核心观点")}</h3>
      <p>${viewpointEscape(item.point || "点击查看原始来源。")}</p>
      <em>${viewpointEscape(item.channel || "观点")}</em>
    </a>`).join("");
};
fetch(`${viewpointUrl}?t=${Date.now()}`)
  .then((response) => response.json())
  .then((briefing) => {
    const meta = document.querySelector("[data-viewpoint-time]");
    if (meta) meta.textContent = `更新时间：${viewpointTime(briefing.generated_at)}`;
    renderViewpoints(briefing.channel_viewpoints || []);
  })
  .catch(() => renderViewpoints(fallbackViewpoints));
