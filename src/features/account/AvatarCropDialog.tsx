import { Check, RotateCcw, X, ZoomIn, ZoomOut } from 'lucide-react'
import { useState } from 'react'
import Cropper, { type Area, type Point } from 'react-easy-crop'
import { Button } from '@/components/ui/button'
import { createCroppedAvatar } from './createCroppedAvatar'

type AvatarCropDialogProps = {
  imageUrl: string
  isSaving: boolean
  onCancel: () => void
  onError: () => void
  onSave: (file: File) => void
}

export function AvatarCropDialog({
  imageUrl,
  isSaving,
  onCancel,
  onError,
  onSave,
}: AvatarCropDialogProps) {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedArea, setCroppedArea] = useState<Area | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  async function save() {
    if (!croppedArea) return
    setIsProcessing(true)
    try {
      onSave(await createCroppedAvatar(imageUrl, croppedArea))
    } catch {
      onError()
    } finally {
      setIsProcessing(false)
    }
  }

  const disabled = isSaving || isProcessing

  return (
    <div
      className="workspace-dialog avatar-crop-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="avatar-crop-title"
      dir="rtl"
    >
      <section>
        <button
          className="workspace-dialog__close"
          type="button"
          onClick={onCancel}
          disabled={disabled}
          aria-label="סגירת עריכת התמונה"
        >
          <X />
        </button>
        <header>
          <h2 id="avatar-crop-title">התאמת תמונת הפרופיל</h2>
          <p>גררו את התמונה ובחרו בזום כך שהאזור החשוב יישאר בתוך העיגול.</p>
        </header>
        <div className="avatar-crop-dialog__stage">
          <Cropper
            image={imageUrl}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            minZoom={1}
            maxZoom={3}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={(_, pixels) => setCroppedArea(pixels)}
          />
        </div>
        <div className="avatar-crop-dialog__zoom">
          <ZoomOut aria-hidden="true" />
          <label>
            <span className="sr-only">זום התמונה</span>
            <input
              type="range"
              min="1"
              max="3"
              step="0.01"
              value={zoom}
              onChange={(event) => setZoom(Number(event.target.value))}
              disabled={disabled}
            />
          </label>
          <ZoomIn aria-hidden="true" />
        </div>
        <div className="avatar-crop-dialog__actions">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setCrop({ x: 0, y: 0 })
              setZoom(1)
            }}
            disabled={disabled}
          >
            <RotateCcw />
            איפוס
          </Button>
          <Button type="button" onClick={() => void save()} disabled={disabled || !croppedArea}>
            <Check />
            {disabled ? 'שומר תמונה...' : 'שמירת התמונה'}
          </Button>
        </div>
      </section>
    </div>
  )
}
