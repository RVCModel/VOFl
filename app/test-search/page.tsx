"use client"

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function TestSearchPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSearch = async () => {
    if (!searchQuery.trim()) return
    
    setLoading(true)
    setError(null)
    
    try {
      // 搜索模型 - 分别搜索名称/描述和标签，然后合并结果
      const { data: modelsByName, error: modelsNameError } = await supabase
        .from('models')
        .select('*')
        .eq('visibility', 'public')
        .eq('status', 'published')
        .or(`name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`)
      
      const { data: modelsByTags, error: modelsTagsError } = await supabase
        .from('models')
        .select('*')
        .eq('visibility', 'public')
        .eq('status', 'published')
        .contains('tags', [searchQuery])
      
      if (modelsNameError) {
        console.error('模型名称搜索错误:', modelsNameError)
        throw modelsNameError
      }
      
      if (modelsTagsError) {
        console.error('模型标签搜索错误:', modelsTagsError)
        throw modelsTagsError
      }
      
      // 合并模型结果并去重
      const modelsData = [...(modelsByName || []), ...(modelsByTags || [])].filter((item, index, self) => 
        index === self.findIndex((t) => t.id === item.id)
      )
      
      // 搜索数据集 - 分别搜索名称/描述和标签，然后合并结果
      const { data: datasetsByName, error: datasetsNameError } = await supabase
        .from('datasets')
        .select('*')
        .eq('visibility', 'public')
        .eq('status', 'published')
        .or(`name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`)
      
      const { data: datasetsByTags, error: datasetsTagsError } = await supabase
        .from('datasets')
        .select('*')
        .eq('visibility', 'public')
        .eq('status', 'published')
        .contains('tags', [searchQuery])
      
      if (datasetsNameError) {
        console.error('数据集名称搜索错误:', datasetsNameError)
        throw datasetsNameError
      }
      
      if (datasetsTagsError) {
        console.error('数据集标签搜索错误:', datasetsTagsError)
        throw datasetsTagsError
      }
      
      // 合并数据集结果并去重
      const datasetsData = [...(datasetsByName || []), ...(datasetsByTags || [])].filter((item, index, self) => 
        index === self.findIndex((t) => t.id === item.id)
      )
      
      // 合并所有结果
      const allResults = [
        ...modelsData.map(item => ({ ...item, type: 'model' })),
        ...datasetsData.map(item => ({ ...item, type: 'dataset' }))
      ]
      
      setResults(allResults)
    } catch (err) {
      console.error('搜索错误:', err)
      setError('搜索失败，请查看控制台获取详细信息')
    } finally {
      setLoading(false)
    }
  }

  // 获取所有公开的模型和数据集
  const fetchAllData = async () => {
    setLoading(true)
    setError(null)
    
    try {
      // 获取所有模型
      const { data: modelsData, error: modelsError } = await supabase
        .from('models')
        .select('*')
        .eq('visibility', 'public')
        .eq('status', 'published')
        .limit(10)
      
      if (modelsError) {
        console.error('获取模型错误:', modelsError)
        throw modelsError
      }
      
      // 获取所有数据集
      const { data: datasetsData, error: datasetsError } = await supabase
        .from('datasets')
        .select('*')
        .eq('visibility', 'public')
        .eq('status', 'published')
        .limit(10)
      
      if (datasetsError) {
        console.error('获取数据集错误:', datasetsError)
        throw datasetsError
      }
      
      // 合并结果
      const allResults = [
        ...(modelsData || []).map(item => ({ ...item, type: 'model' })),
        ...(datasetsData || []).map(item => ({ ...item, type: 'dataset' }))
      ]
      
      setResults(allResults)
    } catch (err) {
      console.error('获取数据错误:', err)
      setError('获取数据失败，请查看控制台获取详细信息')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">搜索测试页面</h1>
      
      <div className="mb-6 space-y-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="输入搜索关键词"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
          />
          <button
            onClick={handleSearch}
            disabled={loading}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? '搜索中...' : '搜索'}
          </button>
          <button
            onClick={fetchAllData}
            disabled={loading}
            className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50"
          >
            {loading ? '获取中...' : '获取所有数据'}
          </button>
        </div>
        
        {error && (
          <div className="p-3 bg-red-100 text-red-700 rounded-md">
            {error}
          </div>
        )}
      </div>
      
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">搜索结果 ({results.length})</h2>
        
        {results.length === 0 ? (
          <p>没有找到结果</p>
        ) : (
          <div className="space-y-4">
            {results.map((item) => (
              <div key={item.id} className="p-4 border border-gray-200 rounded-md">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold">{item.name}</h3>
                    <p className="text-sm text-gray-600">类型: {item.type}</p>
                    <p className="text-sm text-gray-600">ID: {item.id}</p>
                    {item.description && (
                      <p className="text-sm text-gray-700 mt-2">{item.description}</p>
                    )}
                    {item.tags && item.tags.length > 0 && (
                      <div className="mt-2">
                        <span className="text-sm text-gray-600">标签: </span>
                        {item.tags.map((tag: string, index: number) => (
                          <span key={index} className="inline-block px-2 py-1 text-xs bg-gray-100 rounded-md mr-1">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}