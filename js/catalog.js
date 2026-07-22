(function () {
  const GM = window.GameMarket;
  const root = document.querySelector("[data-catalog]");
  if (!root) return;

  const type = root.dataset.catalog;
  const state = { products: [], query: "", game: "all", region: "all", sort: "recommended" };
  const grid = document.querySelector("[data-product-grid]");
  const count = document.querySelector("[data-result-count]");
  const modal = document.querySelector("[data-product-modal]");

  function card(product, favorites) {
    const tags = (product.tags || []).slice(0, 3).map((tag) => `<span class="tag">${GM.escape(tag)}</span>`).join("");
    return `<article class="product-card">
      <div class="card-image">
        <img src="${GM.escape(product.coverImage)}" alt="${GM.escape(product.title)}" loading="lazy">
        ${product.badge ? `<span class="card-badge">${GM.escape(product.badge)}</span>` : ""}
        <button class="favorite ${favorites.includes(product.id) ? "is-on" : ""}" data-favorite="${GM.escape(product.id)}" aria-label="收藏">♥</button>
      </div>
      <div class="card-body">
        <div class="card-meta">${GM.escape(product.gameName)} · ${GM.escape(product.platform)}</div>
        <h3>${GM.escape(product.title)}</h3>
        <p class="card-subtitle">${GM.escape(product.subtitle)}</p>
        <div class="tags">${tags}</div>
        <div class="price-row"><div class="price"><strong>${GM.money(product.price)}</strong>${product.originalPrice ? `<del>${GM.money(product.originalPrice)}</del>` : ""}</div><button class="btn small" data-detail="${GM.escape(product.id)}">查看详情</button></div>
      </div>
    </article>`;
  }

  function filtered() {
    const query = state.query.trim().toLowerCase();
    const list = state.products.filter((product) => {
      const haystack = [product.title, product.subtitle, product.gameName, product.publisher, ...(product.tags || [])].join(" ").toLowerCase();
      return (!query || haystack.includes(query)) && (state.game === "all" || product.gameName === state.game) && (state.region === "all" || product.region === state.region);
    });
    return list.sort((a, b) => {
      if (state.sort === "price-asc") return a.price - b.price;
      if (state.sort === "price-desc") return b.price - a.price;
      if (state.sort === "sales") return (b.sales || 0) - (a.sales || 0);
      return Number(b.featured) - Number(a.featured) || (b.sortOrder || 0) - (a.sortOrder || 0);
    });
  }

  function render() {
    const list = filtered();
    count.textContent = `共 ${list.length} 件商品`;
    grid.innerHTML = list.length ? list.map((product) => card(product, GM.favorites())).join("") : `<div class="empty">没有找到符合条件的商品，换个关键词试试。</div>`;
  }

  function fillFilters() {
    const game = document.querySelector("[data-filter-game]");
    const region = document.querySelector("[data-filter-region]");
    [...new Set(state.products.map((item) => item.gameName))].sort().forEach((value) => game.insertAdjacentHTML("beforeend", `<option>${GM.escape(value)}</option>`));
    [...new Set(state.products.map((item) => item.region))].sort().forEach((value) => region.insertAdjacentHTML("beforeend", `<option>${GM.escape(value)}</option>`));
  }

  function showDetail(product) {
    const images = (product.images?.length ? product.images : [product.coverImage]).slice(0, 30);
    const specs = Object.entries(product.specs || {}).map(([label, value]) => `<div class="spec"><span>${GM.escape(label)}</span><strong>${GM.escape(value)}</strong></div>`).join("");
    modal.innerHTML = `<div class="modal-card" role="dialog" aria-modal="true">
      <button class="modal-close" data-close-modal aria-label="关闭">✕</button>
      <div class="modal-grid">
        <div class="gallery"><div class="gallery-main"><img data-main-image src="${GM.escape(images[0])}" alt="${GM.escape(product.title)}"></div><div class="thumbs">${images.map((src, index) => `<button class="thumb ${index === 0 ? "is-active" : ""}" data-thumb="${GM.escape(src)}"><img src="${GM.escape(src)}" alt="商品图片 ${index + 1}"></button>`).join("")}</div></div>
        <div class="detail"><span class="badge">${GM.escape(product.badge || product.gameName)}</span><h2>${GM.escape(product.title)}</h2><p class="lead">${GM.escape(product.subtitle)}</p><div class="detail-price">${GM.money(product.price)}</div><p>${GM.escape(product.description)}</p><div class="spec-grid">${specs}</div><div class="detail-actions"><button class="btn" data-copy-wechat>复制客服微信</button><button class="btn ghost" data-modal-favorite="${GM.escape(product.id)}">收藏商品</button></div></div>
      </div>
    </div>`;
    modal.classList.add("is-open");
    document.body.style.overflow = "hidden";
    modal.querySelector("[data-copy-wechat]").addEventListener("click", (event) => GM.copyWechat(event.currentTarget));
  }

  root.addEventListener("input", (event) => {
    if (event.target.matches("[data-search]")) { state.query = event.target.value; render(); }
  });
  root.addEventListener("change", (event) => {
    if (event.target.matches("[data-filter-game]")) state.game = event.target.value;
    if (event.target.matches("[data-filter-region]")) state.region = event.target.value;
    if (event.target.matches("[data-sort]")) state.sort = event.target.value;
    render();
  });
  grid.addEventListener("click", (event) => {
    const favorite = event.target.closest("[data-favorite]");
    const detail = event.target.closest("[data-detail]");
    if (favorite) { GM.toggleFavorite(favorite.dataset.favorite); render(); }
    if (detail) showDetail(state.products.find((item) => item.id === detail.dataset.detail));
  });
  modal.addEventListener("click", (event) => {
    if (event.target === modal || event.target.closest("[data-close-modal]")) { modal.classList.remove("is-open"); document.body.style.overflow = ""; }
    const thumb = event.target.closest("[data-thumb]");
    if (thumb) { modal.querySelector("[data-main-image]").src = thumb.dataset.thumb; modal.querySelectorAll(".thumb").forEach((item) => item.classList.toggle("is-active", item === thumb)); }
    const favorite = event.target.closest("[data-modal-favorite]");
    if (favorite) { GM.toggleFavorite(favorite.dataset.modalFavorite); favorite.textContent = "已更新收藏"; }
  });

  GM.loadProducts().then((data) => {
    state.products = (data.products || []).filter((product) => product.productType === type && product.status === "active");
    fillFilters();
    render();
  }).catch((error) => { grid.innerHTML = `<div class="empty">${GM.escape(error.message)}，请稍后刷新。</div>`; });
})();
