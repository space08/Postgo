# PostGo 待增强功能列表 (TODO)

## 1. 核心功能增强

- [x] **请求的保存/更新 (Request Save/Update)** ✅
  - [x] 在 `RequestEditor` 中添加"保存"按钮。
  - [x] 实现后端 `UpdateRequest` 接口，支持将修改后的请求参数回写到 `requests.json`。
  - [x] 处理请求重命名和元数据更新。

- [x] **环境变量系统 (Environment Variables)** ✅
  - [x] 实现全局和项目级别的环境变量管理 UI。
  - [x] 支持 `{{variable}}` 语法替换。
  - [x] 在 `SendRequest` 逻辑中增加环境变量解析步骤（URL, Headers, Body）。

- [x] **高级认证支持 (Advanced Authentication)** ✅
  - [x] UI 新增 Auth 选项卡。
  - [x] 支持 OAuth 2.0 授权流程。
  - [x] 支持 Basic Auth 和 Bearer Token 的快捷配置。

## 2. 自动化与测试

- [x] **脚本支持 (Scripting)** ✅
  - [x] Pre-request Script: 请求前运行的脚本（如生成签名）。
  - [x] Post-request Script (Tests): 响应后运行的脚本（如提取 Token）。
  - [x] 集成简单的 JS 运行时 (如 goja)。

- [x] **集合运行器 (Collection Runner)** ✅
  - [x] 实现"运行项目"功能，按顺序执行项目中的所有 API。
  - [x] 生成简单的测试报告（成功/失败统计）。

## 3. 用户体验优化

- [x] **请求/响应多标签页增强** ✅
  - [x] 支持标签页拖拽排序。
  - [x] 记住标签页状态（重启后恢复）。

- [x] **快捷键支持** ✅
  - [x] `Ctrl+S` 保存请求。
  - [x] `Ctrl+Enter` 发送请求。
  - [x] `Ctrl+W` 关闭标签页。
  - [x] `Ctrl+T` 新建标签页。

## 4. 数据与存储

- [x] **数据备份与迁移** ✅
  - [x] 提供一键备份所有数据（History, Projects, Requests, Tokens, Environments, Tabs）的功能。
  - [x] 支持数据导入恢复。

---

## 已完成的额外功能

- [x] **响应显示增强**
  - [x] Cookies 标签页，解析 Set-Cookie 头
  - [x] Body 视图的 Formatted/Raw 切换

- [x] **Tab 状态持久化**
  - [x] 自动保存打开的标签页（带防抖）
  - [x] 应用启动时恢复标签页状态

- [x] **数据导出/导入**
  - [x] 使用系统文件对话框
  - [x] JSON 格式完整数据备份

- [x] **脚本支持 (Pre-request & Post-request Scripts)**
  - [x] Pre-request Script 编辑器
  - [x] Post-request Script (Tests) 编辑器
  - [x] JavaScript 运行时集成 (goja)
  - [x] Postman-like pm API (environment, request, response, test)
  - [x] 测试结果展示 (Tests标签页)
  - [x] Console.log 输出显示
  - [x] 断言和测试状态 (Passed/Failed)

- [x] **OAuth 2.0 完整支持**
  - [x] Authorization Code 授权码模式
  - [x] Client Credentials 客户端凭证模式
  - [x] Password 密码模式
  - [x] 令牌刷新功能
  - [x] 浏览器授权流程集成

- [x] **集合运行器 (Collection Runner)**
  - [x] 批量执行项目中的所有请求
  - [x] 实时显示执行进度
  - [x] 测试结果统计（通过/失败）
  - [x] 执行时间统计
  - [x] 详细的错误信息展示

- [x] **标签页拖拽排序**
  - [x] HTML5 Drag & Drop API 实现
  - [x] 可视化拖拽指示器
  - [x] 拖拽过程中的透明度反馈
