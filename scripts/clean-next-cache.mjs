import { rmSync } from 'node:fs'
rmSync('.next', { recursive: true, force: true })
