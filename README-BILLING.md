# 充值中心

这是一个基于 Next.js 和 Supabase 的充值中心系统，集成了 Creem 支付功能，提供完整的财务管理解决方案。

## 功能特点

- ✅ **账户余额管理** - 实时查询用户余额和冻结余额
- ✅ **在线充值** - 集成 Creem 支付，支持多种支付方式
- ✅ **提现申请** - 用户可以申请提现，支持多种提现方式
- ✅ **消费记录** - 自动记录用户消费情况
- ✅ **安全认证** - 基于 Supabase Auth 的用户认证系统
- ✅ **响应式设计** - 适配各种设备屏幕

## 技术栈

- **前端**: Next.js 14, React, TypeScript, Tailwind CSS
- **后端**: Next.js API Routes, Supabase
- **数据库**: Supabase (PostgreSQL)
- **支付**: Creem 支付系统
- **UI组件**: Shadcn/ui

## 项目结构

```
app/
├── api/billing/          # 充值中心API接口
│   ├── balance/          # 用户余额API
│   ├── consumption/      # 消费记录API
│   ├── recharge/         # 充值API
│   ├── webhook/          # 支付回调API
│   └── withdrawal/       # 提现API
├── billing/              # 充值中心页面
│   ├── cancel/           # 充值取消页面
│   ├── success/          # 充值成功页面
│   ├── layout.tsx        # 充值中心布局
│   └── page.tsx          # 充值中心主页
components/
├── billing-card.tsx      # 余额卡片组件
└── billing-navigation.tsx # 充值中心导航组件
database/
└── create_billing_tables.sql # 数据库表结构
docs/
└── billing-center.md     # 详细使用说明
public/
└── test-billing.js       # 功能测试脚本
```

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 环境配置

复制 `.env.example` 为 `.env.local` 并配置环境变量：

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
CREEM_API_KEY=creem_test_4wvuSKN1UijVk2QnN5Bpor
```

### 3. 数据库设置

在 Supabase 中执行以下 SQL 文件：

1. `database/create_profiles.sql` - 用户资料表
2. `database/create_billing_tables.sql` - 充值中心相关表

### 4. 运行项目

```bash
npm run dev
```

访问 `http://localhost:3000/billing` 查看充值中心。

## API 接口

### 用户余额
- `GET /api/billing/balance` - 获取用户余额

### 充值功能
- `POST /api/billing/recharge` - 创建充值记录
- `GET /api/billing/recharge` - 获取充值记录

### 提现功能
- `POST /api/billing/withdrawal` - 创建提现记录
- `GET /api/billing/withdrawal` - 获取提现记录

### 消费记录
- `POST /api/billing/consumption` - 创建消费记录
- `GET /api/billing/consumption` - 获取消费记录

### 支付回调
- `POST /api/billing/webhook` - Creem 支付回调处理

## 组件使用

### BillingCard

显示用户余额和快捷操作按钮：

```tsx
import BillingCard from '@/components/billing-card'

<BillingCard className="w-full" />
```

### BillingNavigation

充值中心导航组件：

```tsx
import BillingNavigation from '@/components/billing-navigation'

<BillingNavigation />
```

## 测试

在浏览器控制台中加载测试脚本：

```javascript
// 在控制台中执行
fetch('/test-billing.js').then(r => r.text()).then(eval)
```

然后运行测试：

```javascript
// 运行所有测试
runAllTests()

// 或单独运行测试
testRecharge()
testGetBalance()
testWithdrawal()
testConsumption()
```

## 安全性

- 所有 API 接口都需要用户认证
- 使用 RLS (Row Level Security) 确保数据安全
- 提现操作会冻结相应金额，防止重复提现
- 支付回调验证确保交易安全

## 许可证

MIT License

## 支持

如有问题或建议，请提交 Issue 或 Pull Request。