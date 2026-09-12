import type { Area } from 'react-easy-crop'

const AVATAR_SIZE = 800

export async function createCroppedAvatar(imageUrl: string, crop: Area): Promise<File> {
  const image = await loadImage(imageUrl)
  const canvas = document.createElement('canvas')
  canvas.width = AVATAR_SIZE
  canvas.height = AVATAR_SIZE
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas is not available')

  context.drawImage(
    image,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    AVATAR_SIZE,
    AVATAR_SIZE,
  )

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => (result ? resolve(result) : reject(new Error('Image processing failed'))),
      'image/webp',
      0.9,
    )
  })

  return new File([blob], 'profile-avatar.webp', {
    type: 'image/webp',
    lastModified: Date.now(),
  })
}

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Image could not be loaded'))
    image.src = source
  })
}