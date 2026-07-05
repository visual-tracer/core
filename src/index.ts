import * as singleFile from 'single-file-core/single-file.js';
import type { SendOptions, SingleFilePageData } from './types/index.js';

export class VisualTracer {
    async html(): Promise<string> {
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

        return this.fixViteStyles(page.content);
    }

    async send(
        sendConsole: boolean = false
    ): Promise<void> {
        const response = await fetch('http://localhost/api/screenshot', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
            body: JSON.stringify({
                html: await this.html(),
                console: sendConsole ? this.getConsoleData() : false,
            })
        })
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