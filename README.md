# DEEPTECH+ 企业家的科学社区

静态 GitHub Pages 网站，使用相对路径发布。

## 发布内容

- 年度会员全球招募与申请意向表单
- TR35 科学家资料卡与机构公开来源
- 非常深科技视频入口
- DeepTech 生态项目、会员权益与公开资讯流
- “联络我们”页面（黄师傅为会员服务负责人）
- 会员服务真实对接会案例与优先观看视频序列

原始 PDF、PPT、视频和表格仅作为本地资料库保留，不会随网站发布；网站只包含经过筛选的页面与图片资源。


## 上海人工智能大会专题自动更新

- 专题页：`waic.html`
- 直播专题页：`waic-live.html`
- 数据文件：`data/waic-briefing.json`
- 生成脚本：`automation/waic_briefing.py`
- 定时任务：`.github/workflows/waic-briefing.yml`

GitHub Actions 会按 `*/30 * * * *` 尝试每 30 分钟运行一次，抓取公开搜索源和可访问页面，生成专题页读取的图文简报数据。若要提高自媒体平台覆盖率，可以后续补充固定账号清单、RSS 源或商业搜索 API。
