'use client'

import { FormField, FormSelect, FormTextarea } from '@/components/ui/FormField'
import type { ComponentProps } from 'react'

type Guidance = { description: string; example: string }
const guidance: Record<string, Guidance> = {
 file:{description:'اختاري الملف من جهازك؛ يبدأ النقل عند الضغط على الرفع، وتُفحص البيانات قبل التسجيل.',example:'صورة غلاف بصيغة WebP'},
 bucket:{description:'مكان حفظ الملف. العامة متاحة للزائرات، والخاصة تحتاج وصولًا مصرحًا. الربط بالدرس يتم من محرر المنهج.',example:'وسائط عامة لغلاف الكورس'},
 alt:{description:'وصف دقيق للصورة لمن لا تستطيع رؤيتها، ويُستخدم بدلًا منها عند تعذر تحميلها.',example:'مكتب ودفتر مفتوح بجوار نافذة'},
 tags:{description:'كلمات للتنظيم والبحث في المكتبة، تفصل بينها فاصلة لاتينية.',example:'courses, covers'},
 folder:{description:'اسم مجلد تنظيمي بحروف لاتينية وأرقام وشرطة؛ لا يغيّر حقوق الوصول.',example:'course-covers'},
 rights_status:{description:'اختاري وضع حقوق الاستخدام الحقيقي. الغلاف العام يحتاج إثبات الملكية أو الترخيص.',example:'مرخّص عند وجود ترخيص صحيح'},
 rights_reference:{description:'مرجع يثبت حق استخدام الصورة دون أسرار أو بيانات حساسة.',example:'رقم الترخيص أو رابط المصدر المصرح'},
 caption:{description:'تعليق يُعرض بجوار الصورة حيث يدعم القسم ذلك.',example:'لحظة للكتابة والتأمل'},
 credit:{description:'اسم المصوّر أو الجهة المطلوب نسب الصورة إليها.',example:'الاسم المذكور في ترخيص الصورة'},
 focal_x:{description:'موضع مركز القص أفقيًا؛ الصفر يسار و100 يمين.',example:'50 لإبقاء منتصف الصورة'},
 focal_y:{description:'موضع مركز القص رأسيًا؛ الصفر أعلى و100 أسفل.',example:'50 لإبقاء منتصف الصورة'},
 heading:{description:'عنوان هذا القسم الذي يراه الزوار؛ اجعليه قصيرًا وواضحًا.',example:'خطوتك القادمة تبدأ بالفهم'},
 eyebrow:{description:'سطر تعريفي قصير فوق عنوان القسم.',example:'مساحة للتعلم'},
 lead:{description:'وصف يمهد للقسم ويوضح فائدته للقارئة.',example:'استكشفي المسارات واختاري ما يناسب احتياجاتك'},
 excerpt:{description:'ملخص يشجع على قراءة المحتوى دون تكرار المقال كاملًا.',example:'خطوات صغيرة لترتيب الأولويات اليومية'},
 body:{description:'المحتوى الأساسي الذي يظهر في الصفحة؛ اكتبي فقرات واضحة.',example:'مقدمة، ثم خطوات عملية، ثم خاتمة مناسبة'},
 content:{description:'النص الكامل الذي يظهر للقارئة بعد نشر المحتوى.',example:'مقدمة الفكرة ثم التفاصيل والتطبيق'},
 seo_title:{description:'عنوان مختصر يساعد على فهم الصفحة في نتائج البحث.',example:'عنوان المقال — هبة الشريف'},
 seo_description:{description:'ملخص دقيق للصفحة يظهر أحيانًا تحت رابطها في البحث.',example:'تعرفي على موضوع الصفحة وفائدته في جملة واضحة'},
 publish_at:{description:'موعد مستقبلي للنشر عند اختيار حالة مجدولة، بتوقيت القاهرة.',example:'يوم بداية التسجيل الساعة 10:00'},
 original_url:{description:'رابط المصدر الأصلي للظهور الإعلامي، مع HTTPS.',example:'رابط المقال على موقع الجهة الأصلية'},
 outlet:{description:'اسم الجهة التي نشرت الظهور الإعلامي.',example:'اسم الصحيفة أو القناة'},
 topic:{description:'الموضوع الذي يُصنف تحته هذا المحتوى.',example:'فهم الذات'},
 transcript:{description:'النص المكتوب لما يقال في الفيديو أو الصوت لتحسين الإتاحة.',example:'تفريغ المقدمة والخطوات بالترتيب'},
 captions:{description:'وصف التسميات أو وسائل الإتاحة المتوفرة للمشاهدة.',example:'ترجمة عربية مرفقة بالمقطع'},
 expiry_hours:{description:'الوقت المتاح للعميلة لإتمام الدفع قبل انتهاء الطلب غير المدفوع.',example:'72 ساعة تعني ثلاثة أيام'},
 slot_interval:{description:'الفارق بين بدايات المواعيد المقترحة؛ مدة الجلسة وفواصل الراحة تُحسب منفصلة.',example:'30 دقيقة لإظهار 10:00 ثم 10:30'},
 max_per_day:{description:'حد الحجوزات اليومية للخدمة؛ لا يسمح بتجاوز ساعات هبة أو تداخل الجلسات.',example:'عدد الجلسات المناسب لقدرتك اليومية'},
 instapay_handle:{description:'عنوان التحويل الحقيقي الذي سيظهر للعميلة عند الدفع. اتركي الوسيلة فارغة لإخفائها.',example:'العنوان المسجل في تطبيق InstaPay'},
 instapay_name:{description:'اسم مستلمة التحويل كما يظهر في تطبيق البنك. مطلوب عند إضافة عنوان InstaPay.',example:'اسم صاحبة الحساب المسجّل'},
 wallet_number:{description:'رقم المحفظة الفعلي لاستقبال الدفع. اتركي بيانات الوسيلة فارغة لإخفائها.',example:'رقم الهاتف المرتبط بالمحفظة'},
 wallet_provider:{description:'اسم شركة المحفظة التي تستقبل الدفع. مطلوب عند إضافة رقم محفظة.',example:'اسم مقدم خدمة المحفظة'},
 bank_name:{description:'اسم البنك الذي يستقبل التحويلات. مطلوب مع رقم الحساب.',example:'اسم البنك كما في كشف الحساب'},
 bank_iban:{description:'رقم الحساب الدولي الصحيح بحروف لاتينية وأرقام؛ لا تضعي مسافات.',example:'رقم IBAN الذي يوفره البنك'},
 bank_owner:{description:'اسم المستفيدة المسجل في البنك. مطلوب مع IBAN.',example:'الاسم كما يظهر في بيانات الحساب'},
 title: { description: 'الاسم الذي يظهر للعميلة في الموقع.', example: 'جلسة فردية لفهم الذات' },
 slug: { description: 'الجزء الأخير من رابط الصفحة؛ استخدمي حروفًا لاتينية وأرقامًا وشرطة دون مسافات.', example: 'self-understanding' },
 subtitle: { description: 'جملة قصيرة تحت العنوان توضح فائدة المحتوى.', example: 'مساحة لفهم احتياجاتك وخطوتك القادمة' },
 description: { description: 'اكتبي ما ستحصل عليه العميلة ولمن يناسب هذا المحتوى، دون وعود غير معتمدة.', example: 'هذه الجلسة مناسبة لمن ترغب في تحديد أولوياتها…' },
 price: { description: 'السعر المعتمد الذي يُحسب عند الطلب. الصفر يعني محتوى مجانيًا.', example: 'أدخلي السعر الذي اعتمدتِه بالعملة المحددة' },
 compare_at_price: { description: 'سعر سابق حقيقي أعلى من السعر الحالي؛ اتركيه فارغًا إن لم يوجد.', example: 'سعر البيع قبل التخفيض المعتمد' },
 currency: { description: 'رمز عملة السعر؛ يجب أن يطابق إعدادات الدفع.', example: 'EGP للجنيه المصري' },
 sort: { description: 'الأرقام الأصغر تظهر أولًا في القائمة.', example: '0 ثم 1 ثم 2' },
 duration_minutes: { description: 'الوقت الفعلي للجلسة أو المحتوى بالدقائق. مدة الجلسة تُستخدم لحساب المواعيد.', example: '60 دقيقة' },
 buffer_before_minutes: { description: 'راحة تُحجز قبل البداية وتمنع أي جلسة أخرى خلالها. يجب أن تبدأ داخل ساعات العمل.', example: '15 دقيقة' },
 buffer_after_minutes: { description: 'راحة تُحجز بعد النهاية وتمنع أي جلسة أخرى خلالها. يجب أن تنتهي داخل ساعات العمل.', example: '15 دقيقة' },
 minimum_notice_minutes: { description: 'أقل وقت بين لحظة الحجز وبداية الجلسة.', example: '1440 دقيقة تعني يومًا كاملًا' },
 booking_window_days: { description: 'أبعد يوم يمكن للعميلة الحجز فيه بدءًا من اليوم.', example: '30 يومًا' },
 hold_minutes: { description: 'مدة حجز الموعد مؤقتًا أثناء إتمام الطلب، ثم يتحرر إن لم يُستكمل.', example: '10 دقائق' },
 cancellation_notice_hours: { description: 'المهلة المطلوبة قبل الجلسة للسماح بإلغائها من حساب العميلة.', example: '24 ساعة' },
 reschedule_notice_hours: { description: 'المهلة المطلوبة قبل الجلسة لطلب تغيير الموعد.', example: '24 ساعة' },
 max_reschedules: { description: 'أقصى عدد تغييرات تقبلها سياسة الجلسة.', example: '2؛ الصفر يمنع طلب التغيير' },
 booking_policy_note: { description: 'سياسة واضحة تظهر قبل الحجز، تشمل الإلغاء والتغيير وطريقة اللقاء.', example: 'يمكن طلب تغيير الموعد قبل الجلسة بـ…' },
 booking_payment_mode: { description: 'حددي هل يلزم الدفع أم أن الجلسة مجانية. يجب أن يتفق الاختيار مع السعر.', example: 'مجاني مع سعر صفر' },
 level: { description: 'مستوى المعرفة المناسب للمشاركة في الكورس.', example: 'مبتدئ لمن تبدأ التعلم' },
 minutes: { description: 'مدة مشاهدة الدرس بالدقائق؛ تساعد العميلة على تنظيم وقتها.', example: '12 دقيقة' },
 author: { description: 'اسم مؤلفة الكتاب كما يظهر في صفحته.', example: 'الاسم المعتمد على الغلاف' },
 pages_count: { description: 'عدد صفحات نسخة الكتاب التي تُسلّم للعميلة.', example: '120 صفحة' },
 starts_at: { description: 'موعد البداية بتوقيت القاهرة؛ يتغير فرق التوقيت تلقائيًا مع التوقيت الصيفي.', example: 'اختاري التاريخ ثم الساعة 10:00' },
 ends_at: { description: 'موعد النهاية بتوقيت القاهرة، ويجب أن يأتي بعد البداية.', example: 'نفس اليوم الساعة 12:00' },
 meeting_url: { description: 'رابط اللقاء الذي يُتاح للعميلة المستحقة؛ استخدمي رابطًا آمنًا.', example: 'https://meet.google.com/…' },
 admin_notes: { description: 'ملاحظة للإدارة لا تظهر للعميلة.', example: 'تم التواصل لتأكيد وسيلة اللقاء' },
 reason: { description: 'سبب داخلي للتعديل لا يُعرض للزائرات.', example: 'إجازة أو موعد خاص' },
 date: { description: 'اليوم المقصود حسب تقويم القاهرة.', example: 'اختاري يومًا من التقويم' },
 start_time: { description: 'بداية الفترة بتوقيت القاهرة.', example: '10:00 صباحًا' },
 end_time: { description: 'نهاية الفترة؛ يجب أن تكون بعد البداية.', example: '20:00 تعني 8 مساءً' },
 weekday: { description: 'اليوم الذي تتكرر فيه هذه الفترة أسبوعيًا.', example: 'الأحد' },
 mode: { description: 'اختاري أثر التعديل على المواعيد المتاحة.', example: 'إغلاق فترة لمنع حجز جديد خلالها' },
 kind: { description: 'اختاري النوع المناسب لطريقة عرض هذا المحتوى.', example: 'اختاري من القائمة حسب الغرض' },
 status: { description: 'حالة هذا السجل؛ المسودة والمحتوى المخفي لا يظهران للزائرات. راجعي أثر الاختيار قبل الحفظ.', example: 'مسودة أثناء إعداد المحتوى' },
 query: { description: 'ابحثي في الاسم والخدمة والملاحظات. لا يُحفظ نص البحث على الجهاز.', example: 'اسم العميلة أو الجلسة' },
 location_text: { description: 'العنوان أو وصف مكان اللقاء للحضور.', example: 'اسم المكان والعنوان التفصيلي' },
 location_kind: { description: 'طريقة حضور الورشة، وتحدد بيانات المكان المطلوبة.', example: 'أونلاين عند استخدام رابط لقاء' },
 seats_total: { description: 'العدد الفعلي للمقاعد المتاحة للحجز.', example: 'عدد المقاعد المعتمد للورشة' },
 code: { description: 'رمز تكتبه العميلة عند الطلب للاستفادة من الخصم.', example: 'WELCOME؛ مثال توضيحي وليس كوبونًا مفعّلًا' },
 discount_kind: { description: 'هل التخفيض نسبة من السعر أم مبلغ بالجنيه؟', example: 'نسبة مئوية لحساب جزء من السعر' },
 discount_value: { description: 'قيمة التخفيض؛ النسبة لا تتجاوز 100. يختار الطلب أفضل عرض واحد، ثم يطبّق الكوبون وفق قواعده.', example: '10 تعني 10٪ عند اختيار نسبة مئوية' },
 badge_text: { description: 'نص قصير يظهر على بطاقة العرض.', example: 'لفترة محدودة حتى الموعد المحدد' },
 usage_limit: { description: 'أقصى عدد طلبات تستفيد من العرض. اتركيه فارغًا دون حد.', example: 'عدد المستفيدات المعتمد للحملة' },
 value: { description: 'مقدار الخصم وفق النوع المختار؛ النسبة بين 0 و100.', example: '10 تعني 10٪ عند اختيار نسبة' },
 max_uses: { description: 'حد إجمالي للاستفادة من الكوبون؛ الفراغ يعني دون حد.', example: 'العدد المعتمد للحملة' },
 max_uses_per_user: { description: 'عدد مرات استفادة العميلة الواحدة من الكوبون.', example: '1 للاستفادة مرة واحدة' },
}

