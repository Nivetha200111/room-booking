"""End-to-end test of recurring bookings (local mode)."""
import datetime, json
from playwright.sync_api import sync_playwright

URL = "http://localhost:5180"

# next Monday
today = datetime.date.today()
monday = today + datetime.timedelta(days=(7 - today.weekday()) % 7 or 7)
friday = monday + datetime.timedelta(days=4)
wednesday = monday + datetime.timedelta(days=2)
def dt(d, h): return f"{d.isoformat()}T{h:02d}:00"

SETVAL = """([sel,val]) => {
  const el = document.querySelector(sel);
  const proto = el.tagName==='SELECT'?HTMLSelectElement:HTMLInputElement;
  Object.getOwnPropertyDescriptor(proto.prototype,'value').set.call(el,val);
  el.dispatchEvent(new Event('input',{bubbles:true}));
  el.dispatchEvent(new Event('change',{bubbles:true}));
}"""

results = []
def check(name, ok): results.append((name, bool(ok))); print(f"[{'PASS' if ok else 'FAIL'}] {name}")

with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={"width":1180,"height":900}, device_scale_factor=2)
    pg.set_default_timeout(8000)
    pg.goto(URL, wait_until="networkidle")
    pg.evaluate("""() => {
      localStorage.clear();
      localStorage.setItem('keenstack.user.v1', JSON.stringify({employeeId:'KSIN0042',name:'Meera Nair',role:'employee'}));
    }""")
    pg.reload(wait_until="networkidle"); pg.wait_for_selector("text=Floor 1")

    def open_phoenix():
        pg.locator('button:has-text("Phoenix")').first.click()
        pg.wait_for_selector("text=Confirm Booking")

    def set_form(start, end, repeat=None, until=None, agenda="Daily standup"):
        pg.get_by_placeholder("What's the meeting about?").fill(agenda)
        pg.evaluate(SETVAL, ['input[type="datetime-local"]', start])
        pg.evaluate(SETVAL, ['input[type="datetime-local"]:nth-of-type(1)', start])
        dts = pg.locator('input[type="datetime-local"]')
        pg.evaluate(SETVAL, ["input[type=\"datetime-local\"]", start])
        # set both datetime inputs explicitly by index via JS
        pg.evaluate("""([s,e]) => {
          const ins=[...document.querySelectorAll('input[type=datetime-local]')];
          const setv=(el,v)=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,v);el.dispatchEvent(new Event('input',{bubbles:true}));};
          setv(ins[0],s); setv(ins[1],e);
        }""", [start, end])
        if repeat:
            pg.evaluate(SETVAL, ['select:near(:text("Repeat"))', repeat]) if False else None
            # the repeat select is the 2nd select (1st is Purpose)
            pg.evaluate("""(val)=>{
              const sels=[...document.querySelectorAll('select')];
              const el=sels[sels.length-1];
              Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(el,val);
              el.dispatchEvent(new Event('change',{bubbles:true}));
            }""", repeat)
        if until:
            pg.evaluate(SETVAL, ['input[type="date"]', until])
        pg.wait_for_timeout(300)

    # 1) weekday series Mon-Fri 9-10
    open_phoenix()
    set_form(dt(monday,9), dt(monday,10), repeat="weekdays", until=friday.isoformat())
    preview = pg.inner_text("body")
    check("preview shows 'Creates 5 bookings'", "Creates" in preview and "5 booking" in preview)
    btn = pg.locator('button:has-text("Book 5 slot")')
    check("button reads 'Book 5 slots'", btn.count() > 0)
    btn.first.click()
    pg.wait_for_timeout(500)
    bks = pg.evaluate("() => JSON.parse(localStorage.getItem('keenstack.bookings.v2')||'[]')")
    check("5 bookings created", len(bks) == 5)
    series_ids = set(b.get("seriesId") for b in bks)
    check("all share one seriesId", len(series_ids) == 1 and None not in series_ids)
    days = sorted(set(b["start"][:10] for b in bks))
    check("spans Mon..Fri (5 distinct weekdays)", len(days) == 5 and days[0]==monday.isoformat() and days[-1]==friday.isoformat())

    # 2) conflict skipping: repeat again over same week -> all 5 clash -> 0 bookable
    open_phoenix()
    set_form(dt(monday,9), dt(monday,10), repeat="weekdays", until=friday.isoformat())
    pv2 = pg.inner_text("body")
    check("conflict preview flags clashes", ("clash" in pv2) and ("Creates 0" in pv2 or "skipped" in pv2))
    # confirm button disabled when 0 bookable
    book_btn = pg.locator('button:has-text("Book 0")')
    disabled = book_btn.first.is_disabled() if book_btn.count() else True
    check("cannot book when all clash (button disabled)", disabled)
    pg.locator('button:has-text("Cancel")').last.click(); pg.wait_for_timeout(300)

    # 3) cancel whole series via one occurrence
    # open the Monday booking from Upcoming list and cancel the series
    pg.locator('button[title="Cancel or release"]').first.click()
    pg.wait_for_selector("text=recurring series")
    pg.locator('button:has-text("The whole series")').first.click()
    pg.locator('button:has-text("Cancel 5 Bookings")').first.click()
    pg.wait_for_timeout(500)
    bks2 = pg.evaluate("() => JSON.parse(localStorage.getItem('keenstack.bookings.v2')||'[]')")
    check("whole series cancelled (0 left)", len(bks2) == 0)

    b.close()

allp = all(ok for _, ok in results)
print("\nRESULT:", "ALL PASS" if allp else "SOME FAILED")
