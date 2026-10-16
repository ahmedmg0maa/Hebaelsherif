// Local-only preparation. Never uploads, opens provider accounts or deletes originals.
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { resolve, join } from 'node:path'

const [inputValue, outputValue] = process.argv.slice(2)
if (!inputValue || !outputValue || inputValue === '--help') {
  console.log('Usage: corepack pnpm prepare:video "input.mp4" "output-directory"\nRequires free local ffmpeg and ffprobe. Creates 5-minute 720p MP4 parts below 45 MB; inspect legibility before uploading.')
  process.exit(inputValue === '--help' ? 0 : 1)
}
const input = resolve(inputValue), destination = resolve(outputValue)
if (!existsSync(input) || !statSync(input).isFile()) throw Error('Input must be an existing local video file.')
if (existsSync(destination) && readdirSync(destination).length) throw Error('Choose a new or empty output directory; existing files will not be overwritten.')
function run(executable, args, capture = false) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(executable, args, { shell: false, stdio: ['ignore',capture?'pipe':'ignore','pipe'] })
    let output = '', diagnostic = ''
    child.stdout?.on('data', bytes => output += bytes)
    child.stderr.on('data', bytes => diagnostic = (diagnostic + bytes).slice(-1500))
    child.on('error', () => reject(Error(`Install ${executable} locally and add it to PATH.`)))
    child.on('exit', code => code === 0 ? resolvePromise(output) : reject(Error(`${executable} failed: ${diagnostic}`)))
  })
}
const metadata = JSON.parse(await run('ffprobe', ['-v','error','-show_entries','format=duration:stream=codec_type','-of','json',input], true))
const duration = Number(metadata.format?.duration)
if (!Number.isFinite(duration) || duration <= 0 || !metadata.streams?.some(stream => stream.codec_type === 'video')) throw Error('Cannot determine a valid video duration.')
mkdirSync(destination, { recursive: true })
const parts = []
for (let start = 0, index = 1; start < duration - 0.01; start += 300, index++) {
  const name = `lesson-part-${String(index).padStart(3,'0')}.mp4`, output = join(destination,name)
  console.log(`Preparing part ${index} / ${Math.ceil(duration / 300)}…`)
  await run('ffmpeg', ['-hide_banner','-loglevel','error','-nostdin','-n','-ss',String(start),'-i',input,'-t',String(Math.min(300,duration-start)),
    '-map','0:v:0','-map','0:a:0?','-vf',"scale=w='min(1280,iw)':h='min(720,ih)':force_original_aspect_ratio=decrease:force_divisible_by=2",
    '-r','24','-c:v','libx264','-preset','medium','-b:v','850k','-maxrate','1000k','-bufsize','2000k','-pix_fmt','yuv420p',
    '-c:a','aac','-b:a','96k','-movflags','+faststart',output])
  const bytes = statSync(output).size
  if (bytes > 45_000_000) throw Error(`Part ${index} exceeds the safety size. Split it further before upload; original file is untouched.`)
  const probe = JSON.parse(await run('ffprobe',['-v','error','-show_entries','format=duration','-of','json',output],true))
  const seconds = Number(probe.format?.duration)
  if (!Number.isFinite(seconds) || Math.abs(seconds-Math.min(300,duration-start)) > 1) throw Error(`Part ${index} duration mismatch. Inspect it before upload.`)
  parts.push({ file:name,bytes,durationSeconds:seconds,startsAtSeconds:start })
}
writeFileSync(join(destination,'VIDEO_PARTS.json'), JSON.stringify({ scope:'Local compression only; inspect text/audio quality. Each part is a separate lesson. Splitting does not increase free storage or transfer quotas.', originalDurationSeconds:duration,parts },null,2)+'\n')
console.log(`Prepared ${parts.length} parts. Review them, then upload each as a separate lesson in the existing curriculum editor.`)
