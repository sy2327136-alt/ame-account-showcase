(function () {
  const root = document.querySelector("[data-home-products]");
  if (!root) return;
  const GM = window.GameMarket;

  function card(product) {
    const game = window.GameDirectory?.find(product.gameName);
    const cover = window.ProductVisuals?.cover(product) || product.coverImage;
    return `<article class="product-card home-product-card">
      <button class="favorite ${GM.favorites().includes(product.id) ? "is-on" : ""}" data-home-favorite="${GM.escape(product.id)}" aria-label="收藏">♥</button>
      <a href="./${product.productType === "account" ? "accounts" : "recharge"}.html?game=${encodeURIComponent(product.gameName)}" class="card-image"><img src="${GM.escape(cover)}" alt="${GM.escape(product.title)}" loading="lazy">${product.badge ? `<span class="card-badge">${GM.escape(product.badge)}</span>` : ""}<span class="photo-count">▧ 5图</span></a>
      <div class="card-body"><div class="card-game-line">${game ? `<span class="mini-game-logo ${game.brand ? "is-brand" : ""}"><img src="${game.icon}" alt=""></span>` : ""}<span><strong>${GM.escape(product.gameName)}</strong><small>${GM.escape(product.platform)} · ${GM.escape(product.server)}</small></span></div><h3>${GM.escape(product.title)}</h3><p class="card-subtitle">${GM.escape(product.subtitle)}</p><div class="price-row"><div class="price"><strong>${GM.money(product.price)}</strong><del>${product.originalPrice ? GM.money(product.originalPrice) : ""}</del></div><a class="text-link" href="./${product.productType === "account" ? "accounts" : "recharge"}.html?game=${encodeURIComponent(product.gameName)}">查看商品 →</a></div></div>
    </article>`;
  }

  root.addEventListener("click", (event) => {
    const button = event.target.closest("[data-home-favorite]");
    if (button) { window.GameMarket.toggleFavorite(button.dataset.homeFavorite); button.classList.toggle("is-on"); }
  });

  GM.loadProducts().then((data) => {
    const products = (data.products || []).filter((item) => item.status === "active").sort((a, b) => Number(b.featured) - Number(a.featured) || (b.sortOrder || 0) - (a.sortOrder || 0)).slice(0, 8);
    root.innerHTML = products.map(card).join("");
  }).catch(() => { root.innerHTML = '<div class="empty">精选商品加载中，请稍后刷新。</div>'; });
})();
