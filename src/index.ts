import { reduceImageSize, isElementVisible, resolveCssUrls, toDataUrl } from "./lib.js";
import type { captureOptions, PageMeta, sendOptions } from "./types/index.js";

async function capture(options: captureOptions): Promise<string> {
    const clonedHtml = document.documentElement.cloneNode(true) as HTMLElement;

    clonedHtml.querySelectorAll('script').forEach(script => script.remove());

    if (options?.inlineStyles) {
    await inlineStyles(clonedHtml);
    }
    if (options?.embedFonts) {
    await embedFonts(clonedHtml);
    }
    if (options?.embedImages) {
    await embedImages(clonedHtml);
    }

    return `<!DOCTYPE html>${clonedHtml.outerHTML}`;
}

function pageMeta (): PageMeta {
    return {
        browser: {
            url: window.location.href,
            userAgent: navigator.userAgent,
            language: navigator.language,
        },
        viewport: {
            width: window.innerWidth,
            height: window.innerHeight,
            dpr: window.devicePixelRatio,
        },
        scroll: {
            x: window.scrollX,
            y: window.scrollY,
        },
        page: {
            title: document.title,
            referrer: document.referrer,
        },
    };
}

async function inlineStyles(clonedHtml: HTMLElement): Promise<void> {
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

async function embedFonts(clonedHtml: HTMLElement): Promise<void> {
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

async function embedImages(clonedHtml: HTMLElement, maxSize: number = 0.5 * 1024 * 1024): Promise<void> {
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

async function send(options: sendOptions): Promise<Response> {
    const capturedHtml = await capture({
        embedFonts: false
    });
    const meta = pageMeta();

    const response = await fetch(options.url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'X-Capture-Token': options.token
        },
        body: JSON.stringify({
            html: capturedHtml,
            payload: options?.payload ?? null,
            meta
        }),
    })

    if (!response.ok) {
        throw new Error(`Send failed: ${response.status}`);
    }

    return response;
}

export {
    capture,
    send,
}
