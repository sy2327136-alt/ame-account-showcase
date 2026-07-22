(function () {
  const games = [
    { name: "王者荣耀", icon: "./assets/games/wzry.jpg", market: "国服热门", count: 4 },
    { name: "三角洲行动", icon: "./assets/games/delta.jpg", market: "近期热度第一", count: 0 },
    { name: "和平精英", icon: "./assets/games/hpjy.jpg", market: "国服热门", count: 3 },
    { name: "超自然行动组", icon: "./assets/games/supernatural.svg", market: "近期黑马", count: 4 },
    { name: "无畏契约", icon: "./assets/games/valorant.svg", market: "竞技热门", count: 4, brand: true },
    { name: "原神", icon: "./assets/games/genshin.jpg", market: "全球热门", count: 0 },
    { name: "Steam", icon: "./assets/games/steam.svg", market: "海外专区", count: 0, brand: true },
    { name: "崩坏：星穹铁道", icon: "./assets/games/hsr.jpg", market: "二次元", count: 0 },
    { name: "鸣潮", icon: "./assets/games/wuthering-waves.jpg", market: "二次元", count: 0 },
    { name: "金铲铲之战", icon: "./assets/games/jcc.jpg", market: "策略热门", count: 0 },
    { name: "DNF手游", icon: "./assets/games/dnf-mobile.jpg", market: "动作热门", count: 0 },
    { name: "逆水寒手游", icon: "./assets/games/nsh.jpg", market: "MMO热门", count: 0 },
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
        <span class="game-tile-copy"><strong>${game.name}</strong><small>${game.market}${game.count ? ` · ${game.count}件精选` : ""}</small></span>
      </a>`).join("");
    });

    document.querySelectorAll("[data-game-strip]").forEach((root) => {
      const target = root.dataset.gameTarget || "accounts.html";
      root.innerHTML = games.slice(0, 9).map((game) => `<a class="game-chip" data-game-chip="${game.name}" href="./${target}?game=${encodeURIComponent(game.name)}"><span class="game-chip-logo ${game.brand ? "is-brand" : ""}"><img src="${game.icon}" alt=""></span><span>${game.name}</span></a>`).join("") + `<a class="game-chip more" href="./${target}">全部游戏 →</a>`;
    });
  });
})();
