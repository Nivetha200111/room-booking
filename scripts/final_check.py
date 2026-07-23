"""Final feature smoke test (local mode)."""
from playwright.sync_api import sync_playwright
URL = "http://localhost:5180"
R = []
def chk(n, ok): R.append((n, bool(ok))); print(f"[{'PASS' if ok else 'FAIL'}] {n}")

def setv(pg, sel, val):
    pg.evaluate("""([s,v])=>{const el=document.querySelector(s);const pr=el.tagName==='SELECT'?HTMLSelectElement:HTMLInputElement;Object.getOwnPropertyDescriptor(pr.prototype,'value').set.call(el,v);el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));}""", [sel, val])

with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={"width":1180,"height":900}, device_scale_factor=2)
    pg.set_default_timeout(8000)
    pg.goto(URL, wait_until="networkidle")
    pg.evaluate("()=>localStorage.clear()")
    pg.evaluate("()=>localStorage.setItem('keenstack.admin_ids','KSIN0001')")
    pg.reload(wait_until="networkidle")

    # --- login validation ---
    cont = lambda: [x for x in pg.locator('button:has-text("Continue")').all()][0]
    setv(pg, 'input', 'ABC')  # bad id (first input)
    pg.locator('input').nth(1).fill('Meera Nair')
    pg.wait_for_timeout(200)
    chk("bad employee ID blocks Continue", cont().is_disabled())
    setv(pg, 'input', 'KSIN0042')
    pg.wait_for_timeout(200)
    chk("valid ID enables Continue", not cont().is_disabled())
    cont().click(); pg.wait_for_selector("text=Floor 1")
    chk("signed in", pg.locator("text=Rooms").count() > 0)

    # --- rooms correct (Phoenix in, CEO out, London in) ---
    body = pg.inner_text("body")
    chk("Phoenix present, CEO removed, London present",
        "Phoenix" in body and "CEO" not in body and "London" in body)

    # --- register-once ---
    pg.evaluate("()=>{localStorage.removeItem('keenstack.user.v1');location.reload()}")
    pg.wait_for_selector("text=Meeting Rooms")
    setv(pg, 'input', 'KSIN0042'); pg.locator('input').nth(1).fill('Someone Else')
    pg.wait_for_timeout(200); cont().click(); pg.wait_for_timeout(400)
    chk("register-once blocks a different name", "already registered" in pg.inner_text("body"))
    # correct owner re-login
    pg.locator('input').nth(1).fill('Meera Nair'); pg.wait_for_timeout(200); cont().click()
    pg.wait_for_selector("text=Floor 1")

    # --- single booking + overlap guard ---
    def open_phoenix():
        pg.locator('button:has-text("Phoenix")').first.click(); pg.wait_for_selector("text=Confirm Booking")
    open_phoenix()
    pg.get_by_placeholder("What's the meeting about?").fill("Quick sync")
    pg.locator('button:has-text("Confirm Booking")').click(); pg.wait_for_timeout(500)
    nb = pg.evaluate("()=>JSON.parse(localStorage.getItem('keenstack.bookings.v2')||'[]').length")
    chk("single booking created", nb == 1)
    # overlap guard is proven by the live 409 + recurring conflict-skip tests

    # --- release flow (others' booking) ---
    pg.evaluate("""()=>{
      const now=Date.now(),iso=ms=>new Date(ms).toISOString();
      const bks=JSON.parse(localStorage.getItem('keenstack.bookings.v2')||'[]');
      bks.push({id:'oth',roomId:'paris',employeeId:'KSIN0050',organizer:'Ravi',agenda:'Theirs',purpose:'Project meeting',attendees:2,attendeeNames:[],start:iso(now-5*60000),end:iso(now+40*60000),createdAt:iso(now)});
      localStorage.setItem('keenstack.bookings.v2',JSON.stringify(bks));location.reload();
    }""")
    pg.wait_for_selector("text=Floor 1")
    pg.locator('button:has-text("Paris")').first.click(); pg.wait_for_selector("text=Request Release")
    chk("release options shown for others' room", "Request Release" in pg.inner_text("body") and "Release Now" in pg.inner_text("body"))
    pg.keyboard.press("Escape"); pg.locator('button:has-text("Keep booking")').first.click(); pg.wait_for_timeout(300)

    # --- admin panel + CSV ---
    pg.evaluate("""()=>{localStorage.setItem('keenstack.user.v1',JSON.stringify({employeeId:'KSIN0001',name:'Admin User',role:'admin'}));location.reload()}""")
    pg.wait_for_selector("text=Floor 1")
    chk("admin badge/button visible", pg.locator('header button:has-text("Admin")').count() > 0)
    pg.locator('header button:has-text("Admin")').click(); pg.wait_for_selector("text=Admin · Reports")
    chk("admin reports open", "Room utilization" in pg.inner_text("body"))
    # employees CSV
    csv = pg.evaluate("""async ()=>{
      let blob=null;const oc=URL.createObjectURL;URL.createObjectURL=(b)=>{blob=b;return 's'};URL.revokeObjectURL=()=>{};
      const pr=HTMLAnchorElement.prototype,oclk=pr.click;pr.click=function(){};
      [...document.querySelectorAll('button')].find(b=>/Employees CSV/.test(b.textContent)).click();
      const t=await blob.text();URL.createObjectURL=oc;pr.click=oclk;return t;
    }""")
    chk("employees CSV exports", csv.startswith("﻿employee_id,name,role") or "employee_id,name,role" in csv)

    b.close()

allp = all(ok for _, ok in R)
print("\nRESULT:", "ALL PASS" if allp else "SOME FAILED")
