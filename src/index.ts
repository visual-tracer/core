import { reduceImageSize, isElementVisible, resolveCssUrls, toDataUrl } from "./lib.js";

export default class VisualTracer {
    public async capture() {
        const clonedHtml = document.documentElement.cloneNode(true) as HTMLElement;

        clonedHtml.querySelectorAll('script').forEach(script => script.remove());

        await this.inlineStyles(clonedHtml);
        // await this.embedFonts(clonedHtml);
        await this.embedImages(clonedHtml);

        console.log(clonedHtml)
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
        style.dataset.visualTracer = 'styles';
        style.textContent = css.join('\n');

        clonedHtml.querySelector('head')?.appendChild(style);
    }

    private async embedFonts(clonedHtml: HTMLElement) {
        const style = clonedHtml.querySelector<HTMLStyleElement>(
            'style[data-visual-tracer="styles"]',
        );

        if (!style?.textContent) return;

        let css = style.textContent;
        const urls = [...new Set(
            [...css.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/gi)]
                .map(match => match[1])
                .filter((url): url is string => !!url && /\.(woff2?|ttf|otf)([?#].*)?$/i.test(url)),
        )];

        for (const url of urls) {
            try {
                const response = await fetch(url);
                if (!response.ok) throw new Error();

                css = css.replaceAll(url, await toDataUrl(await response.blob()));
            } catch {
                console.warn('Could not embed font:', url);
            }
        }

        style.textContent = css;
    }

    private async embedImages(clonedHtml: HTMLElement, maxSize: number = 0.5 * 1024 * 1024) {
        const originalImages = Array.from(document.querySelectorAll('img'));
        const clonedImages = Array.from(clonedHtml.querySelectorAll('img'));

        const placeholder =
            'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';

        for (let index = 0; index < originalImages.length; index++) {
            const image = originalImages[index];
            const clonedImage = clonedImages[index];

            if (!image || !clonedImage) continue;

            clonedImage.removeAttribute('srcset');
            clonedImage.removeAttribute('sizes');

            if (!isElementVisible(image)) {
                clonedImage.src = placeholder;
                continue;
            }

            try {
                const response = await fetch(image.currentSrc || image.src);
                let blob = await response.blob();

                if (blob.size > maxSize) {
                    blob = await reduceImageSize(blob);
                }

                if (blob.size > maxSize) {
                    clonedImage.src = placeholder;
                    continue;
                }

                clonedImage.src = await toDataUrl(blob);
            } catch {
                clonedImage.src = placeholder;
            }
        }
    }
}