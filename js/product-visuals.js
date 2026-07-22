(function () {
  const palettes = [
    ["#170d2b", "#6d3fd6", "#f7bd73"], ["#081d26", "#126879", "#8ee3bd"],
    ["#240c18", "#a12643", "#ffcc7a"], ["#101522", "#344c8c", "#75d6ff"],
    ["#21102a", "#7b365f", "#ff9a75"], ["#0d1d1b", "#356d55", "#d4e68c"]
  ];

  function escape(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[char]));
  }

  function hash(value) {
    return [...String(value || "")].reduce((total, char) => ((total * 31) + char.charCodeAt(0)) >>> 0, 7);
  }

  function data(svg) { return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`; }

  function shell(product, body, page, label) {
    const [dark, mid, light] = palettes[hash(product.gameName) % palettes.length];
    return data(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="820" viewBox="0 0 1200 820">
      <defs><linearGradient id="bg" x1="0" y1="1" x2="1" y2="0"><stop stop-color="${dark}"/><stop offset=".62" stop-color="${mid}"/><stop offset="1" stop-color="${light}"/></linearGradient><radialGradient id="halo"><stop stop-color="#fff" stop-opacity=".4"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>
      <rect width="1200" height="820" fill="url(#bg)"/><circle cx="1020" cy="110" r="430" fill="url(#halo)"/><path d="M0 675c215-122 394-132 574-33 205 112 381 104 626-37v215H0z" fill="#090b12" fill-opacity=".58"/><path d="M880 90l220 128-42 258-178 164-178-164-42-258z" fill="#fff" fill-opacity=".08" stroke="#fff" stroke-opacity=".45" stroke-width="4"/>
      <text x="72" y="82" fill="#fff" fill-opacity=".72" font-size="24" font-family="Arial,'Microsoft YaHei',sans-serif" font-weight="700" letter-spacing="6">GF ACCOUNT GALLERY · ${page}/5</text>
      <text x="72" y="142" fill="#fff" font-size="34" font-family="Arial,'Microsoft YaHei',sans-serif" font-weight="800">${escape(product.gameName)}</text>
      <text x="72" y="184" fill="#fff" fill-opacity=".68" font-size="21" font-family="Arial,'Microsoft YaHei',sans-serif">${escape(label)}</text>${body}
      <text x="72" y="770" fill="#fff" fill-opacity=".62" font-size="20" font-family="Arial,'Microsoft YaHei',sans-serif">原创资料展示图 · 库存与配置下单前实时确认</text>
    </svg>`);
  }

  function rows(product) {
    return Object.entries(product.specs || {}).slice(0, 6);
  }

  function slides(product) {
    const title = escape(product.title);
    const subtitle = escape(product.subtitle);
    const cover = shell(product, `<text x="72" y="310" fill="#fff" font-size="57" font-family="Arial,'Microsoft YaHei',sans-serif" font-weight="900">${title}</text><text x="74" y="374" fill="#fff" fill-opacity=".8" font-size="28" font-family="Arial,'Microsoft YaHei',sans-serif">${subtitle}</text><rect x="72" y="430" width="310" height="62" rx="31" fill="#fff" fill-opacity=".13" stroke="#fff" stroke-opacity=".45"/><text x="115" y="471" fill="#fff" font-size="25" font-family="Arial,'Microsoft YaHei',sans-serif" font-weight="700">本期高性价比精选</text>`, 1, "账号精选封面");
    const specBody = rows(product).map(([key, value], index) => { const x = 72 + (index % 2) * 384; const y = 255 + Math.floor(index / 2) * 130; return `<rect x="${x}" y="${y}" width="350" height="104" rx="18" fill="#fff" fill-opacity=".12" stroke="#fff" stroke-opacity=".22"/><text x="${x + 24}" y="${y + 35}" fill="#fff" fill-opacity=".64" font-size="19" font-family="Arial,'Microsoft YaHei',sans-serif">${escape(key)}</text><text x="${x + 24}" y="${y + 76}" fill="#fff" font-size="27" font-family="Arial,'Microsoft YaHei',sans-serif" font-weight="800">${escape(value)}</text>`; }).join("");
    const specs = shell(product, specBody, 2, "核心配置一览");
    const tags = (product.tags || []).slice(0, 4).map((tag, index) => `<rect x="${72 + index * 205}" y="475" width="180" height="54" rx="27" fill="#fff" fill-opacity=".13"/><text x="${162 + index * 205}" y="510" text-anchor="middle" fill="#fff" font-size="20" font-family="Arial,'Microsoft YaHei',sans-serif">${escape(tag)}</text>`).join("");
    const account = shell(product, `<text x="72" y="295" fill="#fff" font-size="56" font-family="Arial,'Microsoft YaHei',sans-serif" font-weight="900">${escape(product.platform)}</text><text x="74" y="355" fill="#fff" fill-opacity=".8" font-size="27" font-family="Arial,'Microsoft YaHei',sans-serif">${escape(product.server)} · ${escape(product.region)}</text><text x="74" y="418" fill="#fff" fill-opacity=".72" font-size="24" font-family="Arial,'Microsoft YaHei',sans-serif">实名、换绑与安全状态均在下单前再次核验</text>${tags}`, 3, "平台与账号条件");
    const price = shell(product, `<text x="72" y="310" fill="#fff" fill-opacity=".72" font-size="25" font-family="Arial,'Microsoft YaHei',sans-serif">精选服务参考价</text><text x="72" y="430" fill="#fff" font-size="105" font-family="Arial,'Microsoft YaHei',sans-serif" font-weight="900">¥${(Number(product.price || 0) / 100).toLocaleString("zh-CN")}</text><text x="76" y="495" fill="#fff" fill-opacity=".75" font-size="24" font-family="Arial,'Microsoft YaHei',sans-serif">价格包含筛选、资料整理与咨询服务</text>`, 4, "清楚报价 · 方便比较");
    const service = shell(product, `<text x="72" y="300" fill="#fff" font-size="58" font-family="Arial,'Microsoft YaHei',sans-serif" font-weight="900">先核验，再决定</text><text x="74" y="370" fill="#fff" fill-opacity=".8" font-size="27" font-family="Arial,'Microsoft YaHei',sans-serif">库存 · 配置 · 实名 · 换绑逐项确认</text><rect x="72" y="430" width="430" height="68" rx="34" fill="#fff" fill-opacity=".14" stroke="#fff" stroke-opacity=".5"/><text x="287" y="474" text-anchor="middle" fill="#fff" font-size="26" font-family="Arial,'Microsoft YaHei',sans-serif" font-weight="800">客服微信 GF999314</text>`, 5, "一对一咨询服务");
    return [cover, specs, account, price, service];
  }

  window.ProductVisuals = { slides, cover: (product) => slides(product)[0] };
})();
