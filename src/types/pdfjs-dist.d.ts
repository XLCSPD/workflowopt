// Type declaration for the minified ESM build of pdfjs-dist.
// We use this build to avoid webpack runtime conflicts with Next.js.
declare module "pdfjs-dist/build/pdf.min.mjs" {
  export * from "pdfjs-dist";
}
