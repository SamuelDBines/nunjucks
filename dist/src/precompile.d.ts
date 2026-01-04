import { Environment, Template } from './environment';
type IPrecompileOpts = {
    isString?: boolean;
    isFunction?: boolean;
    force?: boolean;
    env?: Environment;
    wrapper?: (templates: Template[], opts?: {
        isFunction: boolean;
    }) => string;
    name?: string;
    include?: string[];
    exclude?: string[];
};
export declare function precompile(input: any, opts?: IPrecompileOpts): string;
export {};
