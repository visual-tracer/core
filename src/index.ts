import * as singleFile                                                   from 'single-file-core/single-file.js';
import type { SingleFilePageData, ScrollElementState, VisualTracerMeta } from './types/index.js';

export class VisualTracer {
    private captureToken: string = '';
    private endpoint: string = 'https://api.visualtracer.com/v1/capture';

    init(
        captureToken: string,
        endpoint?: string
    ): void {
        this.captureToken = captureToken;

        if (endpoint) {
            this.endpoint = endpoint;
        }
    }

    async send(
        sendConsole: boolean = false
    ): Promise<void> {
        if (!this.captureToken) {
            throw new Error('VisualTracer is not initialized. Please call init() with a valid capture token.');
        }

        const meta = this.getMeta();

        const response = await fetch(this.endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                'X-Capture-Token': this.captureToken,
            },
            body: JSON.stringify({
                html: await this.html(meta),
                console: sendConsole ? this.getConsoleData() : false,
                meta,
            }),
        });

        if (!response.ok) {
            throw new Error(`VisualTracer request failed with status ${response.status}`);
        }
    }

    private async html(meta: VisualTracerMeta): Promise<string> {
        this.assertBrowserEnvironment();

        const page = (await singleFile.getPageData({
            removeHiddenElements: false,
            removeUnusedStyles: false,
            removeUnusedFonts: false,
            blockScripts: true,
            blockStylesheets: false,
            compressHTML: true,
            keepPrintStyleSheets: true,
        })) as SingleFilePageData;

        const html = this.fixViteStyles(page.content);

        return this.injectRestoreScript(html, meta);
    }

    private getMeta(): VisualTracerMeta {
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
            scrollElements: this.getScrollableElementsState(),
            page: {
                title: document.title,
                referrer: document.referrer,
            },
        };
    }

    private getScrollableElementsState(): ScrollElementState[] {
        const states: ScrollElementState[] = [];
        let index = 0;

        for (const element of Array.from(document.querySelectorAll<HTMLElement>('*'))) {
            if (!this.isScrollableElement(element)) {
                continue;
            }

            if (element.scrollTop === 0 && element.scrollLeft === 0) {
                continue;
            }

            const id = `vt-scroll-${index++}`;

            element.setAttribute('data-vt-scroll-id', id);

            states.push({
                id,
                top: element.scrollTop,
                left: element.scrollLeft,
            });
        }

        return states;
    }

    private isScrollableElement(element: HTMLElement): boolean {
        const style = window.getComputedStyle(element);

        const scrollableY = ['auto', 'scroll', 'overlay'].includes(style.overflowY);
        const scrollableX = ['auto', 'scroll', 'overlay'].includes(style.overflowX);

        return (
            (scrollableY && element.scrollHeight > element.clientHeight) ||
            (scrollableX && element.scrollWidth > element.clientWidth)
        );
    }

    private injectRestoreScript(html: string, meta: VisualTracerMeta): string {
        const doc = new DOMParser().parseFromString(html, 'text/html');

        const script = doc.createElement('script');

        script.setAttribute('data-visual-tracer-restore', 'true');

        script.textContent = `
            (() => {
                const state = ${JSON.stringify(meta)};

                const restore = () => {
                    for (const item of state.scrollElements || []) {
                        const element = document.querySelector('[data-vt-scroll-id="' + item.id + '"]');

                        if (!element) {
                            continue;
                        }

                        element.scrollTop = item.top || 0;
                        element.scrollLeft = item.left || 0;
                    }

                    window.scrollTo(
                        state.scroll?.x || 0,
                        state.scroll?.y || 0
                    );

                    document.documentElement.setAttribute('data-visual-tracer-restored', 'true');
                };

                if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', restore, { once: true });
                    return;
                }

                restore();
            })();
        `;

        doc.body.appendChild(script);

        return `<!DOCTYPE html>\n${doc.documentElement.outerHTML}`;
    }

    private getConsoleData(): unknown[] {
        return [];
    }

    private assertBrowserEnvironment(): void {
        if (typeof DOMParser === 'undefined') {
            throw new Error('VisualTracer must be used in a browser environment.');
        }
    }

    private fixViteStyles(html: string): string {
        const doc = new DOMParser().parseFromString(html, 'text/html');

        for (const style of doc.querySelectorAll('style')) {
            const text = style.textContent ?? '';

            if (!text.includes('__vite__css')) {
                continue;
            }

            const css = this.extractViteCss(text);

            if (css === null) {
                style.remove();
                continue;
            }

            style.textContent = css;
        }

        return `<!DOCTYPE html>\n${doc.documentElement.outerHTML}`;
    }

    private extractViteCss(code: string): string | null {
        const match = code.match(
            /(?:const|let|var)\s+__vite__css\s*=\s*((?:"(?:\\.|[^"\\])*")|(?:'(?:\\.|[^'\\])*')|(?:`(?:\\.|[^`\\])*`))/s,
        );

        const raw = match?.[1];

        if (!raw) {
            return null;
        }

        try {
            if (raw.startsWith('"')) {
                return JSON.parse(raw) as string;
            }

            if (raw.startsWith("'")) {
                return this.decodeSingleQuotedString(raw);
            }

            if (raw.startsWith('`')) {
                return this.decodeTemplateString(raw);
            }

            return null;
        } catch {
            return null;
        }
    }

    private decodeSingleQuotedString(raw: string): string {
        return raw
            .slice(1, -1)
            .replace(/\\'/g, "'")
            .replace(/\\"/g, '"')
            .replace(/\\n/g, '\n')
            .replace(/\\r/g, '\r')
            .replace(/\\t/g, '\t')
            .replace(/\\\\/g, '\\');
    }

    private decodeTemplateString(raw: string): string {
        return raw
            .slice(1, -1)
            .replace(/\\`/g, '`')
            .replace(/\\n/g, '\n')
            .replace(/\\r/g, '\r')
            .replace(/\\t/g, '\t')
            .replace(/\\\\/g, '\\');
    }
}

const visualTracer = new VisualTracer();

export default visualTracer;