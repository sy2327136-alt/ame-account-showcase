(function () {
  const config = window.APP_CONFIG;
  const state = { repo: "", branch: "main", token: "", data: null, dataSha: "", images: [], query: "" };
  const $ = (selector) => document.querySelector(selector);
  const connectPanel = $("[data-connect-panel]");
  const shell = $("[data-admin-shell]");
  const form = $("[data-product-form]");
  const list = $("[data-admin-list]");
  const imageGrid = $("[data-image-grid]");

  function toast(message, error = false) {
    const node = $("[data-toast]");
    node.textContent = message;
    node.style.borderColor = error ? "rgba(255,107,121,.5)" : "rgba(228,185,95,.35)";
    node.classList.add("is-visible");
    setTimeout(() => node.classList.remove("is-visible"), 3200);
  }

  function pathUrl(path) {
    return path.split("/").map(encodeURIComponent).join("/");
  }

  async function github(path, options = {}) {
    const response = await fetch(`https://api.github.com/repos/${state.repo}/contents/${pathUrl(path)}`, {
      ...options,
      headers: { "Accept": "application/vnd.github+json", "Authorization": `Bearer ${state.token}`, "X-GitHub-Api-Version": "2022-11-28", "Content-Type": "application/json", ...(options.headers || {}) }
    });
    if (!response.ok) {
      let detail = "";
      try { detail = (await response.json()).message; } catch {}
      const error = new Error(detail || `GitHub 请求失败 (${response.status})`);
      error.status = response.status;
      throw error;
    }
    return response.status === 204 ? null : response.json();
  }

  function utf8ToBase64(text) {
    const bytes = new TextEncoder().encode(text);
    let binary = "";
    for (let index = 0; index < bytes.length; index += 0x8000) binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
    return btoa(binary);
  }

  function base64ToUtf8(value) {
    const binary = atob(value.replace(/\s/g, ""));
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }

  async function getData() {
    const file = await github(config.dataPath);
    state.dataSha = file.sha;
    state.data = JSON.parse(base64ToUtf8(file.content));
  }

  async function putFile(path, content, sha, message) {
    return github(path, { method: "PUT", body: JSON.stringify({ message, content, branch: state.branch, ...(sha ? { sha } : {}) }) });
  }

  function setProgress(percent, message) {
    const box = $("[data-progress]");
    box.classList.add("is-active");
    $("[data-progress-bar]").style.width = `${percent}%`;
    $("[data-progress-text]").textContent = message;
  }

  function parseSpecs(value) {
    return Object.fromEntries(value.split("\n").map((line) => line.trim()).filter(Boolean).map((line) => {
      const separator = line.includes("=") ? "=" : line.includes("：") ? "：" : ":";
      const index = line.indexOf(separator);
      return index > 0 ? [line.slice(0, index).trim(), line.slice(index + 1).trim()] : [line, "-"];
    }));
  }

  function renderImages() {
    $("[data-image-count]").textContent = `${state.images.length} / 30 张 · 第一张作为封面`;
    imageGrid.innerHTML = state.images.map((item, index) => `<div class="image-item"><img src="${item.src}" alt="商品图 ${index + 1}"><button type="button" data-remove-image="${index}" aria-label="删除">✕</button>${index === 0 ? '<span class="cover-label">封面</span>' : ""}</div>`).join("");
  }

  function resetForm() {
    form.reset();
    form.elements.active.checked = true;
    form.elements.id.value = "";
    state.images = [];
    renderImages();
    $("[data-editor-title]").textContent = "新建商品";
  }

  function renderList() {
    const products = (state.data?.products || []).filter((product) => [product.title, product.gameName, product.subtitle].join(" ").toLowerCase().includes(state.query.toLowerCase()));
    $("[data-product-total]").textContent = `(${state.data?.products?.length || 0})`;
    list.innerHTML = products.length ? products.map((product) => `<tr><td><div class="admin-product"><img src="${product.coverImage}" alt=""><div><strong>${window.GameMarket.escape(product.title)}</strong><span>${window.GameMarket.escape(product.gameName)}</span></div></div></td><td>${product.productType === "account" ? "账号" : "充值"}</td><td>${window.GameMarket.money(product.price)}</td><td><span class="status-pill ${product.status === "active" ? "" : "off"}">${product.status === "active" ? "上架" : "下架"}</span></td><td><div class="row-actions"><button class="icon-btn" data-edit="${product.id}">编辑</button><button class="icon-btn" data-toggle="${product.id}">${product.status === "active" ? "下架" : "上架"}</button><button class="icon-btn danger" data-delete="${product.id}">删除</button></div></td></tr>`).join("") : `<tr><td colspan="5" style="padding:40px;text-align:center;color:var(--muted)">暂无商品</td></tr>`;
  }

  function editProduct(id) {
    const product = state.data.products.find((item) => item.id === id);
    if (!product) return;
    const values = { ...product, priceYuan: product.price / 100, originalPriceYuan: product.originalPrice ? product.originalPrice / 100 : "", tags: (product.tags || []).join(", "), specs: Object.entries(product.specs || {}).map(([key, value]) => `${key}=${value}`).join("\n") };
    Object.entries(values).forEach(([name, value]) => { if (form.elements[name] && !["active", "featured"].includes(name)) form.elements[name].value = value ?? ""; });
    form.elements.active.checked = product.status === "active";
    form.elements.featured.checked = Boolean(product.featured);
    state.images = (product.images?.length ? product.images : [product.coverImage]).filter(Boolean).map((src) => ({ src, pending: false }));
    renderImages();
    $("[data-editor-title]").textContent = "编辑商品";
    if (window.innerWidth < 1050) $("[data-editor-title]").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function saveData(message) {
    state.data.updatedAt = new Date().toISOString();
    const result = await putFile(config.dataPath, utf8ToBase64(JSON.stringify(state.data, null, 2) + "\n"), state.dataSha, message);
    state.dataSha = result.content.sha;
  }

  async function compressImage(file) {
    const bitmap = await createImageBitmap(file);
    const max = 1600;
    const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d", { alpha: false }).drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/webp", .82));
    if (!blob) throw new Error("图片压缩失败");
    const dataUrl = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(blob); });
    return { src: dataUrl, pending: true, base64: dataUrl.split(",")[1], name: file.name.replace(/\.[^.]+$/, "") };
  }

  async function uploadPendingImages(productId) {
    const total = state.images.filter((item) => item.pending).length;
    let done = 0;
    for (const item of state.images) {
      if (!item.pending) continue;
      const safeName = item.name.replace(/[^a-zA-Z0-9\u4e00-\u9fa5_-]+/g, "-").slice(0, 40) || "image";
      const unique = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}-${safeName}.webp`;
      const path = `${config.assetRoot}/${productId}/${unique}`;
      setProgress(10 + Math.round((done / Math.max(total, 1)) * 70), `正在上传图片 ${done + 1} / ${total}…`);
      await putFile(path, item.base64, null, `content: upload image for ${productId}`);
      item.src = `./${path}`;
      item.pending = false;
      delete item.base64;
      done += 1;
    }
  }

  async function connect() {
    const repo = $("[data-connect-repo]").value.trim().replace(/^https?:\/\/github\.com\//, "").replace(/\.git$/, "").replace(/\/$/, "");
    const branch = $("[data-connect-branch]").value.trim() || "main";
    const token = $("[data-connect-token]").value.trim();
    if (!/^[-\w.]+\/[-\w.]+$/.test(repo) || !token) return toast("请填写正确的仓库和令牌", true);
    state.repo = repo; state.branch = branch; state.token = token;
    try {
      const button = $("[data-connect]"); button.disabled = true; button.textContent = "正在连接…";
      await getData();
      sessionStorage.setItem("gfGithubToken", token);
      localStorage.setItem("gfGithubRepo", repo);
      localStorage.setItem("gfGithubBranch", branch);
      connectPanel.style.display = "none"; shell.classList.add("is-connected"); $("[data-disconnect]").style.display = "inline-flex"; $("[data-repo-label]").textContent = `${repo} · ${branch}`;
      renderList(); resetForm(); toast("连接成功");
      button.disabled = false; button.textContent = "连接并进入后台";
    } catch (error) {
      $("[data-connect]").disabled = false; $("[data-connect]").textContent = "连接并进入后台";
      toast(error.status === 401 ? "令牌无效，请检查权限" : `连接失败：${error.message}`, true);
    }
  }

  $("[data-connect]").addEventListener("click", connect);
  $("[data-disconnect]").addEventListener("click", () => { sessionStorage.removeItem("gfGithubToken"); location.reload(); });
  $("[data-new-product]").addEventListener("click", () => { resetForm(); $("[data-editor-title]").scrollIntoView({ behavior: "smooth" }); });
  $("[data-reset-form]").addEventListener("click", resetForm);
  $("[data-admin-search]").addEventListener("input", (event) => { state.query = event.target.value; renderList(); });
  $("#image-upload").addEventListener("change", async (event) => {
    const files = [...event.target.files];
    if (state.images.length + files.length > 30) return toast("每件商品最多上传 30 张图片", true);
    try {
      for (const file of files) { setProgress(3, `正在处理 ${file.name}…`); state.images.push(await compressImage(file)); renderImages(); }
      $("[data-progress]").classList.remove("is-active"); toast(`已加入 ${files.length} 张图片，保存商品后上传`);
    } catch (error) { toast(`图片处理失败：${error.message}`, true); }
    event.target.value = "";
  });
  imageGrid.addEventListener("click", (event) => { const button = event.target.closest("[data-remove-image]"); if (button) { state.images.splice(Number(button.dataset.removeImage), 1); renderImages(); } });
  list.addEventListener("click", async (event) => {
    const edit = event.target.closest("[data-edit]"); if (edit) return editProduct(edit.dataset.edit);
    const toggle = event.target.closest("[data-toggle]");
    if (toggle) { const product = state.data.products.find((item) => item.id === toggle.dataset.toggle); product.status = product.status === "active" ? "inactive" : "active"; try { await saveData(`content: ${product.status === "active" ? "publish" : "unpublish"} ${product.id}`); renderList(); toast("状态已更新，前台约 30-90 秒同步"); } catch (error) { toast(error.message, true); } }
    const remove = event.target.closest("[data-delete]");
    if (remove && confirm("确定删除这个商品吗？商品记录会从前台数据中移除。")) { const product = state.data.products.find((item) => item.id === remove.dataset.delete); state.data.products = state.data.products.filter((item) => item.id !== remove.dataset.delete); try { await saveData(`content: delete ${product.id}`); renderList(); resetForm(); toast("商品已删除"); } catch (error) { toast(error.message, true); } }
  });
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!state.images.length) return toast("请至少上传 1 张商品图片", true);
    const values = Object.fromEntries(new FormData(form));
    const id = values.id || `${values.productType === "account" ? "acc" : "rec"}-${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 5)}`;
    const old = state.data.products.find((item) => item.id === id);
    const button = $("[data-save]"); button.disabled = true;
    try {
      setProgress(5, "准备发布商品…");
      await uploadPendingImages(id);
      const images = state.images.map((item) => item.src);
      const product = { id, productType: values.productType, gameName: values.gameName.trim(), publisher: values.publisher?.trim() || "", title: values.title.trim(), subtitle: values.subtitle?.trim() || "", price: Math.round(Number(values.priceYuan) * 100), originalPrice: values.originalPriceYuan ? Math.round(Number(values.originalPriceYuan) * 100) : 0, platform: values.platform?.trim() || "全平台", server: values.server?.trim() || "全区服", region: values.region?.trim() || "国服", badge: values.badge?.trim() || "", tags: (values.tags || "").split(/[,，]/).map((item) => item.trim()).filter(Boolean), coverImage: images[0], images, description: values.description?.trim() || "", specs: parseSpecs(values.specs || ""), status: form.elements.active.checked ? "active" : "inactive", featured: form.elements.featured.checked, sales: old?.sales || 0, sortOrder: old?.sortOrder || Date.now() };
      if (old) state.data.products[state.data.products.findIndex((item) => item.id === id)] = product; else state.data.products.unshift(product);
      setProgress(88, "正在更新商品数据…");
      await saveData(`content: ${old ? "update" : "add"} ${id}`);
      setProgress(100, "发布完成");
      renderList(); editProduct(id); toast("保存成功，GitHub Pages 约 30-90 秒同步前台");
      setTimeout(() => $("[data-progress]").classList.remove("is-active"), 1800);
    } catch (error) { toast(error.status === 409 ? "数据已被其他窗口更新，请刷新后台后重试" : `保存失败：${error.message}`, true); }
    finally { button.disabled = false; }
  });

  $("[data-connect-repo]").value = localStorage.getItem("gfGithubRepo") || config.repository || "";
  $("[data-connect-branch]").value = localStorage.getItem("gfGithubBranch") || config.branch || "main";
  const rememberedToken = sessionStorage.getItem("gfGithubToken");
  if (rememberedToken && $("[data-connect-repo]").value) { $("[data-connect-token]").value = rememberedToken; connect(); }
})();
