(function () {
  function generatedIcon(name, color = "#7c3f69") {
    const letter = String(name || "游").slice(0, 1);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180" viewBox="0 0 180 180"><defs><linearGradient id="g" x1="0" y1="1" x2="1" y2="0"><stop stop-color="#1b1428"/><stop offset="1" stop-color="${color}"/></linearGradient></defs><rect width="180" height="180" rx="42" fill="url(#g)"/><circle cx="90" cy="90" r="60" fill="#fff" fill-opacity=".1" stroke="#ffe3a1" stroke-width="4"/><text x="90" y="116" text-anchor="middle" fill="#fff" font-size="76" font-family="serif" font-weight="900">${letter}</text></svg>`;
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  }
  const games = [
    { name: "王者荣耀", icon: "./assets/games/wzry.jpg", market: "国服热门" },
    { name: "三角洲行动", icon: "./assets/games/delta.jpg", market: "近期热度第一" },
    { name: "和平精英", icon: "./assets/games/hpjy.jpg", market: "国服热门" },
    { name: "超自然行动组", icon: "./assets/games/supernatural.svg", market: "近期黑马" },
    { name: "无畏契约", icon: "./assets/games/valorant.svg", market: "竞技热门", brand: true },
    { name: "洛克王国：世界", icon: generatedIcon("洛", "#557bc4"), market: "新游热门" },
    { name: "逆水寒手游", icon: "./assets/games/nsh.jpg", market: "MMO热门" },
    { name: "燕云十六声", icon: generatedIcon("燕", "#82664e"), market: "武侠热门" },
    { name: "异环", icon: generatedIcon("异", "#8b4ec4"), market: "新游专区" },
    { name: "鸣潮", icon: "./assets/games/wuthering-waves.jpg", market: "二次元热门" },
    { name: "天涯明月刀", icon: generatedIcon("天", "#356a77"), market: "武侠经典" },
    { name: "逆战：未来", icon: generatedIcon("逆", "#bd4d3d"), market: "射击新游" },
    { name: "原神", icon: "./assets/games/genshin.jpg", market: "全球热门", count: 0 },
    { name: "Steam", icon: "./assets/games/steam.svg", market: "海外专区", count: 0, brand: true },
    { name: "崩坏：星穹铁道", icon: "./assets/games/hsr.jpg", market: "二次元", count: 0 },
    { name: "金铲铲之战", icon: "./assets/games/jcc.jpg", market: "策略热门", count: 0 },
    { name: "DNF手游", icon: "./assets/games/dnf-mobile.jpg", market: "动作热门", count: 0 },
    { name: "火影忍者", icon: "./assets/games/naruto.jpg", market: "格斗热门", count: 0 },
    { name: "第五人格", icon: "./assets/games/identity-v.jpg", market: "网易热门", count: 0 },
    { name: "英雄联盟", icon: "./assets/games/lol.svg", market: "端游专区", count: 0, brand: true },
    { name: "Counter-Strike 2", icon: "./assets/games/cs2.svg", market: "海外竞技", count: 0, brand: true }
  ];

  function find(name) {
    const normalized = String(name || "").toLowerCase();
    return games.find((game) => game.name.toLowerCase() === normalized ||
      (normalized.includes("英雄联盟") && game.name === "英雄联盟") ||
      (normalized.includes("无畏契约") && game.name === "无畏契约") ||
      (normalized.includes("超自然") && game.name === "超自然行动组")) || null;
  }

  window.GameDirectory = { games, find };

  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("[data-game-grid]").forEach((root) => {
      const target = root.dataset.gameTarget || "accounts.html";
      const limit = Number(root.dataset.gameLimit || games.length);
      root.innerHTML = games.slice(0, limit).map((game) => `<a class="game-tile" href="./${target}?game=${encodeURIComponent(game.name)}">
        <span class="game-logo ${game.brand ? "is-brand" : ""}"><img src="${game.icon}" alt="${game.name} Logo" loading="lazy"></span>
        <span class="game-tile-copy"><strong>${game.name}</strong><small>${game.market}</small></span>
      </a>`).join("");
    });

    document.querySelectorAll("[data-game-strip]").forEach((root) => {
      const target = root.dataset.gameTarget || "accounts.html";
      root.innerHTML = games.slice(0, 9).map((game) => `<a class="game-chip" data-game-chip="${game.name}" href="./${target}?game=${encodeURIComponent(game.name)}"><span class="game-chip-logo ${game.brand ? "is-brand" : ""}"><img src="${game.icon}" alt=""></span><span>${game.name}</span></a>`).join("") + `<a class="game-chip more" href="./${target}">全部游戏 →</a>`;
    });
  });
})();
