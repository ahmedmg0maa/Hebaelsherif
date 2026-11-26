// Civil-date arithmetic only. Actual appointment instants are converted through
// Africa/Cairo elsewhere; never infer Cairo's offset from a fixed hour count.
export type CalendarView='day'|'week'|'month'
export function validCalendarDate(value:string) {
 return /^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value
}
export function addCalendarDays(date:string,days:number) {
 const d=new Date(`${date}T12:00:00Z`);d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10)
}
export function calendarDays(anchor:string,view:CalendarView) {
 const day=new Date(`${anchor}T12:00:00Z`)
 const start=view==='month'?anchor.slice(0,7)+'-01':view==='week'?addCalendarDays(anchor,-day.getUTCDay()):anchor
 const length=view==='month'?new Date(Date.UTC(day.getUTCFullYear(),day.getUTCMonth()+1,0)).getUTCDate():view==='week'?7:1
 return Array.from({length},(_,i)=>addCalendarDays(start,i))
}
export function moveCalendar(anchor:string,view:CalendarView,direction:number) {
 if(view!=='month')return addCalendarDays(anchor,direction*(view==='week'?7:1))
 const d=new Date(`${anchor.slice(0,7)}-01T12:00:00Z`);d.setUTCMonth(d.getUTCMonth()+direction);return d.toISOString().slice(0,10)
}
