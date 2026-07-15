export function resolveCssUrls(cssText: string, base: string): string {
    return cssText.replace(
        /url\(\s*(['"]?)(.*?)\1\s*\)/g,
        (match, quote, url) => {
            if (!url || url.startsWith('data:') || url.startsWith('blob:')) {
                return match;
            }

            try {
                return `url(${quote}${new URL(url, base).href}${quote})`;
            } catch {
                return match;
            }
        },
    );
}

export function toDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;

        reader.readAsDataURL(blob);
    });
}

export function isElementVisible(element: HTMLElement): boolean {
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();

    return (
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        Number(style.opacity) > 0 &&
        rect.width > 0 &&
        rect.height > 0 &&
        rect.bottom > 0 &&
        rect.right > 0 &&
        rect.top < window.innerHeight &&
        rect.left < window.innerWidth
    );
}

export async function reduceImageSize(blob: Blob): Promise<Blob> {
    const bitmap = await createImageBitmap(blob);
    const canvas = document.createElement('canvas');

    canvas.width = Math.round(bitmap.width * 0.5);
    canvas.height = Math.round(bitmap.height * 0.5);

    canvas.getContext('2d')!.drawImage(
        bitmap,
        0,
        0,
        canvas.width,
        canvas.height,
    );
    bitmap.close();

    return new Promise((resolve, reject) => {
        canvas.toBlob(
            result => result ? resolve(result) : reject(),
            'image/webp',
            0.75,
        );
    });
}