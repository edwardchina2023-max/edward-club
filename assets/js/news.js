const fallbackNews = [
  { id: 16520, name: "Transformer论文作者之一Noam Shazeer宣布离开Google，加入OpenAI", summary: "从模型研究到产业组织，AI 的关键变量仍在快速变化。", typeName: "AI", cover: "https://image.deeptechchina.com/article/2026061811234129466.png", article_url: "http://www.sciphi.cn/article/view/16520" },
  { id: 16519, name: "英伟达把8个AI和8台机器人关在一起，它们学会了自己做实验", summary: "机器人实验室正在让研发的速度与组织方式发生变化。", typeName: "AI", cover: "https://image.deeptechchina.com/article/2026061811184350288.png", article_url: "http://www.sciphi.cn/article/view/16519" },
  { id: 16517, name: "一针注射，体外控波，科学家研发新型无线神经刺激器重塑疼痛管理", summary: "生物医学工程正在拓展非药物干预的技术边界。", typeName: "生物医学", cover: "https://image.deeptechchina.com/article/2026061711071978915.png", article_url: "http://www.sciphi.cn/article/view/16517" },
  { id: 16514, name: "MIT让机器人学会“透视海水”：浑浊海底也能实时建图", summary: "感知、定位与机器人能力的交叉正在走向新的应用现场。", typeName: "机器人", cover: "https://image.deeptechchina.com/article/2026061618002915174.png", article_url: "http://www.sciphi.cn/article/view/16514" }
];

const apiUrl = "https://apii.web.mittrchina.com/information/index?page=3&limit=8&author=&type=&label=&is_ad=true";
const list = document.querySelector("[data-news-list]");
const escape = (value = "") => value.replace(/[&<>'\"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#039;", "\"": "&quot;" }[character]));
const render = (items) => {
  if (!list) return;
  list.innerHTML = items.slice(0, 4).map((item) => `
    <a class="news-card" href="${escape(item.article_url || `https://apii.web.mittrchina.com/information/details?id=${item.id}`)}" target="_blank" rel="noreferrer">
      <img src="${escape(item.cover || "")}" alt="${escape(item.name)}" />
      <small>${escape(item.typeName || "前沿科技")}</small>
      <h3>${escape(item.name)}</h3>
      <p>${escape(item.summary || "")}</p>
    </a>`).join("");
};

render(fallbackNews);
fetch(apiUrl).then((response) => response.json()).then((payload) => {
  const items = payload?.data?.items;
  if (Array.isArray(items) && items.length) render(items);
}).catch(() => {});
