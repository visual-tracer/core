export type SingleFilePageData = {
    content: string;
};

export type SendOptions = {
    sendConsole?: boolean;
};

export type ScrollElementState = {
    id: string;
    top: number;
    left: number;
};

export type VisualTracerMeta = {
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
    scrollElements: ScrollElementState[];
    page: {
        title: string;
        referrer: string;
    };
};