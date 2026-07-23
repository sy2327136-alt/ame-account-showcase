import fs from "node:fs/promises";

const games = [
  [7, "王者荣耀", "腾讯游戏"], [8, "和平精英", "腾讯游戏"], [391, "三角洲行动", "腾讯游戏"],
  [231, "无畏契约", "Riot Games / 腾讯游戏"], [3000, "洛克王国：世界", "腾讯游戏"], [286, "逆水寒手游", "网易游戏"],
  [1355, "超自然行动组", "巨人网络"], [359, "燕云十六声", "网易游戏"], [1546, "异环", "完美世界游戏"],
  [303, "鸣潮", "库洛游戏"], [1, "天涯明月刀", "腾讯游戏"], [1957, "逆战：未来", "腾讯游戏"]
].map(([sourceGameId, name, publisher]) => ({ sourceGameId, name, publisher }));

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const strip = (value) => String(value || "").replace(/<[^>]*>/g, " ").replace(/&nbsp;|&#160;/g, " ").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
const clean = (value) => strip(value).replace(/[，。；;]+$/g, "");
const dataUrl = new URL("../data/products.json", import.meta.url);

async function fetchText(url, attempts = 3) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 28000);
    try {
      const response = await fetch(url, { headers: { "user-agent": "Mozilla/5.0 GF-Catalog-Sync/1.0" }, signal: controller.signal });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const html = await response.text();
      if (/aliyun_waf_aa|访问验证|Access Verification/i.test(html)) throw new Error("ACCESS_VERIFICATION");
      return html;
    } catch (error) {
      if (error.message === "ACCESS_VERIFICATION") throw error;
      if (attempt === attempts) throw error;
      await sleep(700 * attempt);
    } finally { clearTimeout(timer); }
  }
}

