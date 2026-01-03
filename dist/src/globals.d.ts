declare function globals(): {
    range(start: number, stop: number, step?: number): any[];
    cycler(...items: any[]): {
        readonly current: any;
        reset(): void;
        next(): any;
    };
    joiner(sep?: string): () => string;
};
export declare function precompileGlobal(templates: any[], opts?: {
    isFunction: boolean;
}): string;
export default globals;
