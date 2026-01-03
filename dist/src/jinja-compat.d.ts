import * as lib from './lib';
interface InstallCompatOpts {
    lib: lib.ILib;
}
export declare function installCompat(opts: InstallCompatOpts): () => void;
export default installCompat;
