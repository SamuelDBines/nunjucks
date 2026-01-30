import path from "node:path";
import fs from "node:fs";
import { extract_comments, p } from "./lib";
import type { LoaderResponse } from "./types";

export type Loader = (_path?: string) => LoaderResponse;

export const FileSystemLoader: Loader = (_path: string = "views") => {
  const source = (name: string) => {
    const basePath = path.resolve(_path);
    const res = path.resolve(basePath, name);
    if (res.indexOf(basePath) === 0 && fs.existsSync(res)) return { err: null, res };
    const err = `No file found: ${res}`;
    p.err(err);
    return { err, res };
  };

  return {
    typename: "file",
    source,
    read: (name: string) => {
      const file = source(name);
      if (file.err) return { err: file.err, res: file.res };
      return { err: null, res: extract_comments(fs.readFileSync(file.res, "utf-8")) };
    },
  };
};
