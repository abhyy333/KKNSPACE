/**
 * Image optimization & compression utility for team avatars and documents.
 * Scales down oversized images to max 1200x1200px and compresses to WebP / JPEG.
 */
export async function optimizeImageFile(
  file: File,
  maxDimension = 1200,
  quality = 0.85
): Promise<File> {
  // If not an image or SVG, return as-is
  if (!file.type.startsWith('image/') || file.type === 'image/svg+xml') {
    return file
  }

  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        let { width, height } = img

        // If dimensions are within bounds and file size <= 400KB, no downscaling needed
        if (width <= maxDimension && height <= maxDimension && file.size <= 400 * 1024) {
          resolve(file)
          return
        }

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width)
            width = maxDimension
          } else {
            width = Math.round((width * maxDimension) / height)
            height = maxDimension
          }
        }

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')

        if (!ctx) {
          resolve(file)
          return
        }

        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'
        ctx.drawImage(img, 0, 0, width, height)

        const outputMime = file.type === 'image/png' ? 'image/png' : 'image/jpeg'
        canvas.toBlob(
          (blob) => {
            if (!blob || blob.size >= file.size) {
              resolve(file)
              return
            }
            const optimizedFile = new File([blob], file.name, {
              type: outputMime,
              lastModified: Date.now(),
            })
            resolve(optimizedFile)
          },
          outputMime,
          quality
        )
      }
      img.onerror = () => resolve(file)
      img.src = e.target?.result as string
    }
    reader.onerror = () => resolve(file)
    reader.readAsDataURL(file)
  })
}
