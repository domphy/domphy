import { defineConfig } from 'tsup';

export default defineConfig([
    {
        entry: ['src/index.ts'],
        format: ['esm', 'cjs'],
        globalName: 'Domphy',
        dts: true,
        sourcemap: true,
        clean: true,
        outDir: 'dist',
        minify: true,
        target: 'es6',
    },
    {
        entry: {'core':'src/global.ts'},
        format: ['iife'],
        globalName: 'Domphy',
        sourcemap: true,
        dts: false, //important
        clean: false, //important
        outDir: 'dist',
        minify: true,
        target: 'es6',
    }
]);
