"use client"

import * as React from "react"
import { Play, Pause } from "lucide-react"
import { cn } from "@/lib/utils"

interface AudioCardProps {
  title: string
  imageUrl: string
  audioUrl: string
  views?: string
  likes?: string
  className?: string
}

export function AudioCard({ title, imageUrl, audioUrl, views, likes, className }: AudioCardProps) {
  const [isPlaying, setIsPlaying] = React.useState(false)
  const [audioElement, setAudioElement] = React.useState<HTMLAudioElement | null>(null)
  const [progress, setProgress] = React.useState(0)
  const [audioData, setAudioData] = React.useState<number[]>([])
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const animationRef = React.useRef<number>()
  const audioContextRef = React.useRef<AudioContext | null>(null)
  const analyserRef = React.useRef<AnalyserNode | null>(null)
  
  React.useEffect(() => {
    const audio = new Audio(audioUrl)
    setAudioElement(audio)
    
    // 创建音频上下文和分析器
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    audioContextRef.current = audioContext
    const analyser = audioContext.createAnalyser()
    analyserRef.current = analyser
    analyser.fftSize = 64
    
    const source = audioContext.createMediaElementSource(audio)
    source.connect(analyser)
    analyser.connect(audioContext.destination)
    
    audio.addEventListener("timeupdate", () => {
      const currentProgress = (audio.currentTime / audio.duration) * 100
      setProgress(currentProgress)
    })
    
    audio.addEventListener("ended", () => {
      setIsPlaying(false)
      setProgress(0)
      cancelAnimationFrame(animationRef.current!)
    })
    
    return () => {
      audio.pause()
      audio.src = ""
      audio.removeEventListener("timeupdate", () => {})
      audio.removeEventListener("ended", () => {})
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
    }
  }, [audioUrl])
  
  const togglePlayPause = () => {
    if (!audioElement || !audioContextRef.current || !analyserRef.current) return
    
    if (isPlaying) {
      audioElement.pause()
      cancelAnimationFrame(animationRef.current!)
    } else {
      // 如果音频上下文被暂停，需要恢复
      if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume()
      }
      
      audioElement.play()
      renderAudioVisualizer()
    }
    
    setIsPlaying(!isPlaying)
  }
  
  const renderAudioVisualizer = () => {
    if (!canvasRef.current || !analyserRef.current) return
    
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    const analyser = analyserRef.current
    const bufferLength = analyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)
    
    const width = canvas.width
    const height = canvas.height
    
    const draw = () => {
      animationRef.current = requestAnimationFrame(draw)
      
      analyser.getByteFrequencyData(dataArray)
      
      ctx.clearRect(0, 0, width, height)
      
      const barWidth = width / bufferLength * 2.5
      let x = 0
      
      for (let i = 0; i < bufferLength; i++) {
        const barHeight = dataArray[i] / 255 * height / 2
        
        // 根据频率生成渐变色
        const hue = i / bufferLength * 360
        ctx.fillStyle = `hsla(${hue}, 100%, 50%, 0.7)`
        
        ctx.fillRect(x, height - barHeight, barWidth, barHeight)
        x += barWidth + 1
      }
    }
    
    draw()
  }
  
  return (
    <div className={cn("relative group overflow-hidden rounded-lg", className)}>
      {/* 图片容器 */}
      <div className="relative w-full aspect-[16/9] overflow-hidden">
        <img 
          src={imageUrl} 
          alt={title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        
        {/* 播放按钮 */}
        <button 
          onClick={togglePlayPause}
          className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        >
          <div className="w-12 h-12 rounded-full bg-black/50 flex items-center justify-center text-white">
            {isPlaying ? (
              <Pause className="w-6 h-6" />
            ) : (
              <Play className="w-6 h-6" />
            )}
          </div>
        </button>
        
        {/* 音频可视化 */}
        {isPlaying && (
          <div className="absolute bottom-0 left-0 w-full h-16 pointer-events-none">
            <canvas 
              ref={canvasRef} 
              width={300} 
              height={60} 
              className="w-full h-full opacity-70"
            />
          </div>
        )}
        
        {/* 进度条 */}
        <div className="absolute bottom-0 left-0 w-full h-1 bg-black/30">
          <div 
            className="h-full bg-white"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
      
      {/* 卡片内容 */}
      <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent text-white">
        <h3 className="text-sm font-medium truncate">{title}</h3>
        
        {/* 统计信息 */}
        <div className="flex items-center gap-2 mt-1 text-xs text-gray-300">
          {views && <span>{views}</span>}
          {likes && <span>{likes}</span>}
        </div>
      </div>
    </div>
  )
}