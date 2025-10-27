# Supabase Google OAuth 配置指南

为了使谷歌登录功能正常工作，您需要在 Supabase 控制台中配置 Google OAuth 提供商。

## 步骤

1. 登录到 [Supabase Dashboard](https://app.supabase.com/)

2. 选择您的项目

3. 导航到 **Authentication** > **Providers**

4. 找到 **Google** 提供商并点击它进行配置

5. 启用 Google 提供商

6. 配置以下信息：
   - **Client ID**: 使用您在 `.env.local` 文件中的 `NEXT_PUBLIC_GOOGLE_CLIENT_ID` 值
     - 当前值: `34770120825-59543sgf8liukns2jed50jm5bhb370d3.apps.googleusercontent.com`
   - **Client Secret**: 您需要从 [Google Cloud Console](https://console.cloud.google.com/) 获取

7. 添加重定向 URL:
   - 在 Google Cloud Console 中，将以下 URL 添加到授权的重定向 URI:
     - `https://[YOUR-PROJECT-ID].supabase.co/auth/v1/callback`
     - 将 `[YOUR-PROJECT-ID]` 替换为您的 Supabase 项目 ID

## 获取 Google Client Secret

如果您还没有 Google Client Secret，请按照以下步骤操作：

1. 访问 [Google Cloud Console](https://console.cloud.google.com/)

2. 选择您的项目或创建一个新项目

3. 导航到 **APIs & Services** > **Credentials**

4. 点击 **Create Credentials** > **OAuth client ID**

5. 选择 **Web application**

6. 添加授权的重定向 URI:
   - `https://[YOUR-PROJECT-ID].supabase.co/auth/v1/callback`

7. 保存并记录您的 Client ID 和 Client Secret

## 注意事项

- 确保 Google OAuth 同意屏幕已配置
- 确保您的应用程序已通过 Google 验证（对于生产环境）
- 对于开发环境，您可以使用测试用户

## 测试

配置完成后，您可以在登录页面测试 Google 登录功能。