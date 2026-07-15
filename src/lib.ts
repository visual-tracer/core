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

export async function embedFonts(css: string): Promise<string> {
    const urls = [...css.matchAll(/url\(["']?(.*?\.(?:woff2?|ttf|otf))["']?\)/gi)];

    for (const match of urls) {
        const url = match[1];

        if (!url) {
            continue;
        }

        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const dataUrl = await toDataUrl(blob);

            css = css.replaceAll(url, dataUrl);
        } catch {
            console.warn('Could not embed font:', url);
        }
    }

    return css;
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