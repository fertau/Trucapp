const readFileAsDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('No se pudo leer la imagen.'));
        reader.readAsDataURL(file);
    });

const loadImage = (src: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('No se pudo cargar la imagen.'));
        img.src = src;
    });

export const processAvatarFile = async (file: File): Promise<string> => {
    if (!file.type.startsWith('image/')) {
        throw new Error('Formato inválido. Subí una imagen.');
    }

    const sourceDataUrl = await readFileAsDataUrl(file);
    const image = await loadImage(sourceDataUrl);

    const side = 384;
    const canvas = document.createElement('canvas');
    canvas.width = side;
    canvas.height = side;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('No se pudo procesar la imagen.');

    const srcW = image.naturalWidth;
    const srcH = image.naturalHeight;
    const srcSide = Math.min(srcW, srcH);
    const sx = (srcW - srcSide) / 2;
    const sy = (srcH - srcSide) / 2;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(image, sx, sy, srcSide, srcSide, 0, 0, side, side);

    return canvas.toDataURL('image/jpeg', 0.88);
};
