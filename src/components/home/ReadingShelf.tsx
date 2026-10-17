'use client'
import {HOME_PRESENTATION} from '@/lib/home/presentation'
import Image from 'next/image'
import Link from 'next/link'
import {useState} from 'react'
import type {CatalogBook} from '@/lib/data/catalog'
import type {HomeArticle} from '@/lib/data/home'
import type {ArticlesContent} from '@/lib/home/sections'
export function ReadingShelf({books,articles,content}:{books:CatalogBook[];articles:HomeArticle[];content:ArticlesContent}){
 const [tab,setTab]=useState<'books'|'articles'>(books.length?'books':'articles')
 if(!books.length&&!articles.length)return null
 const entries=tab==='books'?books.map(x=>({href:`/books/${x.slug}`,title:x.title,cover:x.coverUrl,description:x.subtitle})):articles.map(x=>({href:`/articles/${x.slug}`,title:x.title,cover:x.coverUrl,description:x.excerpt}))
 return <section className="journey-surface border-y border-line bg-ivory px-5 py-14 sm:px-8"><div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1.4fr_1fr]">
  <div><p className="text-sm text-burgundy">{content.eyebrow}</p><h2 className="mt-3 font-heading text-3xl font-bold text-deep-teal sm:text-4xl">{content.heading}</h2><p className="mt-3 text-text-soft">{content.lead}</p>
   <div className="mt-6 flex flex-wrap gap-3 sm:gap-6 border-b border-line" role="tablist" aria-label="القراءات">{[['books','الكتب'],['articles','المقالات']].map(([id,label])=><button key={id} type="button" role="tab" aria-selected={tab===id} tabIndex={tab===id?0:-1} onKeyDown={event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const next=event.key==='Home'?'books':event.key==='End'?'articles':tab==='books'?'articles':'books';setTab(next);document.getElementById(`reading-${next}`)?.focus()}} aria-controls="reading-panel" id={`reading-${id}`} onClick={()=>setTab(id as 'books'|'articles')} className={`min-h-12 px-3 text-sm font-bold ${tab===id?'border-b-3 border-burgundy text-burgundy':'text-text-soft'}`}>{label}</button>)}<Link href={tab==='books'?'/books':'/articles'} className="ms-auto content-center text-sm text-deep-teal underline">{tab==='articles'?content.ctaLabel:'جميع الكتب'} ←</Link></div>
   <div role="tabpanel" tabIndex={0} id="reading-panel" aria-labelledby={`reading-${tab}`} className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">{entries.slice(0,3).map(item=><Link key={item.href} href={item.href} className="group min-w-0"><div className="relative aspect-[.78] overflow-hidden rounded-sm border border-line bg-surface-raised shadow-card">{item.cover?<Image src={item.cover} alt="" fill unoptimized sizes="180px" className={tab==='books'?'object-contain p-2':'object-cover'}/>:<span className="flex h-full items-center justify-center border-s-8 border-burgundy/35 p-4 text-center font-heading text-2xl text-deep-teal">{item.title}</span>}</div><h3 className="mt-3 text-sm font-bold leading-7 text-deep-teal">{item.title}</h3></Link>)}{!entries.length&&<p className="col-span-full py-10 text-sm text-text-soft">تظهر القراءات هنا بعد نشرها.</p>}</div>
  </div>
  <div className="relative min-h-72 overflow-hidden rounded-xl"><Image src={HOME_PRESENTATION.readingImage.url} alt={HOME_PRESENTATION.readingImage.alt} fill unoptimized sizes="(min-width:1024px) 40vw,100vw" className="object-cover"/></div>
 </div></section>
}
