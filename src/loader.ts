import path from 'node:path'
import fs from 'node:fs'
import { p, extract_comments } from './lib'
import { Callback, LoaderResponse } from './types';

export enum LoaderTypes {
	Memory = 'memory',
	File = 'file'
}

export type Loader = (_path?: string, opts?: any) => LoaderResponse

export const FileSystemLoader: Loader = (_path: string = 'views', opts: any) => {
	const source = (name: string) => {
		const basePath = path.resolve(_path);
		const res = path.resolve(basePath, name);
		if (res.indexOf(basePath) === 0 && fs.existsSync(res))
			return { err: null, res } ;
		const err = `No file found: ${res}`
		p.err(err)
		return { err, res } 
	}
	return {
		typename: LoaderTypes.File,
		source: source,
		read: (name: string) => {
			const file = source(name);
			if(!file.err) {
				p.debug(file.res)
				return {
					res: extract_comments(fs.readFileSync(file.res, 'utf-8'))
				}
			}
			return file
		}
	}
}