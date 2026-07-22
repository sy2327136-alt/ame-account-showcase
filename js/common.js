(function () {
  const config = window.APP_CONFIG || {};

  window.GameMarket = {
    config,
    money(cents) {
      return `¥${(Number(cents || 0) / 100).toLocaleString("zh-CN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
    },
    escape(value) {
      return String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);
    },
    async loadProducts() {
      const response = await fetch(`./data/products.json?v=${Date.now()}`, { cache: "no-store" });
      if (!response.ok) throw new Error("商品数据加载失败");
      return response.json();
    },
    favorites() {
      try { return JSON.parse(localStorage.getItem("gf-favorites") || "[]"); } catch { return []; }
    },
    toggleFavorite(id) {
      const list = this.favorites();
      const next = list.includes(id) ? list.filter((item) => item !== id) : [...list, id];
      localStorage.setItem("gf-favorites", JSON.stringify(next));
      return next;
    },
    copyWechat(button) {
      navigator.clipboard.writeText(config.contactWechat || "GF999314").then(() => {
        const old = button.textContent;
        button.textContent = "已复制微信号";
        setTimeout(() => { button.textContent = old; }, 1600);
      });
    },
    initShell() {
      document.querySelectorAll("[data-copy-wechat]").forEach((button) => button.addEventListener("click", () => this.copyWechat(button)));
      const menu = document.querySelector("[data-menu]");
      const nav = document.querySelector("[data-nav]");
      if (menu && nav) menu.addEventListener("click", () => nav.classList.toggle("is-open"));
      const year = document.querySelector("[data-year]");
      if (year) year.textContent = new Date().getFullYear();
    }
  };

  document.addEventListener("DOMContentLoaded", () => window.GameMarket.initShell());
})();