function help(name: string, label: string, required?: boolean, hint?: string, example?: string, limits?: string) {
 const aliases:Record<string,string>={buffer_before:'buffer_before_minutes',buffer_after:'buffer_after_minutes',minimum_notice:'minimum_notice_minutes',horizon_days:'booking_window_days',cancel_notice_hours:'cancellation_notice_hours',exception_start:'start_time',exception_end:'end_time',run_at:'starts_at'}
 const base=name.replace(/_\d+$/,'')
 const semantic=base.includes('href')?'cta_href':base.includes('cta')?'cta_label':base.includes('title')?'title':base.includes('text')?'body':base
 const entry=guidance[aliases[name]??name]??guidance[semantic]
 return <><span className="block">{hint ?? entry?.description ?? `اكتبي ${label} كما تريدين حفظه وعرضه في هذا القسم.`}</span>
   <span className="mt-1 block">مثال توضيحي: {example ?? entry?.example ?? label}.</span>
   <span className="mt-1 block font-semibold">{required ? 'مطلوب' : 'اختياري'}{limits ? ` · ${limits}` : ''}</span></>
}
type Extra = { example?: string; limits?: string }
const textLimits:Record<string,number>={title:180,slug:80,subtitle:240,description:30000,alt:500,tags:1000,folder:80,caption:500,credit:200,rights_reference:500,cta_label:80,cta_href:180,terms:2000,booking_policy_note:4000,reason:500}
export function AdminField({hint,example,limits,...props}: ComponentProps<typeof FormField> & Extra) {
 if(props.maxLength==null&&(!props.type||['text','url','search'].includes(props.type)))props.maxLength=textLimits[props.name]
 const bounds=limits ?? [props.minLength!=null?`على الأقل ${props.minLength} أحرف`:'',props.maxLength!=null?`حتى ${props.maxLength} حرف`:'',props.min!=null?`الحد الأدنى ${props.min}`:'',props.max!=null?`الحد الأقصى ${props.max}`:''].filter(Boolean).join(' · ')
 return <FormField {...props} hint={help(props.name,props.label,props.required,typeof hint==='string'?hint:undefined,example,bounds)}/>
}
export function AdminTextarea({hint,example,limits,...props}: ComponentProps<typeof FormTextarea> & Extra) {
 props.maxLength??=textLimits[props.name]
 return <FormTextarea {...props} hint={help(props.name,props.label,props.required,typeof hint==='string'?hint:undefined,example,limits ?? (props.maxLength?`حتى ${props.maxLength} حرف`:undefined))}/>
}
export function AdminSelect({hint,example,limits,...props}: ComponentProps<typeof FormSelect> & Extra) {
 return <FormSelect {...props} hint={help(props.name,props.label,props.required,typeof hint==='string'?hint:undefined,example,limits)}/>
}
