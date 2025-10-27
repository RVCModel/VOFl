# 充值中心使用说明

## 功能概述

充值中心提供了完整的财务管理功能，包括：
- 账户余额查询
- 在线充值（使用 Creem 支付）
- 提现申请
- 消费记录查询

## 安装步骤

### 1. 数据库设置

首先需要执行以下 SQL 文件创建必要的数据库表：

1. 执行 `database/create_profiles.sql` 创建用户资料表（如果尚未创建）
2. 执行 `database/create_billing_tables.sql` 创建充值中心相关表

### 2. 环境变量配置

复制 `.env.example` 为 `.env.local` 并配置以下环境变量：

```env
# Supabase 环境变量
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Creem 支付环境变量
CREEM_API_KEY=creem_test_4wvuSKN1UijVk2QnN5Bpor

# 数据库连接字符串（用于直接数据库操作，可选）
DATABASE_URL=your_database_url
```

### 3. 安装依赖

确保已安装以下依赖：

```bash
npm install @supabase/supabase-js @creem-tech/creem-sdk
```

## 功能使用

### 充值功能

1. 用户访问 `/billing` 页面
2. 点击"充值"按钮
3. 输入充值金额
4. 系统跳转到 Creem 支付页面
5. 支付完成后，系统会自动更新用户余额

### 提现功能

1. 用户访问 `/billing` 页面
2. 点击"提现"按钮
3. 输入提现金额、提现方式和提现地址
4. 系统会冻结相应金额并创建提现记录
5. 管理员可以在后端审核提现申请

### 消费记录

系统会自动记录用户的消费情况，包括：
- 消费金额
- 产品类型
- 产品ID
- 消费描述
- 消费时间

## API 接口

### 1. 获取用户余额

```
GET /api/billing/balance
```

### 2. 创建充值记录

```
POST /api/billing/recharge
Content-Type: application/json

{
  "amount": 100.00,
  "productId": "product_id"
}
```

### 3. 获取充值记录

```
GET /api/billing/recharge
```

### 4. 创建提现记录

```
POST /api/billing/withdrawal
Content-Type: application/json

{
  "amount": 50.00,
  "withdrawalMethod": "alipay",
  "withdrawalAddress": "user@example.com",
  "description": "提现备注"
}
```

### 5. 获取提现记录

```
GET /api/billing/withdrawal
```

### 6. 创建消费记录

```
POST /api/billing/consumption
Content-Type: application/json

{
  "amount": 10.00,
  "productType": "voice_model",
  "productId": "model_id",
  "description": "购买语音模型"
}
```

### 7. 获取消费记录

```
GET /api/billing/consumption
```

### 8. Creem 支付回调

```
POST /api/billing/webhook
Content-Type: application/json

{
  "type": "checkout.completed",
  "data": {
    "id": "checkout_id",
    "sessionId": "session_id",
    "status": "completed"
  }
}
```

## 组件使用

### BillingCard 组件

在需要显示用户余额的地方使用：

```tsx
import BillingCard from '@/components/billing-card'

<BillingCard className="w-full" />
```

### BillingNavigation 组件

在需要显示充值中心导航的地方使用：

```tsx
import BillingNavigation from '@/components/billing-navigation'

<BillingNavigation />
```

## 安全注意事项

1. 所有 API 接口都需要用户认证
2. 充值和提现操作会验证用户余额
3. 提现操作会冻结相应金额，防止重复提现
4. 使用 RLS (Row Level Security) 确保用户只能访问自己的数据

## 扩展功能

1. 可以添加优惠券功能
2. 可以添加积分系统
3. 可以添加自动充值功能
4. 可以添加余额预警功能

## 故障排除

1. 如果支付失败，请检查 Creem API 密钥是否正确
2. 如果余额不更新，请检查 webhook 回调是否正常
3. 如果数据库操作失败，请检查 Supabase 配置是否正确