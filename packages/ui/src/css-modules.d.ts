// Ambient declaration so `import styles from './X.module.css'` typechecks.
// Resolution at build time is handled by Vite; this only satisfies tsc.

declare module '*.module.css' {
  const classes: { readonly [key: string]: string };
  export default classes;
}
