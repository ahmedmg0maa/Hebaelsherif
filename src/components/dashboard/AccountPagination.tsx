import Link from 'next/link'
export function AccountPagination({page,total,base}:{page:number;total:number;base:string}) {
  const pages=Math.max(1,Math.ceil(total/20))
  return <nav aria-label="صفحات النتائج" className="flex flex-wrap items-center justify-between gap-4 text-sm text-text-soft"><span>صفحة {page.toLocaleString('ar-EG')} من {pages.toLocaleString('ar-EG')} · {total.toLocaleString('ar-EG')} سجل</span><div className="flex gap-3">{page>1&&<Link rel="prev" className="min-h-12 content-center rounded-xl border border-line px-4" href={`${base}?page=${page-1}`}>السابق</Link>}{page<pages&&<Link rel="next" className="min-h-12 content-center rounded-xl border border-line px-4" href={`${base}?page=${page+1}`}>التالي</Link>}{page>pages&&<Link className="min-h-12 content-center" href={base}>أول صفحة</Link>}</div></nav>
}
