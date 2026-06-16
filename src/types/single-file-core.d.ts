declare module "single-file-core/single-file.js" {
    export interface PageData {
        content: string;
        filename?: string;
        title?: string;
        viewport?: string;
        doctype?: string;
        url?: string;
    }

    export interface Options {
        // Scripts
        blockScripts?: boolean;
        userScriptEnabled?: boolean;
        // Stylesheets & CSS
        blockStylesheets?: boolean;
        removeUnusedStyles?: boolean;
        keepPrintStyleSheets?: boolean;
        // Fonts
        removeUnusedFonts?: boolean;
        // Elements / DOM
        removeHiddenElements?: boolean;
        removeFrames?: boolean;
        removeNoScriptTags?: boolean;
        removedElementsSelector?: string;
        // Images / media
        saveFavicon?: boolean;
        loadDeferredImages?: boolean;
        loadDeferredImagesBeforeFrames?: boolean;
        loadDeferredImagesMaxIdleTime?: number;
        // Output
        compressHTML?: boolean;
        compressContent?: boolean;
        saveRawPage?: boolean;
        saveOriginalURLs?: boolean;
        insertSingleFileComment?: boolean;
        insertMetaCSP?: boolean;
        insertMetaNoIndex?: boolean;
        insertCanonicalLink?: boolean;
        // Misc
        maxResourceSize?: number;
        maxResourceSizeEnabled?: boolean;
        networkTimeout?: number;
        resolveLinks?: boolean;
        retrieveLinks?: boolean;
        url?: string;
        referrer?: string;
        onprogress?: (event: unknown) => void;
        [key: string]: unknown;
    }

    export function init(initOptions?: Options): void;
    export function getPageData(options?: Options, initOptions?: Options, doc?: Document, win?: Window): Promise<PageData>;
}
