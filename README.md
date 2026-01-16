# PostGo

一个现代化的 API 测试工具，使用 Go + Wails + React 构建，提供类似 Postman 的完整功能。

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Go Version](https://img.shields.io/badge/Go-1.21+-00ADD8?logo=go)
![Wails Version](https://img.shields.io/badge/Wails-v2.11.0-00ADD8)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)

![img='screenshot]([https://github.com/space08/postgo/master/screenshots/01.png)']
## ✨ 功能特性

### 核心功能
- ✅ **完整的 HTTP 方法支持** - GET, POST, PUT, DELETE, PATCH 等
- ✅ **请求构建器** - Query Parameters, Headers, Body (JSON/Form/Raw/Binary)
- ✅ **认证支持** - Basic Auth, Bearer Token, OAuth 2.0 (三种授权流程)
- ✅ **环境变量** - 支持 `{{variable}}` 语法，多环境切换
- ✅ **脚本系统** - Pre-request & Post-request Scripts，Postman-like API
- ✅ **测试框架** - 内置 `pm.test()` 和 `expect()` 断言库
- ✅ **集合运行器** - 批量执行请求，统计测试结果
- ✅ **项目管理** - 按项目组织 API，支持 Base URL
- ✅ **历史记录** - 自动保存请求历史，支持搜索

### 高级功能
- 🔐 **OAuth 2.0** - Authorization Code, Client Credentials, Password 三种授权模式
- 📝 **JavaScript 脚本** - 基于 goja 运行时，支持环境变量读写、测试编写
- 🧪 **自动化测试** - 响应断言、JSON 解析、状态码验证
- 🌍 **环境管理** - 开发/测试/生产环境隔离，变量持久化
- 📦 **数据导入导出** - 完整的备份/恢复机制
- 🔍 **OpenAPI 导入** - 支持导入 Swagger/OpenAPI 规范
- 🎯 **Token 管理** - 全局 Token 存储，快速应用到请求

### 用户体验
- 🎨 **现代化 UI** - 暗色主题，响应式设计
- ⚡ **高性能** - 原生应用，启动快速
- 🗂️ **多标签页** - 支持拖拽排序，右键菜单
- 💾 **自动保存** - 标签页状态持久化
- 🖱️ **快捷键** - Ctrl+S 保存, Ctrl+Enter 发送, Ctrl+W 关闭标签

## 🏗️ 技术栈

### 后端
- **Go 1.21+** - 核心业务逻辑
- **Wails v2.11.0** - 桌面应用框架
- **goja** - JavaScript 脚本引擎
- **OAuth 2.0 库** - 授权流程实现

### 前端
- **React 18** - UI 框架
- **TypeScript** - 类型安全
- **Tailwind CSS** - 样式系统
- **Lucide React** - 图标库
- **Vite** - 构建工具

### 数据存储
- **JSON 文件** - 本地存储 (~/.postgo/)
  - `requests.json` - 请求数据
  - `projects.json` - 项目数据
  - `environments.json` - 环境变量
  - `history.json` - 历史记录
  - `tokens.json` - Token 数据
  - `tabs.json` - 标签页状态

## 📦 安装

### 从源码构建

**前置要求**
- Go 1.21+
- Node.js 18+
- Wails CLI v2.11.0

```bash
# 安装 Wails CLI
go install github.com/wailsapp/wails/v2/cmd/wails@latest

# 克隆仓库
git clone https://github.com/space08/postgo.git
cd postgo/postgo

# 构建应用
wails build

# 运行应用
./build/bin/postgo.exe  # Windows
./build/bin/postgo      # Linux/macOS
```

### 开发模式

```bash
# 运行开发服务器（热重载）
wails dev

# 访问浏览器开发工具
# http://localhost:34115
```

## 🚀 快速开始

### 1. 创建项目

点击左侧边栏的 **➕ New Project**，输入项目名称和 Base URL（可选）。

### 2. 发送第一个请求

1. 点击 **➕** 创建新标签页
2. 选择 HTTP 方法（GET/POST/PUT/DELETE）
3. 输入 URL：`https://jsonplaceholder.typicode.com/posts/1`
4. 点击 **Send** 或按 `Ctrl+Enter`
5. 查看响应结果（Body, Headers, Cookies, Tests）

### 3. 使用环境变量

**创建环境**
1. 点击顶部工具栏的 **🌍 Environment**
2. 创建新环境 `Development`
3. 添加变量：`baseUrl` = `https://api.example.com`
4. 设置为 Active

**使用变量**
```
URL: {{baseUrl}}/users
Headers:
  Authorization: Bearer {{authToken}}
```

### 4. 编写测试脚本

**Pre-request Script**
```javascript
// 设置动态参数
pm.environment.set("timestamp", Date.now());
console.log("Request starting...");
```

**Post-request Script (Tests)**
```javascript
// 测试状态码
pm.test("Status is 200", function() {
    expect(pm.response).to.have.status(200);
});

// 解析响应并保存 token
const data = pm.response.json();
pm.environment.set("authToken", data.token);
console.log("Token saved:", data.token);

// 测试响应数据
pm.test("Response has user data", function() {
    const user = pm.response.json();
    expect(user.id).to.not.be.undefined;
    expect(user.name).to.not.be.undefined;
});
```

### 5. OAuth 2.0 授权

**Authorization Code 流程**
1. 进入 **Auth** 标签，选择 `OAuth 2.0`
2. Grant Type: `Authorization Code`
3. 填写：
   - Authorization URL: `https://oauth.example.com/authorize`
   - Token URL: `https://oauth.example.com/token`
   - Client ID: `your-client-id`
   - Client Secret: `your-client-secret`
   - Scope: `read write`
4. 点击 **开始授权** - 浏览器打开授权页
5. 授权成功后复制 code，粘贴到输入框
6. 点击 **获取令牌** - Access Token 自动填充

### 6. 运行集合

1. 在项目卡片上点击 ▶️ 图标
2. 查看批量执行结果：
   - 总测试数 / 通过 / 失败
   - 每个请求的状态码和耗时
   - 测试详情和错误信息

## 📖 功能详解

### 请求编辑器

**Params 标签**
- 添加 Query Parameters
- 自动 URL 编码
- 启用/禁用控制

**Headers 标签**
- 自定义 HTTP 头
- 常用 Header 快速选择
- Content-Type 自动设置

**Body 标签**
支持 4 种格式：
- **JSON** - 语法高亮编辑器
- **Form Data** - application/x-www-form-urlencoded
- **Raw** - 纯文本
- **Binary** - 文件上传

**Auth 标签**
- **None** - 无认证
- **Basic Auth** - 用户名/密码
- **Bearer Token** - Token 认证
- **OAuth 2.0** - 完整的 OAuth 流程

**Scripts 标签**
- **Pre-request Script** - 请求前执行
- **Post-request Script** - 响应后执行
- 完整的 Postman API 兼容性

### 脚本 API 参考

#### pm.environment
```javascript
pm.environment.get(key)           // 获取环境变量
pm.environment.set(key, value)    // 设置环境变量（持久化）
```

#### pm.request
```javascript
pm.request.url                    // 请求 URL
pm.request.method                 // HTTP 方法
pm.request.headers                // 请求头对象
```

#### pm.response（仅 Post-request）
```javascript
pm.response.code                  // 状态码 (200, 404, etc.)
pm.response.status                // 状态文本 ("OK", "Not Found")
pm.response.headers               // 响应头对象
pm.response.responseTime          // 响应时间 (ms)
pm.response.responseSize          // 响应大小 (bytes)
pm.response.text()                // 获取文本内容
pm.response.json()                // 解析 JSON 响应
```

#### pm.test()
```javascript
pm.test("测试名称", function() {
    // 断言逻辑
    expect(pm.response).to.have.status(200);
});
```

#### expect() 断言
```javascript
expect(pm.response).to.have.status(200)              // 状态码断言
expect(pm.response.json().data).to.not.be.undefined  // 数据存在性
```

#### console.log()
```javascript
console.log(message)              // 输出到 Tests 标签的 Console 区域
console.log("User ID:", userId)
```

### 项目管理

**Base URL 功能**
- 项目级别设置 Base URL
- 请求中使用相对路径
- 示例：
  ```
  Project Base URL: https://api.example.com
  Request URL: /users/123
  实际请求: https://api.example.com/users/123
  ```

**项目组织**
- 每个项目独立的请求集合
- 支持编辑、删除项目
- 项目卡片显示请求数量

### 数据导入导出

**导出**
1. 点击顶部 **📥 Export**
2. 选择保存位置
3. 生成包含所有数据的 JSON 文件

**导入**
1. 点击顶部 **📤 Import**
2. 选择备份文件
3. 自动恢复所有数据（Projects, Requests, Environments, Tokens, History）

**OpenAPI 导入**
1. 准备 `openapi.json` 或 `openapi.yaml`
2. 使用 Import OpenAPI 功能
3. 自动生成项目和请求

## ⌨️ 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Ctrl + S` | 保存当前请求 |
| `Ctrl + Enter` | 发送请求 |
| `Ctrl + W` | 关闭当前标签 |
| `Ctrl + T` | 新建标签 |
| 右键标签 | 显示上下文菜单 |
| 拖拽标签 | 调整标签顺序 |

## 🔧 配置文件

所有数据存储在 `~/.postgo/` 目录：

```
~/.postgo/
├── requests.json        # 所有请求定义
├── projects.json        # 项目列表
├── environments.json    # 环境变量（包含 activeEnvironmentId）
├── history.json         # 请求历史（最多 1000 条）
├── tokens.json          # 全局 Token
└── tabs.json            # 标签页状态
```

**环境变量文件格式**
```json
{
  "environments": [
    {
      "id": "env-xxx",
      "name": "Development",
      "variables": {
        "baseUrl": "https://dev.api.example.com",
        "authToken": "dev-token-xxx"
      }
    }
  ],
  "activeEnvironmentId": "env-xxx"
}
```

## 🛠️ 开发指南

### 项目结构

```
postgo/
├── app.go                  # 主应用逻辑
├── http_client.go          # HTTP 客户端
├── script_runner.go        # JavaScript 脚本引擎
├── oauth2_handler.go       # OAuth 2.0 实现
├── collection_runner.go    # 集合运行器
├── models.go               # 数据模型
├── *_storage.go            # 数据持久化层
├── frontend/
│   ├── src/
│   │   ├── App.tsx                    # 主应用组件
│   │   ├── components/
│   │   │   ├── RequestEditor.tsx      # 请求编辑器
│   │   │   ├── ResponseViewer.tsx     # 响应查看器
│   │   │   ├── ProjectSidebar.tsx     # 项目侧边栏
│   │   │   ├── EnvironmentManager.tsx # 环境管理器
│   │   │   ├── CollectionRunner.tsx   # 集合运行器
│   │   │   └── ...
│   │   └── types.ts                   # TypeScript 类型定义
│   └── wailsjs/                       # Wails 生成的绑定
└── wails.json              # Wails 配置
```

### 添加新功能

1. **后端** - 在 `app.go` 中添加方法（公开方法会自动绑定到前端）
2. **前端** - 从 `wailsjs/go/main/App` 导入并调用
3. **数据模型** - 在 `models.go` 中定义结构体
4. **持久化** - 创建对应的 `*_storage.go` 文件

### 调试

**后端调试**
```go
fmt.Printf("Debug: %+v\n", data)  // 输出到控制台
```

**前端调试**
```javascript
console.log("Debug:", data);      // 浏览器控制台
```

**Wails 开发工具**
- 运行 `wails dev`
- 访问 http://localhost:34115
- 在浏览器中调用 Go 方法

### 构建发布

**Windows**
```bash
wails build                    # 默认 Windows 可执行文件
```

**Linux**
```bash
wails build -platform linux/amd64
```

**macOS**
```bash
wails build -platform darwin/amd64
```

**跨平台构建**
```bash
wails build -platform windows/amd64,linux/amd64,darwin/amd64
```

## 🤝 贡献指南

欢迎贡献代码！请遵循以下步骤：

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

### 代码规范
- Go 代码遵循 `gofmt` 格式
- TypeScript/React 使用 ESLint + Prettier
- 提交信息使用语义化格式

## 📝 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件

## 🙏 致谢

- [Wails](https://wails.io/) - 优秀的桌面应用框架
- [goja](https://github.com/dop251/goja) - 纯 Go 实现的 JavaScript 引擎
- [Postman](https://www.postman.com/) - API 测试工具的灵感来源

## 📞 联系方式

- 问题反馈：[GitHub Issues](https://github.com/yourusername/postgo/issues)
- 功能建议：[GitHub Discussions](https://github.com/yourusername/postgo/discussions)

---

**⭐ 如果这个项目对你有帮助，请给个星标支持！**
