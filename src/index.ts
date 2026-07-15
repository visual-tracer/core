import { embedFonts, isElementVisible, resolveCssUrls, toDataUrl } from "./lib.js";

export default class VisualTracer {
    public async capture() {
        const clonedHtml = document.documentElement.cloneNode(true) as HTMLElement;

        await this.inlineStyles(clonedHtml);
        await this.embedImages(clonedHtml);

        console.log(clonedHtml);
    }

    private async inlineStyles(clonedHtml: HTMLElement) {
        const css: string[] = [];

        for (const stylesheet of Array.from(document.styleSheets)) {
            try {
                const base = stylesheet.href ?? document.baseURI;

                for (const rule of Array.from(stylesheet.cssRules)) {
                    css.push(resolveCssUrls(rule.cssText, base));
                }
            } catch {
                console.warn('Could not read stylesheet:', stylesheet.href);
            }
        }

        const style = document.createElement('style');
        style.textContent = await embedFonts(css.join('\n'));

        clonedHtml.querySelector('head')?.appendChild(style);
    }

    private async embedImages(clonedHtml: HTMLElement) {
        const originalImages = Array.from(document.querySelectorAll('img'));
        const clonedImages = Array.from(clonedHtml.querySelectorAll('img'));

        for (let index = 0; index < originalImages.length; index++) {
            const image = originalImages[index];
            const clonedImage = clonedImages[index];

            if (!image || !clonedImage || !isElementVisible(image)) {
                continue;
            }

            try {
                const response = await fetch(image.currentSrc || image.src);
                const blob = await response.blob();
                clonedImage.src = await toDataUrl(blob);
                clonedImage.removeAttribute('srcset');
            } catch {
                console.warn('Could not embed image:', image.src);
            }
        }
    }
}