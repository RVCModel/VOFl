'use client'

import { useState } from 'react'
import { S3Client, CreateMultipartUploadCommand, UploadPartCommand, CompleteMultipartUploadCommand, AbortMultipartUploadCommand } from '@aws-sdk/client-s3'

interface DirectUploadOptions {
  file: File
  fileType: string
  apiFileType: string
  accessToken: string
  onProgress: (progress: number) => void
  onComplete: (url: string) => void
  onError: (error: Error) => void
  onCancel: () => void
}

export function useDirectUpload() {
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle')

  // 初始化直接上传
  const initDirectUpload = async (options: DirectUploadOptions) => {
    const { file, fileType, apiFileType, accessToken, onProgress, onComplete, onError, onCancel } = options
    
    try {
      setUploading(true)
      setUploadStatus('uploading')
      setUploadProgress(0)

      // 计算分块数量（每个分块至少5MB以满足R2要求）
      const chunkSize = 5 * 1024 * 1024 // 5MB
      const totalChunks = Math.ceil(file.size / chunkSize)

      // 1. 初始化多部分上传
      const initResponse = await fetch('/api/upload-r2-direct', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          totalChunks
        })
      })

      if (!initResponse.ok) {
        throw new Error('Failed to initialize upload')
      }

      const { uploadId, key, endpoint, bucket, region, accessKeyId, secretAccessKey } = await initResponse.json()

      // 2. 创建S3客户端
      const s3Client = new S3Client({
        region,
        endpoint,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      })

      // 3. 上传分块
      const parts = []
      let abortController = new AbortController()

      for (let partNumber = 1; partNumber <= totalChunks; partNumber++) {
        const start = (partNumber - 1) * chunkSize
        const end = Math.min(start + chunkSize, file.size)
        const chunk = file.slice(start, end)

        // 检查是否已取消
        if (abortController.signal.aborted) {
          throw new Error('Upload cancelled by user')
        }

        // 上传分块
        const uploadPartCommand = new UploadPartCommand({
          Bucket: bucket,
          Key: key,
          UploadId: uploadId,
          PartNumber: partNumber,
          Body: chunk,
        })

        const partResult = await s3Client.send(uploadPartCommand)
        
        parts.push({
          PartNumber: partNumber,
          ETag: partResult.ETag,
        })

        // 更新进度
        const progress = Math.round((partNumber / totalChunks) * 100)
        setUploadProgress(progress)
        onProgress(progress)
      }

      // 4. 完成多部分上传
      const completeCommand = new CompleteMultipartUploadCommand({
        Bucket: bucket,
        Key: key,
        UploadId: uploadId,
        MultipartUpload: {
          Parts: parts,
        },
      })

      const result = await s3Client.send(completeCommand)

      // 5. 通知完成
      const publicUrl = `${process.env.NEXT_PUBLIC_R2_PUBLIC_URL}/${key}`
      setUploadStatus('success')
      setUploadProgress(100)
      onComplete(publicUrl)

      return { success: true, url: publicUrl }
    } catch (error) {
      console.error('Direct upload error:', error)
      setUploadStatus('error')
      onError(error instanceof Error ? error : new Error('Unknown error'))
      
      // 如果是上传过程中的错误，尝试取消上传
      if (uploadId && key) {
        try {
          await fetch('/api/upload-r2-direct', {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({ uploadId, key })
          })
        } catch (cancelError) {
          console.error('Failed to cancel upload:', cancelError)
        }
      }
      
      return { success: false, error }
    } finally {
      setUploading(false)
    }
  }

  // 取消上传
  const cancelUpload = async () => {
    // 这里我们需要实现取消逻辑
    // 由于我们在函数内部创建了abortController，我们需要将它暴露出来
    // 这是一个简化版本，实际实现可能需要更复杂的状态管理
    setUploadStatus('idle')
    setUploadProgress(0)
    setUploading(false)
  }

  return {
    initDirectUpload,
    cancelUpload,
    uploading,
    uploadProgress,
    uploadStatus
  }
}