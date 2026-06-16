import * as singleFile from "single-file-core/single-file.js";

export async function getHtml(): Promise<string> {
    const page = await singleFile.getPageData({
        removeHiddenElements: false,
        removeUnusedStyles: true,
        removeUnusedFonts: true,
        blockScripts: true,
        blockStylesheets: false,
        compressHTML: true,
        keepPrintStyleSheets: true,
    });

    return fixViteStyles(page.content);
}

function fixViteStyles(html: string): string {
    const doc = new DOMParser().parseFromString(html, "text/html");

    doc.querySelectorAll("style").forEach((style) => {
        const text = style.textContent || "";

        if (!text.includes("__vite__css")) {
            return;
        }

        const css = extractViteCss(text);

        if (!css) {
            style.remove();
            return;
        }

        style.textContent = css;
    });

    return "<!DOCTYPE html>\n" + doc.documentElement.outerHTML;
}

function extractViteCss(code: string): string | null {
    const match = code.match(/const\s+__vite__css\s*=\s*((?:"(?:\\.|[^"\\])*")|(?:'(?:\\.|[^'\\])*')|(?:`(?:\\.|[^`\\])*`))/s);

    if (!match?.[1]) {
        return null;
    }

    try {
        return Function(`"use strict"; return (${match[1]});`)() as string;
    } catch {
        return null;
    }
}

export default {
    getHtml,
};