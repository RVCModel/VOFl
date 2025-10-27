import { createServerClient } from '@/lib/supabase-server'
import { NextResponse, NextRequest } from 'next/server'

// 创建Supabase客户端
const supabase = createServerClient()

/**
 * Webhook Response Interface
 * 
 * Represents the structure of incoming webhook events from Creem.
 */
export interface WebhookResponse {
  id: string;
  eventType: string;
  object: {
    request_id: string;
    object: string;
    id: string;
    customer: {
      id: string;
    };
    product: {
      id: string;
      billing_type: string;
    };
    status: string;
    metadata: any;
  };
}

/**
 * POST /api/billing/webhook
 * 
 * Processes incoming webhook events from Creem's payment system.
 * Handles both one-time payments and subscription lifecycle events.
 * 
 * Event Types Handled:
 * 1. One-Time Payments:
 *    - checkout.completed: Payment successful, fulfill purchase
 * 
 * @async
 * @function
 * @param {NextRequest} req - Incoming webhook request containing event data
 * @returns {Promise<NextResponse>} Confirmation of webhook processing
 */
export async function POST(req: NextRequest) {
  try {
    const webhook = (await req.json()) as WebhookResponse;
    
    // 添加日志以调试
    console.log('收到webhook事件:', JSON.stringify(webhook, null, 2));

    // Determine payment type based on billing_type
    const isSubscription = webhook.object.product.billing_type === "recurring";

    if (!isSubscription) {
      /**
       * One-Time Payment Flow
       * --------------------
       * 1. Verify payment completion via checkout.completed event
       * 2. Extract recharge ID from request_id (set during checkout)
       * 3. Update recharge record status to completed
       */
      if (webhook.eventType === "checkout.completed") {
        console.log('处理checkout.completed事件');
        const rechargeId = webhook.object.request_id;
        const paymentId = webhook.object.id;
        const providerCustomerId = webhook.object.customer.id;
        
        console.log(`充值ID: ${rechargeId}, 支付ID: ${paymentId}, 客户ID: ${providerCustomerId}`);
        
        // 获取充值记录信息
        const { data: rechargeRecord, error: rechargeError } = await supabase
          .from('recharge_records')
          .select('*')
          .eq('id', rechargeId)
          .single();
          
        if (rechargeError || !rechargeRecord) {
          console.error('获取充值记录失败:', rechargeError);
          return NextResponse.json({ error: '获取充值记录失败' }, { status: 500 });
        }
        
        console.log('找到充值记录:', rechargeRecord);
        
        // 更新充值记录状态为已完成
        const { error: updateError } = await supabase
          .from('recharge_records')
          .update({
            status: 'completed',
            payment_id: paymentId,
            updated_at: new Date().toISOString()
          })
          .eq('id', rechargeId);
          
        if (updateError) {
          console.error('更新充值记录失败:', updateError);
          return NextResponse.json({ error: '更新充值记录失败' }, { status: 500 });
        }
        
        console.log('充值记录状态已更新为completed');
        
        // 更新用户余额
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('credits')
          .eq('id', rechargeRecord.user_id)
          .single();
          
        if (profileError) {
          console.error('获取用户余额失败:', profileError);
          return NextResponse.json({ error: '获取用户余额失败' }, { status: 500 });
        }
        
        const newCredits = (profile.credits || 0) + rechargeRecord.amount;
        
        const { error: updateCreditsError } = await supabase
          .from('profiles')
          .update({
            credits: newCredits,
            updated_at: new Date().toISOString()
          })
          .eq('id', rechargeRecord.user_id);
          
        if (updateCreditsError) {
          console.error('更新用户余额失败:', updateCreditsError);
          return NextResponse.json({ error: '更新用户余额失败' }, { status: 500 });
        }
        
        console.log(`充值记录 ${rechargeId} 已完成，用户 ${rechargeRecord.user_id} 余额增加 ${rechargeRecord.amount}，新余额: ${newCredits}`);
      } else {
        console.log(`忽略事件类型: ${webhook.eventType}`);
      }
    }

    // Confirm webhook processing
    return NextResponse.json({
      success: true,
      message: "Webhook received successfully",
    });
  } catch (error) {
    console.error("Error processing webhook:", error);
    return NextResponse.json(
      { error: "Failed to process webhook" },
      { status: 500 }
    );
  }
}