#! /usr/bin/env node

/* eslint-env node */

const { readFile } = require('fs');
const { resolve } = require('path');
const { promisify } = require('util');
const { hideBin } = require('yargs/helpers');
const yargs = require('yargs/yargs');
const esbuild = require('esbuild');

const readFileAsync = promisify(readFile);

const { argv } = yargs(hideBin(process.argv));

const OUT_DIR = argv.outDir || resolve(process.cwd(), './dist');

const parsePackage = async () => {
  const pkg = await readFileAsync(resolve(process.cwd(), 'package.json'));
  return JSON.parse(pkg);
};

const filterExternals = (pkg) => {
  const externals = Object.keys({
    ...pkg.dependencies,
    ...pkg.peerDependencies,
    ...pkg.devDependencies,
  });
  return externals;
};

const build = async (config) =>
  esbuild.build({
    entryPoints: ['lib/index.ts'],
    absWorkingDir: process.cwd(),
    bundle: true,
    outdir: OUT_DIR,
    platform: 'node',
    target: 'node14',
    ...config,
  });

parsePackage()
  .then(filterExternals)
  .then((external) => build({ external }));
