import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode, command }) => {
  const env = loadEnv(mode, process.cwd(), '')

  // ★ กันพลาดตอน deploy: ปิด mock แล้วแต่ลืมใส่ URL ของ backend
  //   ถ้าปล่อยผ่าน หน้าเว็บจะ build สำเร็จแล้วไปยิง localhost:3500 ของเครื่องผู้ใช้
  //   ซึ่งไม่มีอะไรอยู่ -> ทุกหน้าขึ้น "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้" โดยไม่มีอะไรบอกสาเหตุ
  if (command === 'build' && env.VITE_USE_MOCK !== 'true' && !env.VITE_API_URL) {
    throw new Error(
      'VITE_USE_MOCK=false แต่ไม่ได้ตั้ง VITE_API_URL — ตั้งค่าให้ครบก่อน build'
    )
  }

  if (command === 'build') {
    const mock = env.VITE_USE_MOCK === 'true'
    console.log(`\n[build] โหมด: ${mock ? 'MOCK (ข้อมูลปลอม)' : 'ของจริง -> ' + env.VITE_API_URL}\n`)
  }

  return { plugins: [react()] }
})
