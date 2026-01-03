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
declare function precompileString(str: string, opts?: IPrecompileOpts): string;
declare function precompile(input: any, opts?: IPrecompileOpts): string;
export declare function _precompile(str: string, name: string, env?: Environment): {
    name: string;
    template: any;
};
declare const _default: {
    precompile: typeof precompile;
    precompileString: typeof precompileString;
};
export default _default;
