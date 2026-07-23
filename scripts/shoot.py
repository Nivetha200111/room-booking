"""Capture app screenshots for the member guide."""
import os
from playwright.sync_api import sync_playwright

URL = "http://localhost:5180"
OUT = os.path.join(os.path.dirname(__file__), "shots")
os.makedirs(OUT, exist_ok=True)

SEED = """
() => {
  localStorage.setItem('keenstack.admin_ids','KSIN0001');
  localStorage.setItem('keenstack.employees.v1', JSON.stringify({
    KSIN0042:{name:'Meera Nair',role:'employee'},
    KSIN0050:{name:'Ravi Kumar',role:'employee'}
  }));
  const now=Date.now(), iso=ms=>new Date(ms).toISOString();
  const mk=(id,room,emp,org,ag,s,e,names=[])=>({id,roomId:room,employeeId:emp,organizer:org,agenda:ag,purpose:'Project meeting',attendees:names.length||4,attendeeNames:names,start:iso(s),end:iso(e),createdAt:iso(now)});
  localStorage.setItem('keenstack.bookings.v2', JSON.stringify([
    mk('b1','paris','KSIN0050','Ravi Kumar','Client review', now-15*60000, now+45*60000, ['Ravi','Anita','Sam']),
    mk('b2','new-york','KSIN0050','Ravi Kumar','Design sync', now-5*60000, now+40*60000),
    mk('b3','singapore','KSIN0042','Meera Nair','Sprint planning', now+60*60000, now+120*60000),
  ]));
  localStorage.setItem('keenstack.user.v1', JSON.stringify({employeeId:'KSIN0042',name:'Meera Nair',role:'employee'}));
}
"""

with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={"width": 1180, "height": 880}, device_scale_factor=2)
    pg.set_default_timeout(8000)

    def shot(name):
        pg.screenshot(path=f"{OUT}/{name}.png")
        print(name + ".png")

    # 1) login
    pg.goto(URL, wait_until="networkidle")
    pg.evaluate("() => localStorage.clear()")
    pg.reload(wait_until="networkidle")
    pg.wait_for_timeout(500)
    shot("login")

    # seed + floor map
    pg.evaluate(SEED)
    pg.reload(wait_until="networkidle")
    pg.wait_for_selector("text=Floor 1")
    pg.wait_for_timeout(800)
    shot("floormap")

    # 3) booking modal on a free (green) room — Phoenix
    try:
        pg.locator('button:has-text("Phoenix")').first.click()
        pg.wait_for_selector("text=Confirm Booking")
        pg.get_by_placeholder("What's the meeting about?").fill("Sprint planning")
        try:
            ni = pg.get_by_placeholder("Add a name and press Enter")
            for nm in ["Meera", "Arjun", "Divya"]:
                ni.fill(nm)
                ni.press("Enter")
        except Exception as e:
            print("names skipped:", e)
        pg.wait_for_timeout(400)
        shot("booking")
    except Exception as e:
        print("booking failed:", e)

    # reset to floor map
    pg.reload(wait_until="networkidle")
    pg.wait_for_selector("text=Floor 1")
    pg.wait_for_timeout(600)

    # 4) release dialog on an in-use (amber) room — Paris
    try:
        pg.locator('button:has-text("Paris")').first.click()
        pg.wait_for_selector("text=Request Release")
        pg.wait_for_timeout(400)
        shot("release")
    except Exception as e:
        print("release failed:", e)

    # reset to floor map
    pg.reload(wait_until="networkidle")
    pg.wait_for_selector("text=Floor 1")
    pg.wait_for_timeout(600)

    # 5) week view
    try:
        pg.locator('button:has-text("Week")').first.click()
        pg.wait_for_timeout(600)
        pg.evaluate("() => window.scrollTo(0, document.body.scrollHeight)")
        pg.wait_for_timeout(400)
        shot("week")
    except Exception as e:
        print("week failed:", e)

    b.close()
print("done")
