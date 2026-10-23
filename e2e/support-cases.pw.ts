import { expect, test } from '@playwright/test'
import type { SupportTicketDto } from '../src/types/api'

for (const scenario of ['onboarding-approved', 'onboarding-correction', 'onboarding-profile', 'lesson-report', 'review-report', 'customer-waiting'] as const) {
  test(`connected support case ${scenario} exposes contextual actions and a truthful lifecycle`,async({page},testInfo)=>{
    const onboarding=scenario.startsWith('onboarding')
    const customer=scenario==='customer-waiting'
    const teacher={id:'teacher-case-preview',headline:'מורה למתמטיקה',bio:'פרטי הניסיון של המורה לבדיקה',profile_status:'pending',review_reason:null as string|null,avatarUrl:null,
      profile:{first_name:'Case',last_name:'Teacher',contact_email:'teacher@example.com',phone:'0500000000'},subjects:[{subject:{name_he:'מתמטיקה'}}],support_ticket_id:'connected-case-preview'}
    const review={id:'review-case-preview',status:'published',rating:2,body:'התוכן המדויק של הביקורת המדווחת',teacher_reply:null,teacher_reply_status:null,teacher:{headline:teacher.headline,slug:'case-teacher'}}
    const ticket:SupportTicketDto={id:'connected-case-preview',user_id:'case-user',category:onboarding||customer?'onboarding':'report',subject:onboarding||customer?'בדיקת פרופיל המורה':'בירור דיווח מקושר',message:'המידע המקורי לבדיקת הצוות נשמר כאן.',status:customer?'waiting_customer':'open',created_at:'2026-10-23T12:00:00Z',updated_at:'2026-10-23T12:00:00Z',
      workflow:onboarding||customer?'onboarding':null,teacher_id:onboarding||customer?teacher.id:null,payment_id:null,review_id:scenario==='review-report'?review.id:null,inquiry_id:scenario==='lesson-report'?'inquiry-case-preview':null,messages:customer?[{id:'correction',author_role:'system',body:'יש להשלים את פרטי הניסיון ולשלוח מחדש.',created_at:'2026-10-23T12:01:00Z'}]:[],requester_teacher:onboarding?{id:teacher.id,slug:'case-teacher'}:null}
    const writes:{path:string;body:Record<string,unknown>}[]=[]
    const reads:string[]=[]
    const errors:string[]=[]
    page.on('pageerror',error=>errors.push(error.message))
    await page.route('http://localhost:5146/api/**',async route=>{
      const request=route.request()
      const url=new URL(request.url())
      const path=url.pathname.replace('/api','')
      const headers={'access-control-allow-origin':'http://localhost:5176','access-control-allow-methods':'GET,POST,PATCH,OPTIONS','access-control-allow-headers':'content-type,authorization'}
      if(request.method()==='OPTIONS')return route.fulfill({status:204,headers})
      const pagination=(items:unknown[])=>({items,page:1,limit:10,hasMore:false})
      if(request.method()==='GET'){
        reads.push(path+url.search)
        if(path==='/admin/support-tickets')return route.fulfill({headers,json:pagination(['open','in_progress'].includes(ticket.status)?[ticket]:[])})
        if(path===`/admin/support-tickets/${ticket.id}`||path===`/support/tickets/${ticket.id}`)return route.fulfill({headers,json:ticket})
        if(path==='/admin/teachers')return route.fulfill({headers,json:pagination(url.searchParams.has('teacherId')||teacher.profile_status==='pending'?[teacher]:[])})
        if(path==='/admin/reviews')return route.fulfill({headers,json:pagination([review])})
        if(path===`/admin/inquiries/${ticket.inquiry_id}`)return route.fulfill({headers,json:{id:ticket.inquiry_id,status:'accepted',lesson_status:'no_show_reported',message:'בקשת השיעור המקורית',requested_start_at:'2026-10-23T12:00:00Z',student:{first_name:'Case',last_name:'Student'},teacher:{profile:teacher.profile}}})
        return route.fulfill({status:404,headers,json:null})
      }
      const body=request.postDataJSON()
      writes.push({path,body})
      if(path===`/admin/teachers/${teacher.id}/approve`||path===`/admin/teachers/${teacher.id}/reject`){
        const approve=path.endsWith('/approve')
        teacher.profile_status=approve?'published':'draft'
        teacher.review_reason=approve?null:String(body.reason)
        ticket.status=approve?'resolved':'waiting_customer'
        ticket.messages!.push({id:'decision',author_role:'system',body:approve?'פרופיל המורה אושר ופורסם. הפנייה נסגרה אוטומטית.':`הפרופיל הוחזר לתיקון: ${body.reason}`,created_at:'2026-10-23T12:02:00Z'})
        return route.fulfill({headers,json:teacher})
      }
      if(path===`/admin/reviews/${review.id}`){
        review.status=String(body.status)
        return route.fulfill({headers,json:review})
      }
      if(path===`/admin/support-tickets/${ticket.id}/messages`||path===`/support/tickets/${ticket.id}/messages`){
        ticket.status=customer?'open':body.status
        const message={id:'reply',author_role:customer?'user' as const:'admin' as const,body:String(body.body),created_at:'2026-10-23T12:03:00Z'}
        ticket.messages!.push(message)
        return route.fulfill({headers,json:message})
      }
      return route.fulfill({headers,status:400,json:{message:'Unexpected preview mutation'}})
    })
    const source=await(await page.request.get('/src/features/account/AdminEngagementPanel.tsx')).text()
    const main=await(await page.request.get('/src/main.tsx')).text()
    const dependency=(text:string,name:string)=>{
      const path=[...text.matchAll(/from\s+["']([^"']+)["']/g)].map(match=>match[1]).find(path=>path.includes(`/${name}.js`))
      if(!path)throw new Error(`Missing preview module ${name}`)
      return path
    }
    const modules={react:dependency(source,'react'),dom:dependency(main,'react-dom_client'),query:dependency(source,'@tanstack_react-query'),router:dependency(source,'react-router-dom')}
    await page.route('http://localhost:5176/connected-case-preview',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><html dir="rtl" lang="he"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/src/index.css"></head><body><main id="preview" class="page-shell py-8"></main></body></html>'}))
    await page.goto('/connected-case-preview')
    await page.evaluate(async({modules,scenario,ticketId,teacherId})=>{
      const refresh=await import('/@react-refresh')
      refresh.default.injectIntoGlobalHook(window)
      Object.assign(window,{$RefreshReg$:()=>{},$RefreshSig$:()=>(type:unknown)=>type,__vite_plugin_react_preamble_installed__:true})
      const [react,dom,query,router,panel,support,admin]=await Promise.all([
        import(/* @vite-ignore */ modules.react),import(/* @vite-ignore */ modules.dom),import(/* @vite-ignore */ modules.query),import(/* @vite-ignore */ modules.router),
        import('/src/features/account/AdminEngagementPanel.tsx'),import('/src/pages/SupportPage.tsx'),import('/src/pages/AdminPage.tsx'),
      ])
      const React=react.default??react
      const ReactDOM=dom.default??dom
      const customer=scenario==='customer-waiting'
      const profile=scenario==='onboarding-profile'
      const component=customer?React.createElement(support.SupportThread,{id:ticketId}):React.createElement(profile?admin.AdminOnboardingPage:panel.AdminSupportPage)
      ReactDOM.createRoot(document.getElementById('preview')!).render(React.createElement(query.QueryClientProvider,{client:new query.QueryClient({defaultOptions:{queries:{retry:false}}})},
        React.createElement(router.MemoryRouter,{initialEntries:[customer?`/support/${ticketId}`:profile?`/admin/onboarding?teacher=${teacherId}`:`/admin/support?ticket=${ticketId}`]},component)))
    },{modules,scenario,ticketId:ticket.id,teacherId:teacher.id})
    if(onboarding){
      await expect(page.getByText(teacher.bio,{exact:true})).toBeVisible()
      if(scenario==='onboarding-profile')await expect(page.getByRole('link',{name:'פניית בדיקת הפרופיל'})).toHaveAttribute('href',`/admin/support?ticket=${ticket.id}#support`)
      else await expect(page.locator(`a[href="/admin/support?ticket=${ticket.id}#support"]`)).toHaveCount(1)
      const correction=scenario==='onboarding-correction'
      if(correction)await page.getByRole('textbox',{name:'סיבת החזרה לתיקון'}).fill('יש להשלים פרטים על הניסיון בהוראה')
      await page.getByRole('button',{name:correction?'החזרה לתיקון':'אישור ופרסום',exact:true}).click()
      await expect(page.getByRole('dialog')).toContainText(correction?'הפנייה תמתין לפרטים':'פניית הבדיקה תיסגר')
      expect(writes).toEqual([])
      await page.getByRole('button',{name:'שמירת ההחלטה'}).click()
      await expect.poll(()=>writes.length).toBe(1)
      expect(writes[0].path).toBe(`/admin/teachers/${teacher.id}/${correction?'reject':'approve'}`)
      if(scenario!=='onboarding-profile'){
        await expect(page.getByRole('combobox',{name:'מצב לאחר שליחת המענה'})).toHaveValue(correction?'waiting_customer':'resolved')
        await expect(page.locator('.support-message').filter({hasText:'עדכון אוטומטי של מורהלי'})).toContainText(correction?'יש להשלים פרטים':'הפנייה נסגרה אוטומטית')
        await expect(page.getByRole('textbox',{name:'מענה למשתמש'})).toHaveValue('')
      }
    }else if(scenario==='lesson-report'){
      const context=page.getByRole('region',{name:'הפנייה והשיעור הקשורים'})
      for(const text of ['Case Student','Case Teacher','דווחה אי-הגעה','שעון ישראל'])await expect(context).toContainText(text)
      await expect(context.getByRole('link',{name:'בירור הפנייה והשיעור'})).toHaveAttribute('href',`/admin/activity?inquiry=${ticket.inquiry_id}`)
      expect(writes).toEqual([])
    }else if(scenario==='review-report'){
      const context=page.getByRole('region',{name:'התוכן שדווח'})
      await expect(context).toContainText(review.body)
      await expect(context.getByRole('link',{name:'פתיחה בניהול הביקורות'})).toHaveAttribute('href',`/admin/reviews?review=${review.id}`)
      expect(reads.some(path=>path.includes(`reviewId=${review.id}`))).toBe(true)
      await context.getByRole('button',{name:'הסרה מפרסום'}).click()
      await expect(context).toContainText('מצב הביקורת: לא אושרה')
      expect(ticket.status).toBe('open')
      await page.getByRole('textbox',{name:'מענה למשתמש'}).fill('בדקנו את הדיווח והסרנו את התוכן מפרסום.')
      await page.getByRole('combobox',{name:'מצב לאחר שליחת המענה'}).selectOption('resolved')
      await page.getByRole('button',{name:'שליחת מענה וסגירת הפנייה'}).click()
      await expect.poll(()=>ticket.status).toBe('resolved')
      expect(writes).toHaveLength(2)
    }else{
      await expect(page.getByRole('status')).toContainText('הצוות ממתין לפרטים מכם')
      await expect(page.getByRole('link',{name:'לפרופיל המורה ולשליחה מחדש'})).toHaveAttribute('href','/teacher/onboarding')
      await expect(page.getByRole('combobox')).toHaveCount(0)
      await page.getByRole('textbox',{name:'הוספת פרטים'}).fill('הוספתי פרטים נוספים לבירור עם הצוות')
      await page.getByRole('button',{name:'שליחת מענה'}).click()
      await expect(page.getByRole('status')).toHaveCount(0)
      expect(ticket.status).toBe('open')
      expect(writes).toEqual([{path:`/support/tickets/${ticket.id}/messages`,body:{body:'הוספתי פרטים נוספים לבירור עם הצוות'}}])
    }
    await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
    expect(errors).toEqual([])
    await page.screenshot({path:testInfo.outputPath(`${scenario}.png`),fullPage:true})
  })
}
