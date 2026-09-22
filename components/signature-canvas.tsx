"use client"

import { useRef, useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Eraser, Undo2 } from "lucide-react"

interface SignatureCanvasProps {
  onSignatureChange: (dataUrl: string | null) => void
  width?: number
  height?: number
}

export function SignatureCanvas({ onSignatureChange, width = 500, height = 200 }: SignatureCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasSignature, setHasSignature] = useState(false)
  const [canvasWidth, setCanvasWidth] = useState(width)
  const strokesRef = useRef<{ x: number; y: number; isStart: boolean }[][]>([])
  const currentStrokeRef = useRef<{ x: number; y: number; isStart: boolean }[]>([])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = Math.floor(entry.contentRect.width)
        if (w > 0) setCanvasWidth(w)
      }
    })
    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    canvas.width = canvasWidth * dpr
    canvas.height = height * dpr
    canvas.style.width = `${canvasWidth}px`
    canvas.style.height = `${height}px`
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.scale(dpr, dpr)
    redraw(ctx)
  }, [canvasWidth, height])

  const getCtx = () => {
    const canvas = canvasRef.current
    if (!canvas) return null
    return canvas.getContext("2d")
  }

  const redraw = (ctx: CanvasRenderingContext2D) => {
    const dpr = window.devicePixelRatio || 1
    ctx.clearRect(0, 0, canvasWidth * dpr, height * dpr)
    ctx.lineCap = "round"
    ctx.lineJoin = "round"
    ctx.lineWidth = 2.5
    ctx.strokeStyle = "#1a1a2e"

    for (const stroke of strokesRef.current) {
      if (stroke.length === 0) continue
      ctx.beginPath()
      ctx.moveTo(stroke[0].x, stroke[0].y)
      for (let i = 1; i < stroke.length; i++) {
        ctx.lineTo(stroke[i].x, stroke[i].y)
      }
      ctx.stroke()
    }
  }

  const getPos = (e: React.MouseEvent | React.TouchEvent): { x: number; y: number } => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    if ("touches" in e) {
      const touch = e.touches[0] || e.changedTouches[0]
      return { x: touch.clientX - rect.left, y: touch.clientY - rect.top }
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    const pos = getPos(e)
    setIsDrawing(true)
    currentStrokeRef.current = [{ ...pos, isStart: true }]
    const ctx = getCtx()
    if (!ctx) return
    ctx.lineCap = "round"
    ctx.lineJoin = "round"
    ctx.lineWidth = 2.5
    ctx.strokeStyle = "#1a1a2e"
    ctx.beginPath()
    ctx.moveTo(pos.x, pos.y)
  }

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return
    e.preventDefault()
    const pos = getPos(e)
    currentStrokeRef.current.push({ ...pos, isStart: false })
    const ctx = getCtx()
    if (!ctx) return
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
  }

  const stopDrawing = useCallback(() => {
    if (!isDrawing) return
    setIsDrawing(false)
    if (currentStrokeRef.current.length > 1) {
      strokesRef.current.push([...currentStrokeRef.current])
      setHasSignature(true)
      const canvas = canvasRef.current
      if (canvas) {
        const tempCanvas = document.createElement("canvas")
        tempCanvas.width = canvas.width
        tempCanvas.height = canvas.height
        const tempCtx = tempCanvas.getContext("2d")
        if (tempCtx) {
          const dpr = window.devicePixelRatio || 1
          tempCtx.scale(dpr, dpr)
          tempCtx.lineCap = "round"
          tempCtx.lineJoin = "round"
          tempCtx.lineWidth = 2.5
          tempCtx.strokeStyle = "#1a1a2e"
          for (const stroke of strokesRef.current) {
            if (stroke.length === 0) continue
            tempCtx.beginPath()
            tempCtx.moveTo(stroke[0].x, stroke[0].y)
            for (let i = 1; i < stroke.length; i++) {
              tempCtx.lineTo(stroke[i].x, stroke[i].y)
            }
            tempCtx.stroke()
          }
        }
        onSignatureChange(tempCanvas.toDataURL("image/png"))
      }
    }
    currentStrokeRef.current = []
  }, [isDrawing, onSignatureChange])

  const handleClear = () => {
    strokesRef.current = []
    currentStrokeRef.current = []
    setHasSignature(false)
    onSignatureChange(null)
    const ctx = getCtx()
    if (ctx) {
      const dpr = window.devicePixelRatio || 1
      ctx.clearRect(0, 0, canvasWidth * dpr, height * dpr)
    }
  }

  const handleUndo = () => {
    if (strokesRef.current.length === 0) return
    strokesRef.current.pop()
    const ctx = getCtx()
    if (ctx) {
      redraw(ctx)
    }
    if (strokesRef.current.length === 0) {
      setHasSignature(false)
      onSignatureChange(null)
    } else {
      const canvas = canvasRef.current
      if (canvas) {
        const tempCanvas = document.createElement("canvas")
        tempCanvas.width = canvas.width
        tempCanvas.height = canvas.height
        const tempCtx = tempCanvas.getContext("2d")
        if (tempCtx) {
          const dpr = window.devicePixelRatio || 1
          tempCtx.scale(dpr, dpr)
          tempCtx.lineCap = "round"
          tempCtx.lineJoin = "round"
          tempCtx.lineWidth = 2.5
          tempCtx.strokeStyle = "#1a1a2e"
          for (const stroke of strokesRef.current) {
            if (stroke.length === 0) continue
            tempCtx.beginPath()
            tempCtx.moveTo(stroke[0].x, stroke[0].y)
            for (let i = 1; i < stroke.length; i++) {
              tempCtx.lineTo(stroke[i].x, stroke[i].y)
            }
            tempCtx.stroke()
          }
        }
        onSignatureChange(tempCanvas.toDataURL("image/png"))
      }
    }
  }

  return (
    <div className="space-y-2">
      <div ref={containerRef} className="w-full">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="border-2 border-dashed border-input rounded-lg cursor-crosshair bg-white touch-none"
          style={{ width: `${canvasWidth}px`, height: `${height}px` }}
        />
      </div>
      {!hasSignature && (
        <p className="text-xs text-muted-foreground text-center">
          Draw your signature above using mouse or touch
        </p>
      )}
      {hasSignature && (
        <div className="flex items-center justify-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleUndo}
            className="text-muted-foreground hover:text-foreground gap-1 text-xs"
          >
            <Undo2 className="w-3 h-3" />
            Undo
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="text-red-400 hover:text-red-300 hover:bg-red-500/10 gap-1 text-xs"
          >
            <Eraser className="w-3 h-3" />
            Clear
          </Button>
        </div>
      )}
    </div>
  )
}
