export default class VisualTracer {
    public capture() {
        const clonedHtml = document.documentElement.cloneNode(true) as HTMLElement;

        this.inlineStyles(clonedHtml);

        console.log(clonedHtml)
    }

    private inlineStyles(clonedHtml: HTMLElement) {
        const css: string[] = [];
        for (const stylesheet of Array.from(document.styleSheets)) {
            try {
                const base = stylesheet.href ?? document.baseURI;
                for (const rule of Array.from(stylesheet.cssRules)) {
                    css.push(this.resolveCssUrls(rule.cssText, base));
                }
            } catch {
                console.warn('Could not read stylesheet:', stylesheet.href);
            }
        }
        const style = document.createElement('style');
        style.textContent = css.join('\n');
        clonedHtml.querySelector('head')?.appendChild(style);
    }

    private resolveCssUrls(cssText: string, base: string): string {
        return cssText.replace(/url\(\s*(['"]?)(.*?)\1\s*\)/g, (match, quote, url) => {
            if (!url || url.startsWith('data:') || url.startsWith('blob:')) {
                return match;
            }
            try {
                const absoluteUrl = new URL(url, base).href;
                return `url(${quote}${absoluteUrl}${quote})`;
            } catch {
                return match;
            }
        });
    }
}