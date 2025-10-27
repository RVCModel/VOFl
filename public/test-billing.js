// 充值中心功能测试脚本
// 在浏览器控制台中运行此脚本进行测试

// 测试充值功能
async function testRecharge() {
  try {
    // 获取当前用户会话
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      console.error('用户未登录')
      return
    }

    const token = session.access_token

    // 测试创建充值记录
    const response = await fetch('/api/billing/recharge', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        amount: 10.00,
        productId: 'test_product'
      })
    })

    if (response.ok) {
      const data = await response.json()
      console.log('充值测试成功:', data)
      console.log('支付链接:', data.checkoutUrl)
    } else {
      const errorData = await response.json()
      console.error('充值测试失败:', errorData)
    }
  } catch (error) {
    console.error('充值测试出错:', error)
  }
}

// 测试获取余额
async function testGetBalance() {
  try {
    // 获取当前用户会话
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      console.error('用户未登录')
      return
    }

    const token = session.access_token

    // 测试获取余额
    const response = await fetch('/api/billing/balance', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })

    if (response.ok) {
      const data = await response.json()
      console.log('余额查询成功:', data)
    } else {
      const errorData = await response.json()
      console.error('余额查询失败:', errorData)
    }
  } catch (error) {
    console.error('余额查询出错:', error)
  }
}

// 测试获取充值记录
async function testGetRechargeRecords() {
  try {
    // 获取当前用户会话
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      console.error('用户未登录')
      return
    }

    const token = session.access_token

    // 测试获取充值记录
    const response = await fetch('/api/billing/recharge', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })

    if (response.ok) {
      const data = await response.json()
      console.log('充值记录查询成功:', data)
    } else {
      const errorData = await response.json()
      console.error('充值记录查询失败:', errorData)
    }
  } catch (error) {
    console.error('充值记录查询出错:', error)
  }
}

// 测试创建提现记录
async function testWithdrawal() {
  try {
    // 获取当前用户会话
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      console.error('用户未登录')
      return
    }

    const token = session.access_token

    // 测试创建提现记录
    const response = await fetch('/api/billing/withdrawal', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        amount: 5.00,
        withdrawalMethod: 'alipay',
        withdrawalAddress: 'test@example.com',
        description: '测试提现'
      })
    })

    if (response.ok) {
      const data = await response.json()
      console.log('提现测试成功:', data)
    } else {
      const errorData = await response.json()
      console.error('提现测试失败:', errorData)
    }
  } catch (error) {
    console.error('提现测试出错:', error)
  }
}

// 测试创建消费记录
async function testConsumption() {
  try {
    // 获取当前用户会话
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      console.error('用户未登录')
      return
    }

    const token = session.access_token

    // 测试创建消费记录
    const response = await fetch('/api/billing/consumption', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        amount: 2.00,
        productType: 'voice_model',
        productId: 'test_model',
        description: '测试消费'
      })
    })

    if (response.ok) {
      const data = await response.json()
      console.log('消费记录创建成功:', data)
    } else {
      const errorData = await response.json()
      console.error('消费记录创建失败:', errorData)
    }
  } catch (error) {
    console.error('消费记录创建出错:', error)
  }
}

// 运行所有测试
async function runAllTests() {
  console.log('开始运行充值中心功能测试...')
  
  console.log('\n1. 测试获取余额...')
  await testGetBalance()
  
  console.log('\n2. 测试创建充值记录...')
  await testRecharge()
  
  console.log('\n3. 测试获取充值记录...')
  await testGetRechargeRecords()
  
  console.log('\n4. 测试创建提现记录...')
  await testWithdrawal()
  
  console.log('\n5. 测试创建消费记录...')
  await testConsumption()
  
  console.log('\n所有测试完成!')
}

// 导出测试函数
window.testRecharge = testRecharge
window.testGetBalance = testGetBalance
window.testGetRechargeRecords = testGetRechargeRecords
window.testWithdrawal = testWithdrawal
window.testConsumption = testConsumption
window.runAllTests = runAllTests

console.log('充值中心测试脚本已加载!')
console.log('使用方法:')
console.log('- testRecharge(): 测试充值功能')
console.log('- testGetBalance(): 测试获取余额')
console.log('- testGetRechargeRecords(): 测试获取充值记录')
console.log('- testWithdrawal(): 测试提现功能')
console.log('- testConsumption(): 测试消费记录')
console.log('- runAllTests(): 运行所有测试')