async function mapLimit(items, limit, worker) {
  const result = new Array(items.length);
  let index = 0;
  async function run() {
    while (index < items.length) {
      const current = index++;
      try { result[current] = await worker(items[current], current); }
      catch (error) { result[current] = null; }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
  return result;
}

function parseDetailImages(html) {
  const decoded = String(html || "").replace(/\\u002F/g, "/").replace(/\\u0026/g, "&");
  const matches = [...decoded.matchAll(/https:\/\/pzdsoss\.pzds\.com\/c\/2\/goods\/{1,2}meta\/[^"'<>\\\s)]+?\.(?:jpe?g|png|webp)(?:\?[^"'<>\\\s)]*)?/gi)]
    .map((match) => match[0].replace(/&amp;/g, "&"));
  const seen = new Set();
  const images = [];
  for (const src of matches) {
    const key = src.split("?")[0];
    if (seen.has(key)) continue;
    seen.add(key);
    images.push(src.includes("x-oss-process") ? src : `${src}${src.includes("?") ? "&" : "?"}x-oss-process=style/jpg90`);
    if (images.length === 30) break;
  }
  return images;
}

async function hydrateExistingProducts() {
  const data = JSON.parse(await fs.readFile(dataUrl, "utf8"));
  const pending = data.products.filter((product) => !(product.images || []).length);
  let accessBlocked = false;
  console.log(`现有 ${data.products.length} 个商品，${pending.length} 个等待补齐真实详情图…`);
  const updates = await mapLimit(pending, 2, async (product, index) => {
    if (accessBlocked) return product;
    try {
      const html = await fetchText(product.sourceUrl, 2);
      if (/商品已下架|商品已出售/.test(html)) return { ...product, status: "inactive", images: [], imageCount: 0 };
      const sourceImages = parseDetailImages(html);
      const manuallyUploaded = (product.images || []).filter((src) => !/^https:\/\/pzdsoss\.pzds\.com\//i.test(src));
      const images = [...new Set([...manuallyUploaded, ...sourceImages])].slice(0, 30);
      await sleep(900);
      if ((index + 1) % 10 === 0) console.log(`图片进度 ${index + 1}/${pending.length}`);
      return {
        ...product,
        coverImage: images[0] || product.coverImage,
        images,
        imageCount: images.length,
        sourceCheckedAt: new Date().toISOString()
      };
    } catch (error) {
      if (error.message === "ACCESS_VERIFICATION") {
        accessBlocked = true;
        console.log("来源站点要求访问验证，本轮停止请求并保留现有数据，等待下次自动补图。");
      }
      return product;
    }
  });
  const updatesById = new Map(updates.map((product) => [product.id, product]));
  const hydrated = data.products.map((product) => updatesById.get(product.id) || product);
  data.updatedAt = new Date().toISOString();
  data.sourceAudit = {
    ...data.sourceAudit,
    imageRule: "仅展示详情页公开的真实商品截图；不再生成模板占位图",
    productsWithImages: hydrated.filter((product) => product.images.length).length,
    imageCount: hydrated.reduce((sum, product) => sum + product.images.length, 0)
  };
  data.products = hydrated;
  await fs.writeFile(dataUrl, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  console.log(`图片补齐完成：${data.sourceAudit.productsWithImages} 个商品，共 ${data.sourceAudit.imageCount} 张真实截图。`);
}

function parseList(html, game) {
  return [...html.matchAll(/<a href="\/goodsDetails\/([^/?"]+)\/6[^>]*title="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g)].map((match) => {
    const code = match[1];
    const title = clean(match[2]);
    const text = clean(match[3]);
    const priceMatch = text.match(/[¥￥]\s*([\d.]+)/);
    const sourcePriceYuan = priceMatch ? Number(priceMatch[1]) : 0;
    const discount = Number(text.match(/已减\s*([\d.]+)/)?.[1] || 0);
    return { ...game, code, sourceTitle: title, sourceText: text, sourcePriceYuan, discount };
  }).filter((item) => item.sourcePriceYuan >= 50 && item.sourcePriceYuan <= 20000 && item.sourceTitle.length >= 8);
}

function candidateScore(item) {
  let score = Math.min(item.sourceTitle.length, 100) + Math.min(item.discount / 10, 50);
  if (/可二次实名/.test(item.sourceText) && !/不可二次实名/.test(item.sourceText)) score += 35;
  if (/刚刚|分钟|小时/.test(item.sourceText)) score += 18;
  if (/典藏|无双|红装|粉枪|载具|刀皮|枪皮|幻梦|耀世|金皮|总资产|稀有|限定/.test(item.sourceTitle)) score += 30;
  if (item.sourcePriceYuan <= 2000) score += 20;
  return score;
}

function platformOf(text) {
  return text.match(/安卓Q抢先(?:一区|二区)|安卓QQ|苹果QQ|安卓微信|苹果微信|QQ-通用服务器|微信-通用服务器|巨人官方账号|网易官方账号|官服QQ|官服微信|Steam|PC|安卓|苹果/)?.[0] || "官服";
}

function realNameOf(text) {
  if (/不可二次实名/.test(text)) return "不可二次实名";
  if (/可二次实名/.test(text)) return "可二次实名";
  return "实名条件需核验";
}

function highlights(text) {
  const patterns = [
    /总资产\s*[\d.]+\s*[万亿MKG]*/i, /皮肤总价值\s*[:：]?\s*\d+/, /皮肤价值\s*[:：]?\s*\d+/, /皮肤数量\s*\d+/, /总皮肤\s*\d+/,
    /荣耀典藏\s*\d+/, /珍品传说\s*\d+/, /无双\s*\d+/, /红装\s*\d+/, /粉装\s*\d+/, /粉枪\s*\d+/, /载具\s*\d+/,
    /刀皮\s*\d+/, /枪皮\s*\d+/, /幻梦\s*\d+/, /星耀\s*\d+/, /耀世\s*\d+/, /联动\s*\d+/, /典藏\s*\d+/,
    /金皮(?:数量)?\s*[:：]?\s*\d+/, /紫皮(?:数量)?\s*[:：]?\s*\d+/, /道具皮(?:肤)?\s*\d+/, /套装\s*\d+/, /枪皮\s*\d+/, /英雄\s*\d+/
  ];
  const found = [];
  for (const pattern of patterns) {
    const value = text.match(pattern)?.[0]?.replace(/\s+/g, "");
    if (value && !found.some((item) => item.includes(value) || value.includes(item))) found.push(value);
  }
  return found.slice(0, 6);
}

function buildProduct(item, order) {
  const keyPoints = highlights(item.sourceTitle);
  const platform = platformOf(item.sourceText);
  const realName = realNameOf(item.sourceText);
  const servicePrice = Math.ceil(item.sourcePriceYuan * 1.3);
  const badge = item.discount > 0 ? "近期优惠" : realName === "可二次实名" ? "换绑友好" : servicePrice <= 800 ? "预算优选" : "配置精选";
  const title = keyPoints.length >= 2 ? `${keyPoints.slice(0, 3).join(" · ")}精选号` : `${item.name}高性价比精选账号`;
  const specs = {};
  keyPoints.forEach((value, index) => { specs[`配置亮点 ${index + 1}`] = value; });
  specs["账号平台"] = platform;
  specs["实名条件"] = realName;
  const images = (item.images || []).slice(0, 30);
  return {
    id: `acc-${item.sourceGameId}-${item.code}`,
    productType: "account",
    gameName: item.name,
    publisher: item.publisher,
    title,
    subtitle: `${platform}｜${realName}｜本期精选`,
    price: servicePrice * 100,
    originalPrice: 0,
    platform,
    server: platform.includes("QQ") ? "QQ区" : platform.includes("微信") ? "微信区" : "官服",
    region: "国服",
    badge,
    tags: [...keyPoints.slice(0, 2), realName].filter(Boolean),
    coverImage: images[0] || "./assets/hero-duo.webp",
    images,
    imageCount: images.length,
    description: `已从本期公开在售信息中筛选，重点配置为${keyPoints.slice(0, 4).join("、") || "资料完整、价位合理"}。下单前请联系客服再次确认库存、实名与换绑条件。`,
    specs,
    sourceName: "盼之公开在售",
    sourceGameId: item.sourceGameId,
    sourceRef: item.code,
    sourceUrl: `https://www.pzds.com/goodsDetails/${item.code}/6`,
    sourcePrice: Math.round(item.sourcePriceYuan * 100),
    sourceTitle: item.sourceTitle,
    sourceCheckedAt: new Date().toISOString(),
    status: "active",
    featured: order < 20,
    sales: 0,
    sortOrder: 1000 - order
  };
}

if (process.argv.includes("--hydrate-existing")) {
  await hydrateExistingProducts();
  process.exit(0);
}

console.log("开始抓取 12 个热门游戏的实时在售列表…");
const listTasks = Array.from({ length: 3 }, (_, round) => games.flatMap((game) => Array.from({ length: 10 }, (_, index) => ({ game, page: index + 1, round: round + 1 })))).flat();
const listResults = await mapLimit(listTasks, 5, async ({ game, page, round }, index) => {
  const url = `https://www.pzds.com/goodsList/${game.sourceGameId}/6?page=${page}&refresh=${round}-${Date.now()}`;
  const html = await fetchText(url);
  const items = parseList(html, game);
  if ((index + 1) % 10 === 0) console.log(`列表进度 ${index + 1}/${listTasks.length}`);
  return items;
});

const unique = new Map();
for (const item of listResults.flat().filter(Boolean)) {
  if (!unique.has(item.code) || candidateScore(item) > candidateScore(unique.get(item.code))) unique.set(item.code, item);
}
const balanced = [];
for (const game of games) {
  const items = [...unique.values()].filter((item) => item.sourceGameId === game.sourceGameId).sort((a, b) => candidateScore(b) - candidateScore(a)).slice(0, 80);
  balanced.push(...items);
  console.log(`${game.name}: ${items.length} 个候选`);
}

console.log(`共 ${balanced.length} 个候选，开始逐个核对详情页状态…`);
const verified = (await mapLimit(balanced, 10, async (item, index) => {
  const html = await fetchText(`https://www.pzds.com/goodsDetails/${item.code}/6`, 2);
  const available = !/商品已下架|商品已出售/.test(html);
  if ((index + 1) % 25 === 0) console.log(`核验进度 ${index + 1}/${balanced.length}`);
  return available ? { ...item, images: parseDetailImages(html) } : null;
})).filter(Boolean);

const selected = [];
let round = 0;
while (selected.length < 200) {
  let added = 0;
  for (const game of games) {
    const pool = verified.filter((item) => item.sourceGameId === game.sourceGameId).sort((a, b) => candidateScore(b) - candidateScore(a));
    if (pool[round]) { selected.push(pool[round]); added += 1; if (selected.length === 200) break; }
  }
  if (!added) break;
  round += 1;
}

if (selected.length < 200) throw new Error(`当前核验后只有 ${selected.length} 个有效商品，未用假商品补足。请增加抓取页数后重试。`);

const output = {
  version: 3,
  updatedAt: new Date().toISOString(),
  pricingNote: "精选服务参考价按公开在售参考价上浮30%，包含信息筛选、资料整理与咨询服务；最终库存、实名和换绑条件以客服实时复核为准。",
  sourceAudit: {
    visibleOnFrontend: false,
    verifiedRule: "详情页未出现商品已下架或商品已出售",
    imageRule: "仅展示详情页公开的真实商品截图；不再生成模板占位图",
    selectedCount: selected.length,
    productsWithImages: selected.filter((item) => item.images?.length).length,
    imageCount: selected.reduce((sum, item) => sum + (item.images?.length || 0), 0)
  },
  products: selected.map(buildProduct)
};

await fs.writeFile(dataUrl, `${JSON.stringify(output, null, 2)}\n`, "utf8");
console.log(`同步完成：${output.products.length} 个真实可购买账号，共 ${output.sourceAudit.imageCount} 张真实商品截图。`);
