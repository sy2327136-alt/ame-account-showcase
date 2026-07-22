# GF 游戏典藏馆

无需自有服务器的游戏账号与游戏充值展示站。前台使用 GitHub Pages，商品数据和图片保存在同一个 GitHub 仓库，独立后台通过 GitHub API 更新内容。

## 页面

- `index.html`：首页
- `accounts.html`：游戏账号专区
- `recharge.html`：游戏充值专区
- `admin.html`：独立商品后台

## 第一次发布

1. 创建一个公开 GitHub 仓库，把本目录全部内容推送到 `main` 分支。
2. 进入仓库 `Settings → Pages`，在 `Build and deployment` 中选择 `GitHub Actions`。
3. 等待 Actions 中的 `Deploy GitHub Pages` 完成，访问 `https://用户名.github.io/仓库名/`。
4. 打开 `admin.html`，填写 `用户名/仓库名` 和 Fine-grained personal access token。

GitHub Pages 在公开仓库中可免费使用。项目工作流依据 GitHub 官方 Pages Actions 方式部署。

## 后台令牌权限

创建 Fine-grained personal access token 时：

- Repository access：只选择本商品仓库。
- Repository permissions → Contents：Read and write。
- 不需要开放账号、组织或其他仓库权限。

令牌只写入浏览器的 `sessionStorage`，不会进入仓库；关闭后台标签页后会清除。不要在聊天、截图或商品信息中公开令牌。

## 商品与图片

- 商品数据：`data/products.json`
- 商品图片：`assets/products/商品ID/`
- 单商品最多 30 张图。
- 后台会把图片在浏览器中压缩为最长边 1600px 的 WebP，减少仓库体积和手机流量。
- 后台每次保存都会提交到 GitHub；Pages 通常在约 30–90 秒后更新。

## 重要说明

- 公开展示站应使用公开仓库，因此商品 JSON 和商品图片也是公开资源，不要上传身份证、密码、密保、二维码私钥等敏感信息。
- GitHub Pages 是静态托管，不处理付款；本站定位为展示与客服咨询。
- 客服微信：`GF999314`
- 管理邮箱：`sy2327136@gmail.com`
