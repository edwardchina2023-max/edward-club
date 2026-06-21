const phone = "13716986368";

document.querySelectorAll("[data-menu-toggle]").forEach((button) => {
  button.addEventListener("click", () => {
    const header = document.querySelector(".site-header");
    const isOpen = header.classList.toggle("menu-open");
    button.setAttribute("aria-expanded", String(isOpen));
    button.textContent = isOpen ? "关闭" : "目录";
  });
});

const modal = document.querySelector("[data-apply-modal]");
const openApply = () => {
  if (!modal) return;
  modal.classList.add("is-open");
  document.body.classList.add("modal-open");
  modal.querySelector("input")?.focus();
};
const closeApply = () => {
  if (!modal) return;
  modal.classList.remove("is-open");
  document.body.classList.remove("modal-open");
};

document.querySelectorAll("[data-open-apply]").forEach((button) => button.addEventListener("click", openApply));
document.querySelectorAll("[data-close-apply]").forEach((button) => button.addEventListener("click", closeApply));
modal?.addEventListener("click", (event) => { if (event.target === modal) closeApply(); });
document.addEventListener("keydown", (event) => { if (event.key === "Escape") closeApply(); });

document.querySelectorAll("[data-apply-form]").forEach((form) => {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const summary = [
      "DEEPTECH+ 企业家的科学社区申请意向",
      `姓名：${data.get("name") || ""}`,
      `企业：${data.get("company") || ""}`,
      `职位：${data.get("title") || ""}`,
      `联系方式：${data.get("contact") || ""}`,
      `关注方向：${data.get("direction") || ""}`,
      `希望对接/解决的问题：${data.get("need") || ""}`
    ].join("\n");
    const result = form.querySelector("[data-form-result]");
    try { await navigator.clipboard.writeText(summary); } catch { /* clipboard availability depends on browser context */ }
    result.innerHTML = `沟通摘要已生成${navigator.clipboard ? "并尝试复制" : ""}。请致电 <a href="tel:${phone}">${phone}</a> 联络我们；黄师傅会负责后续沟通，也可在企业微信中粘贴发送。`;
  });
});

document.querySelectorAll("[data-filter]").forEach((button) => {
  button.addEventListener("click", () => {
    const field = button.dataset.filter;
    document.querySelectorAll("[data-filter]").forEach((item) => item.classList.toggle("is-active", item === button));
    document.querySelectorAll("[data-field]").forEach((card) => {
      card.classList.toggle("is-hidden", field !== "all" && card.dataset.field !== field);
    });
  });
});
