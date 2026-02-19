import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import replace from '@rollup/plugin-replace'
import {resolvePkgPath} from "../rollup/utils"
import path from "path";

// 为什么要用vite而不用webpack？
// 1. Vite在开发环境速度很快
// 2. 开发环境Vite的插件体系跟rollup完全兼容，生成环境则完全使用rollup打包
// https://vite.dev/config/
export default defineConfig({
  plugins: [react(),replace({
    __DEV__:true,
    preventAssignment: true
  })],
  resolve: {
    alias: [
      {
      // 如果找到vite项目中引用了react，就替换成我们打包好的react
     find:"react",
      replacement:resolvePkgPath("react")
    },
    {
     find:"react-dom",
      replacement:resolvePkgPath("react-dom")
    },
        {
     find:"hostConfig",
      replacement:path.resolve(resolvePkgPath('react-dom'),'./src/hostConfig.ts')
    },
    ]
  },
})