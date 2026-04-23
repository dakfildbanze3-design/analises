export const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    if (!url.startsWith('blob:')) {
       image.setAttribute('crossOrigin', 'anonymous');
    }
    image.src = url;
  });

export function getRadianAngle(degreeValue: number) {
  return (degreeValue * Math.PI) / 180;
}

export function rotateSize(width: number, height: number, rotation: number) {
  const rotRad = getRadianAngle(rotation);
  return {
    width: Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height),
    height: Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height),
  };
}

export default async function getCroppedImg(
  imageSrc: string,
  pixelCrop: { x: number; y: number; width: number; height: number },
  rotation = 0,
  filterString = 'none'
): Promise<string | null> {
  try {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) return null;

    const rotRad = getRadianAngle(rotation);
    const { width: bBoxWidth, height: bBoxHeight } = rotateSize(image.width, image.height, rotation);

    canvas.width = bBoxWidth;
    canvas.height = bBoxHeight;

    ctx.translate(bBoxWidth / 2, bBoxHeight / 2);
    ctx.rotate(rotRad);
    ctx.translate(-image.width / 2, -image.height / 2);

    if (filterString && filterString !== 'none') {
      try {
        ctx.filter = filterString;
      } catch (err) {
        console.warn("Filters not supported by browser ctx", err);
      }
    }

    ctx.drawImage(image, 0, 0);

    // If ctx.filter was totally ignored by a bad browser, manual fallback could be done here, 
    // but standard ctx.filter is supported in 99% of modern mobiles using Chrome/Safari.

    const croppedCanvas = document.createElement('canvas');
    const croppedCtx = croppedCanvas.getContext('2d');

    if (!croppedCtx) return null;

    // MAX RESOLUTION DOWN-SCALING TO ACCELERATE UPLOADS (Instagram standard is 1080)
    const MAX_DIMENSION = 1200;
    let targetWidth = pixelCrop.width;
    let targetHeight = pixelCrop.height;

    if (targetWidth > MAX_DIMENSION || targetHeight > MAX_DIMENSION) {
      if (targetWidth > targetHeight) {
        targetHeight = Math.round((targetHeight / targetWidth) * MAX_DIMENSION);
        targetWidth = MAX_DIMENSION;
      } else {
        targetWidth = Math.round((targetWidth / targetHeight) * MAX_DIMENSION);
        targetHeight = MAX_DIMENSION;
      }
    }

    croppedCanvas.width = targetWidth;
    croppedCanvas.height = targetHeight;

    croppedCtx.drawImage(
      canvas,
      Math.max(0, pixelCrop.x),
      Math.max(0, pixelCrop.y),
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      targetWidth,
      targetHeight
    );

    return new Promise((resolve) => {
      croppedCanvas.toBlob((file) => {
        if (file) resolve(URL.createObjectURL(file));
        else resolve(imageSrc); 
      }, 'image/jpeg', 0.8);
    });
  } catch (error) {
    console.warn("Error during image cropping:", error);
    return imageSrc; 
  }
}

