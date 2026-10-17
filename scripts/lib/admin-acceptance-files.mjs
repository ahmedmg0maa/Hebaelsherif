import {deflateSync} from 'node:zlib'

/** Original, structurally valid one-page PDF with a correct xref at an exact byte size. */
export function pdfFixture(size){
 let prefix='%PDF-1.7\n% Synthetic acceptance document\n',offsets=[0]
 const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 100 100] /Resources << >> /Contents 4 0 R >>','<< /Length 4 >>\nstream\nq\nQ\nendstream']
 for(const [i,object] of objects.entries()){offsets.push(Buffer.byteLength(prefix));prefix+=`${i+1} 0 obj\n${object}\nendobj\n`}
 const xref='xref\n0 5\n0000000000 65535 f \n'+offsets.slice(1).map(n=>String(n).padStart(10,'0')+' 00000 n \n').join('')+'trailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n'
 let position=size-200,tail=''
 for(let i=0;i<8;i++){tail=xref+position+'\n%%EOF\n';const next=size-Buffer.byteLength(tail);if(next===position)break;position=next}
 if(size<1024||position<=Buffer.byteLength(prefix))throw Error('PDF_FIXTURE_SIZE_INVALID')
 const bytes=Buffer.alloc(size,32);bytes.write(prefix);bytes[position-1]=10;bytes.write(tail,position);return bytes
}
function crc32(bytes){let n=0xffffffff;for(const byte of bytes){n^=byte;for(let i=0;i<8;i++)n=(n>>>1)^((n&1)?0xedb88320:0)}return (n^0xffffffff)>>>0}
function chunk(type,data){const name=Buffer.from(type),out=Buffer.alloc(data.length+12);out.writeUInt32BE(data.length);name.copy(out,4);data.copy(out,8);out.writeUInt32BE(crc32(Buffer.concat([name,data])),data.length+8);return out}
/** An original one-pixel PNG, padded by a valid ancillary chunk with a real CRC. */
export function pngFixture(size){
 const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(1);ihdr.writeUInt32BE(1,4);ihdr[8]=8;ihdr[9]=6
 const base=[Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',ihdr),chunk('IDAT',deflateSync(Buffer.from([0,232,222,203,255]))),chunk('IEND',Buffer.alloc(0))]
 const padding=size-base.reduce((n,b)=>n+b.length,0)-12;if(padding<3)throw Error('PNG_FIXTURE_SIZE_INVALID')
 const text=Buffer.alloc(padding,32);text[0]=81;text[1]=0
 return Buffer.concat([base[0],base[1],chunk('tEXt',text),base[2],base[3]])
}

const u32=n=>{const b=Buffer.alloc(4);b.writeUInt32BE(n);return b}
const atom=(type,...data)=>{const body=Buffer.concat(data);return Buffer.concat([u32(body.length+8),Buffer.from(type),body])}
const full=(type,...data)=>atom(type,Buffer.alloc(4),...data)
/** Original one-frame, 24-bit RGB QuickTime movie. Padding is a free atom.
 * Sample layout: https://developer.apple.com/documentation/quicktime-file-format/video_sample_description
 * This fixture tests transfer/registration, not browser codec playback support.
 */
export function movFixture(size){
 const matrix=Buffer.concat([u32(0x10000),u32(0),u32(0),u32(0),u32(0x10000),u32(0),u32(0),u32(0),u32(0x40000000)])
 const ftyp=atom('ftyp',Buffer.from('qt  '),u32(0),Buffer.from('qt  ')),mdat=atom('mdat',Buffer.from([232,222,203,0]))
 const mvhd=full('mvhd',u32(0),u32(0),u32(1000),u32(1000),u32(0x10000),Buffer.from([1,0]),Buffer.alloc(10),matrix,Buffer.alloc(24),u32(2))
 const tkhd=atom('tkhd',u32(3),u32(0),u32(0),u32(1),u32(0),u32(1000),Buffer.alloc(16),matrix,u32(0x10000),u32(0x10000))
 const mdhd=full('mdhd',u32(0),u32(0),u32(1000),u32(1000),Buffer.alloc(4))
 const hdlr=full('hdlr',u32(0),Buffer.from('vide'),Buffer.alloc(12),Buffer.from('Synthetic RGB\0'))
 const sample=Buffer.alloc(78);sample.writeUInt16BE(1,6);sample.writeUInt16BE(1,24);sample.writeUInt16BE(1,26);sample.writeUInt32BE(0x00480000,28);sample.writeUInt32BE(0x00480000,32);sample.writeUInt16BE(1,40);sample[42]=3;sample.write('RGB',43);sample.writeUInt16BE(24,74);sample.writeUInt16BE(0xffff,76)
 const stbl=atom('stbl',full('stsd',u32(1),atom('raw ',sample)),full('stts',u32(1),u32(1),u32(1000)),full('stsc',u32(1),u32(1),u32(1),u32(1)),full('stsz',u32(4),u32(1)),full('stco',u32(1),u32(ftyp.length+8)))
 const dinf=atom('dinf',full('dref',u32(1),atom('url ',u32(1))))
 const minf=atom('minf',atom('vmhd',u32(1),Buffer.alloc(8)),dinf,stbl)
 const moov=atom('moov',mvhd,atom('trak',tkhd,atom('mdia',mdhd,hdlr,minf)))
 const padding=size-ftyp.length-mdat.length-moov.length
 if(padding<8)throw Error('MOV_FIXTURE_SIZE_INVALID')
 return Buffer.concat([ftyp,mdat,moov,atom('free',Buffer.alloc(padding-8))])
}
