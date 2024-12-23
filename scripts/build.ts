import { resolve } from "path"
import type { ModuleFormat } from "rollup"
import * as fs from "fs-extra"
import babel from "@rollup/plugin-babel"
import type { RollupReplaceOptions } from "@rollup/plugin-replace"
import replace from "@rollup/plugin-replace"
import prettier from "rollup-plugin-prettier"
import node from "@rollup/plugin-node-resolve"
import { rollup } from "rollup"
import { formatSource } from "./format-source"
import { dependencies, devDependencies } from "../package.json"

interface BuildOptions {
  targetDir: string
  format: ModuleFormat
  packageName: string
}

export async function build({ targetDir, format, packageName }: BuildOptions) {
  const isESM = format === "esm"

  const extensions = [".ts", ".js"]
  const jsxRuntimeExports = "jsx, jsxs, jsx as jsxDEV, Fragment, JSX"

  const OUT_DIR = resolve(__dirname, "..", targetDir)
  const OUT_DIR_MIN = resolve(OUT_DIR, "./min")

  const buildRollup = async function (
    name: string,
    {
      outputDir = OUT_DIR,
      inject = {},
      externals = [],
      moduleFormat = format,
      cjsExtension = false,
    }: {
      outputDir?: string
      inject?: RollupReplaceOptions
      externals?: string[]
      moduleFormat?: ModuleFormat
      cjsExtension?: boolean
    } = {}
  ) {
    const bundle = await rollup({
      input: `./src/${name}.ts`,
      external: [...externals, packageName, `${packageName}/min`],
      onwarn(warning, rollupWarn) {
        if (warning.code !== "CIRCULAR_DEPENDENCY") {
          rollupWarn(warning)
        }
      },
      plugins: [
        replace({
          ...inject,
          "process.env.TEST": "false",
          preventAssignment: true,
        }),
        babel({
          extensions,
          comments: true,
          minified: false,
          babelHelpers: "bundled",
          presets: ["@babel/preset-env"],
          plugins: [
            "@babel/plugin-transform-typescript",
            "minify-constant-folding",
            "minify-guarded-expressions",
            "minify-dead-code-elimination",
            ({ types: t }) => ({
              visitor: {
                CallExpression(path) {
                  if (t.isIdentifier(path.node.callee, { name: "cast" })) {
                    path.replaceWith(path.node.arguments[0])
                  }
                },
              },
            }),
          ],
        }),
        prettier({ tabWidth: 2, parser: "babel" }),
        node({ extensions }),
      ],
    })

    await bundle.write({
      format: moduleFormat,
      file: `${outputDir}/${name}.${cjsExtension ? "cjs" : "js"}`,
      exports: "named",
      banner: "/* eslint-disable */",
    })
  }

  async function copyPackageJson() {
    const source = await fs.readJSON(resolve(__dirname, "../package.json"))
    source.name = packageName
    delete source.devDependencies
    delete source.private
    delete source.scripts
    delete source.prettier
    delete source.pnpm
    delete source.browserslist
    if (isESM) {
      source.type = "module"
    } else {
      delete source.module
    }
    await fs.writeJSON(resolve(OUT_DIR, "package.json"), source, { spaces: 2 })
  }

  async function reexport(name: string, dest: string, src: string, namedExports?: string) {
    const imports = namedExports ? `{${namedExports}}` : "*"
    const content = `export ${imports} from "${src}"`

    await fs.mkdirp(dest)
    await fs.writeFile(resolve(dest, name), await formatSource(content))
  }

  // https://github.com/jprichardson/node-fs-extra/issues/323
  const copy = (src: string, dest: string) => fs.copy(src, resolve(dest, src))

  await fs.remove(OUT_DIR)
  await fs.ensureDir(OUT_DIR)
  await Promise.all([
    copyPackageJson(),
    copy("types", OUT_DIR),
    copy("README.md", OUT_DIR),
    copy("CHANGELOG.md", OUT_DIR),
    copy("LICENSE", OUT_DIR),
    fs.writeFile(
      resolve(OUT_DIR, "index.d.ts"),
      /* javascript */ `export * from "./types/index.d";\nexport as namespace jsxDom;`
    ),
    fs.writeFile(
      resolve(OUT_DIR, "styled.macro.d.ts"),
      /* javascript */ `import { styled } from "./index.d";\nexport default styled;`
    ),
    fs.writeFile(
      resolve(OUT_DIR, "jsx-dev-runtime.js"),
      format === "esm"
        ? /* javascript */ `export * from "./jsx-runtime.js";`
        : /* javascript */ `module.exports = require("./jsx-runtime");`
    ),
    buildRollup("styled.macro", {
      moduleFormat: "cjs",
      cjsExtension: true,
      externals: Object.keys(dependencies).concat(Object.keys(devDependencies)),
    }),
    buildRollup("index", { inject: { __FULL_BUILD__: "true" } }),
    buildRollup("index", { outputDir: OUT_DIR_MIN, inject: { __FULL_BUILD__: "false" } }),
    buildRollup("jsx-runtime", {
      inject: { "./jsx-dom": packageName, delimiters: ["", ""] },
    }),
    reexport("jsx-dev-runtime.js", OUT_DIR_MIN, "./jsx-runtime.js"),
    reexport("jsx-runtime.js", OUT_DIR_MIN, "./index.js", jsxRuntimeExports),
    reexport("index.d.ts", OUT_DIR_MIN, "../index"),
    reexport("jsx-runtime.d.ts", OUT_DIR_MIN, "./index", jsxRuntimeExports),
    reexport("jsx-runtime.d.ts", OUT_DIR, "./index", jsxRuntimeExports),
  ])
}

Promise.all([
  build({ targetDir: "esm", format: "esm", packageName: "jsx-dom" }),
  build({ targetDir: "cjs", format: "cjs", packageName: "jsx-dom-cjs" }),
]).then(() => {
  console.log("Done")
})
