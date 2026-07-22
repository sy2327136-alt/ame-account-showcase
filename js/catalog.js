(function () {
  const GM = window.GameMarket;
  const root = document.querySelector("[data-catalog]");
  if (!root) return;

  const type = root.dataset.catalog;
  const params = new URLSearchParams(location.search);
  const state = {
    products: [],
    query: params.get("q") || "",
    game: params.get("game") || "all",
    system: "all",
    platform: "all",
    price: "all",
    region: "all",
    sort: "recommended"
  };
  const grid = document.querySelector("[data-product-grid]");
  const count = document.querySelector("[data-result-count]");
  const modal = document.querySelector("[data-product-modal]");
  const search = document.querySelector("[data-search]");
  if (search) search.value = state.query;

  function gameInfo(name) { return window.GameDirectory?.find(name); }

  function card(product, favorites) {
    const game = gameInfo(product.gameName);
    const tags = (product.tags || []).slice(0, 2).map((tag) => `<span class="tag">${GM.escape(tag)}</span>`).join("");
    return `<article class="product-card">
      <button class="favorite ${favorites.includes(product.id) ? "is-on" : ""}" data-favorite="${GM.escape(product.id)}" aria-label="收藏商品">♥</button>
      <button class="card-image" data-detail="${GM.escape(product.id)}"><img src="${GM.escape(product.coverImage)}" alt="${GM.escape(product.title)}" loading="lazy">${product.badge ? `<span class="card-badge">${GM.escape(product.badge)}</span>` : ""}<span class="photo-count">▧ ${(product.images || []).length}图</span></button>
      <div class="card-body">
        <div class="card-game-line">${game ? `<span class="mini-game-logo ${game.brand ? "is-brand" : ""}"><img src="${game.icon}" alt=""></span>` : ""}<span><strong>${GM.escape(product.gameName)}</strong><small>${GM.escape(product.platform)} · ${GM.escape(product.server)}</small></span></div>
        <button class="card-title" data-detail="${GM.escape(product.id)}">${GM.escape(product.title)}</button>
        <p class="card-subtitle">${GM.escape(product.subtitle)}</p>
        <div class="tags"><span class="verify-tag">✓ 已核验展示</span>${tags}</div>
        <div class="price-row"><div class="price"><strong>${GM.money(product.price)}</strong>${product.originalPrice ? `<del>${GM.money(product.originalPrice)}</del>` : ""}</div><button class="detail-link" data-detail="${GM.escape(product.id)}">查看详情</button></div>
      </div>
    </article>`;
  }

  function priceMatches(product) {
    if (state.price === "all") return true;
    const yuan = Number(product.price || 0) / 100;
    const [minText, maxText] = state.price.replace("+", "").split("-");
    const min = Number(minText);
    if (state.price.endsWith("+")) return yuan >= min;
    const max = Number(maxText);
    return yuan >= min && yuan < max;
  }

  function systemMatches(product) {
    if (state.system === "all") return true;
    const text = `${product.platform} ${product.server}`.toLowerCase();
    if (state.system === "iOS") return /ios|苹果/.test(text);
    if (state.system === "Android") return /android|安卓|手机/.test(text);
    if (state.system === "PC") return /pc|steam|电脑/.test(text);
    return text.includes(state.system.toLowerCase());
  }

  function filtered() {
    const query = state.query.trim().toLowerCase();
    const list = state.products.filter((product) => {
      const haystack = [product.title, product.subtitle, product.gameName, product.publisher, product.platform, product.server, ...(product.tags || [])].join(" ").toLowerCase();
      return (!query || haystack.includes(query)) &&
        (state.game === "all" || product.gameName === state.game) &&
        (state.region === "all" || product.region === state.region || (state.region === "全球" && product.region === "全球")) &&
        (state.platform === "all" || `${product.platform} ${product.server}`.includes(state.platform)) &&
        priceMatches(product) && systemMatches(product);
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
    count.textContent = `${list.length} 件商品`;
    grid.innerHTML = list.length ? list.map((product) => card(product, GM.favorites())).join("") : `<div class="empty"><span>暂无符合条件的商品</span><p>可以换个筛选条件，或复制客服微信咨询待上新库存。</p><button class="btn" data-copy-empty>复制微信 GF999314</button></div>`;
    grid.querySelector("[data-copy-empty]")?.addEventListener("click", (event) => GM.copyWechat(event.currentTarget));
  }

  function syncSelectedGame() {
    const title = document.querySelector("[data-selected-game]");
    const crumb = document.querySelector("[data-breadcrumb-game]");
    const logo = document.querySelector("[data-selected-logo]");
    const game = state.game === "all" ? null : gameInfo(state.game);
    if (title) title.textContent = game ? `${game.name}${type === "account" ? "账号选号" : "充值专区"}` : (type === "account" ? "游戏账号选号" : "游戏充值中心");
    if (crumb) crumb.textContent = game?.name || "全部游戏";
    if (logo) logo.innerHTML = game ? `<img class="${game.brand ? "is-brand" : ""}" src="${game.icon}" alt="${game.name} Logo">` : `<img src="./assets/brand-avatar.webp" alt="GF游戏典藏馆原创二次元头像">`;
    document.querySelectorAll("[data-game-chip]").forEach((chip) => chip.classList.toggle("is-active", chip.dataset.gameChip === state.game));
  }

  function showDetail(product) {
    if (!product) return;
    const game = gameInfo(product.gameName);
    const images = (product.images?.length ? product.images : [product.coverImage]).slice(0, 30);
    const specs = Object.entries(product.specs || {}).map(([label, value]) => `<div class="spec"><span>${GM.escape(label)}</span><strong>${GM.escape(value)}</strong></div>`).join("");
    modal.innerHTML = `<div class="modal-card" role="dialog" aria-modal="true"><button class="modal-close" data-close-modal aria-label="关闭">✕</button><div class="modal-grid">
      <div class="gallery"><div class="gallery-main"><img data-main-image src="${GM.escape(images[0])}" alt="${GM.escape(product.title)}"></div><div class="thumbs">${images.map((src, index) => `<button class="thumb ${index === 0 ? "is-active" : ""}" data-thumb="${GM.escape(src)}"><img src="${GM.escape(src)}" alt="商品图片 ${index + 1}"></button>`).join("")}</div></div>
      <div class="detail"><div class="detail-game">${game ? `<span class="mini-game-logo ${game.brand ? "is-brand" : ""}"><img src="${game.icon}" alt=""></span>` : ""}<span><b>${GM.escape(product.gameName)}</b><small>商品编号 ${GM.escape(product.id)}</small></span></div><h2>${GM.escape(product.title)}</h2><p class="lead">${GM.escape(product.subtitle)}</p><div class="detail-price"><small>展示价格</small>${GM.money(product.price)}</div><div class="protection-row"><span>✓ 已核验展示</span><span>✓ 高清实拍图</span><span>✓ 客服一对一</span></div><p class="detail-description">${GM.escape(product.description)}</p><h3 class="detail-section-title">商品参数</h3><div class="spec-grid">${specs}</div><div class="contact-note"><b>温馨提示</b><span>商品库存、换绑条件和充值价格以客服实时核对为准，请勿向任何人提供支付密码。</span></div><div class="detail-actions"><button class="btn" data-copy-wechat>复制客服微信 GF999314</button><button class="btn ghost" data-modal-favorite="${GM.escape(product.id)}">收藏商品</button></div></div>
    </div></div>`;
    modal.classList.add("is-open");
    document.body.style.overflow = "hidden";
    modal.querySelector("[data-copy-wechat]").addEventListener("click", (event) => GM.copyWechat(event.currentTarget));
  }

  root.addEventListener("input", (event) => { if (event.target.matches("[data-search]")) { state.query = event.target.value; render(); } });
  root.addEventListener("click", (event) => {
    const filter = event.target.closest("[data-filter-key]");
    if (filter) {
      state[filter.dataset.filterKey] = filter.dataset.filterValue;
      filter.parentElement.querySelectorAll("button").forEach((button) => button.classList.toggle("is-active", button === filter));
      render();
    }
    const sort = event.target.closest("[data-sort-value]");
    if (sort) {
      state.sort = sort.dataset.sortValue;
      sort.parentElement.querySelectorAll("button").forEach((button) => button.classList.toggle("is-active", button === sort));
      render();
    }
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
    if (favorite) { GM.toggleFavorite(favorite.dataset.modalFavorite); favorite.textContent = "已加入收藏"; }
  });
  document.addEventListener("keydown", (event) => { if (event.key === "Escape" && modal.classList.contains("is-open")) { modal.classList.remove("is-open"); document.body.style.overflow = ""; } });
  document.addEventListener("DOMContentLoaded", syncSelectedGame);

  GM.loadProducts().then((data) => {
    state.products = (data.products || []).filter((product) => product.productType === type && product.status === "active");
    syncSelectedGame();
    render();
  }).catch((error) => { grid.innerHTML = `<div class="empty">${GM.escape(error.message)}，请稍后刷新。</div>`; });
})();
