import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { FiVideo, FiSquare, FiRefreshCw, FiCheckCircle, FiCamera } from 'react-icons/fi'

/**
 * SelfieRecorder - records a short live video of the user (for identity verification).
 * Calls onRecorded(file) with a video File once a recording is captured.
 */
export default function SelfieRecorder({ onRecorded }) {
  const { t } = useTranslation()
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const recorderRef = useRef(null)
  const chunksRef = useRef([])
  const timerRef = useRef(null)

  const [status, setStatus] = useState('idle') // idle | ready | recording | recorded | error
  const [seconds, setSeconds] = useState(0)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [error, setError] = useState('')

  const MAX_SECONDS = 15

  useEffect(() => {
    return () => stopStream()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const stopStream = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((tr) => tr.stop())
      streamRef.current = null
    }
  }

  const startCamera = async () => {
    setError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: true,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.muted = true
        await videoRef.current.play().catch(() => {})
      }
      setStatus('ready')
    } catch (e) {
      console.error('Camera error:', e)
      setError(t('services.verify.cameraError', "Impossible d'accéder à la caméra. Autorisez l'accès et réessayez."))
      setStatus('error')
    }
  }

  const startRecording = () => {
    if (!streamRef.current) return
    chunksRef.current = []
    let mimeType = 'video/webm'
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = MediaRecorder.isTypeSupported('video/mp4') ? 'video/mp4' : ''
    }
    const recorder = new MediaRecorder(streamRef.current, mimeType ? { mimeType } : undefined)
    recorderRef.current = recorder
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data)
    }
    recorder.onstop = () => {
      const type = mimeType || 'video/webm'
      const blob = new Blob(chunksRef.current, { type })
      const ext = type.includes('mp4') ? 'mp4' : 'webm'
      const file = new File([blob], `selfie-${Date.now()}.${ext}`, { type })
      setPreviewUrl(URL.createObjectURL(blob))
      setStatus('recorded')
      stopStream()
      if (videoRef.current) videoRef.current.srcObject = null
      onRecorded?.(file)
    }
    recorder.start()
    setStatus('recording')
    setSeconds(0)
    timerRef.current = setInterval(() => {
      setSeconds((s) => {
        if (s + 1 >= MAX_SECONDS) {
          stopRecording()
        }
        return s + 1
      })
    }, 1000)
  }

  const stopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop()
    }
  }

  const retake = () => {
    setPreviewUrl(null)
    setSeconds(0)
    onRecorded?.(null)
    startCamera()
  }

  return (
    <div className="space-y-3">
      <div className="relative bg-gray-900 rounded-2xl overflow-hidden aspect-video flex items-center justify-center">
        {status === 'recorded' && previewUrl ? (
          <video src={previewUrl} controls className="w-full h-full object-contain" />
        ) : (
          <video ref={videoRef} playsInline className="w-full h-full object-cover" />
        )}

        {(status === 'idle' || status === 'error') && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white/80 gap-3">
            <FiCamera className="w-10 h-10" />
            <button
              type="button"
              onClick={startCamera}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl text-sm font-semibold"
            >
              {t('services.verify.enableCamera', 'Activer la caméra')}
            </button>
          </div>
        )}

        {status === 'recording' && (
          <div className="absolute top-3 left-3 flex items-center gap-2 px-3 py-1 bg-red-600 text-white text-xs font-bold rounded-full">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
            REC {seconds}s / {MAX_SECONDS}s
          </div>
        )}

        {status === 'recorded' && (
          <div className="absolute top-3 left-3 flex items-center gap-1 px-3 py-1 bg-emerald-600 text-white text-xs font-bold rounded-full">
            <FiCheckCircle /> {t('services.verify.recorded', 'Vidéo enregistrée')}
          </div>
        )}
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex gap-2 justify-center">
        {status === 'ready' && (
          <button
            type="button"
            onClick={startRecording}
            className="flex items-center gap-2 px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl"
          >
            <FiVideo /> {t('services.verify.startRecording', 'Démarrer')}
          </button>
        )}
        {status === 'recording' && (
          <button
            type="button"
            onClick={stopRecording}
            className="flex items-center gap-2 px-5 py-2.5 bg-gray-800 hover:bg-gray-900 text-white font-semibold rounded-xl"
          >
            <FiSquare /> {t('services.verify.stopRecording', 'Arrêter')}
          </button>
        )}
        {status === 'recorded' && (
          <button
            type="button"
            onClick={retake}
            className="flex items-center gap-2 px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl"
          >
            <FiRefreshCw /> {t('services.verify.retake', 'Recommencer')}
          </button>
        )}
      </div>
    </div>
  )
}
