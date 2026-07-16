export type captureOptions = {
    inlineStyles?: boolean;
    embedFonts?: boolean;
    embedImages?: boolean;
}

export type PageMeta = {
    browser: {
        url: string;
        userAgent: string;
        language: string;
    };
    viewport: {
        width: number;
        height: number;
        dpr: number;
    };
    scroll: {
        x: number;
        y: number;
    };
    page: {
        title: string;
        referrer: string;
    };
};

export type sendOptions = {
    url: string;
    payload?: Record<string, unknown>;
    token: string;
}