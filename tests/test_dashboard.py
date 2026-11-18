"""Run with Python + Playwright. Uses a fresh, headless browser profile.
python tests/test_dashboard.py [--url http://127.0.0.1:8765]
CHROME_PATH can point to an installed Chromium/Chrome executable.
Reference probabilities come from Python's independent NormalDist/erfc.
"""
import argparse,csv,io,math,os
from pathlib import Path
from statistics import NormalDist
from playwright.sync_api import sync_playwright
parser=argparse.ArgumentParser();parser.add_argument('--url');args=parser.parse_args()
root=Path(__file__).resolve().parents[1]
output=Path(os.environ.get('QA_OUTPUT','/tmp/econ1151-power-qa'));output.mkdir(exist_ok=True)
url=args.url or (root/'index.html').as_uri()
N=NormalDist()
def power(s,mu):
 se=s['sigma']/math.sqrt(s['n']);q=N.inv_cdf(1-s['alpha']/(2 if s['tail']=='two' else 1))
 lo=500-q*se;hi=500+q*se
 return (0.5*math.erfc(-(lo-mu)/se/math.sqrt(2)) if s['tail']!='upper' else 0)+(0.5*math.erfc((hi-mu)/se/math.sqrt(2)) if s['tail']!='lower' else 0)
with sync_playwright() as p:
 executable=os.environ.get('CHROME_PATH','/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
 browser=p.chromium.launch(headless=True,executable_path=executable if Path(executable).exists() else None)
 page=browser.new_page(viewport={'width':1512,'height':1100},device_scale_factor=1)
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(url);page.wait_for_load_state('networkidle')
 assert page.locator('#powerValue').inner_text()=='63.9%'
 assert page.locator('#betaValue').inner_text()=='36.1%'
 # Compare 567 cases, including n/sigma/alpha limits, against an independent reference.
 cases=[]
 for tail in ['lower','upper','two']:
  for alpha in [.001,.05,.2]:
   for n in [2,36,400]:
    for sigma in [2,12,30]:
     for mu in [480,496,499.9,500,500.1,504,520]:cases.append(dict(tail=tail,alpha=alpha,n=n,sigma=sigma,mu=mu))
 actual=page.evaluate('(cases)=>cases.map(s=>PowerMath.probability(s,s.mu))',cases)
 err=max(abs(v-power(s,s['mu'])) for s,v in zip(cases,actual));assert err<3e-7,err
 for s,v in zip(cases,actual):
  assert 0<=v<=1
  if s['mu']==500:assert abs(v-s['alpha'])<3e-7
 # Power increases with n, alpha and effect size, and decreases with sigma.
 for tail in ['lower','upper','two']:
  s=dict(tail=tail,alpha=.05,n=36,sigma=12,mu=504 if tail=='upper' else 496)
  vals=page.evaluate('(s)=>[PowerMath.quantities(s).power,...[{n:100},{alpha:.1},{sigma:6},{mu:s.mu>500?508:492}].map(v=>PowerMath.quantities({...s,...v}).power)]',s)
  assert all(v>vals[0] for v in vals[1:])
 # Sliders update immediately, numeric edits stay synchronized, comparison stays pinned.
 page.locator('#n').fill('100');assert page.locator('#nNumber').input_value()=='100'
 assert '+29.0' in page.locator('#comparison').inner_text() or 'percentage points' in page.locator('#comparison').inner_text()
 assert 'n = 36' in page.locator('#baselineSettings').inner_text()
 page.screenshot(path=str(output/'desktop-comparison.png'),full_page=True)
 page.locator('#pin').click();assert page.locator('#comparison').inner_text()=='Same power at this effect size.'
 page.locator('#alphaNumber').fill('0.001');page.locator('#alphaNumber').press('Tab')
 assert page.locator('#alpha').input_value()=='0.001'
 page.locator('#pin').click();assert 'α = 0.001' in page.locator('#baselineSettings').inner_text()
 page.locator('#sigmaNumber').fill('0');page.locator('#sigmaNumber').press('Tab');assert page.locator('#sigmaNumber').input_value()=='2'
 page.locator('#nNumber').fill('9999');page.locator('#nNumber').press('Tab');assert page.locator('#nNumber').input_value()=='400'
 page.locator('#tail').select_option('upper');assert float(page.locator('#mu').input_value())>=500
 page.locator('#tail').select_option('lower');assert float(page.locator('#mu').input_value())<=500
 page.locator('#reset').click();assert page.locator('#powerValue').inner_text()=='63.9%'
 page.locator('#tail').select_option('two');assert page.locator('#distributions .threshold').count()==4
 page.locator('#mu').fill('500');assert page.locator('#powerValue').inner_text()=='5.0%';assert 'not Type II error' in page.locator('#betaMeaning').inner_text()
 page.locator('#mu').fill('504');page.screenshot(path=str(output/'two-tailed.png'),full_page=True)
 # Data and portable SVG downloads.
 with page.expect_download() as dl:page.locator('#downloadData').click()
 data=dl.value;data.save_as(output/'power-curve.csv');rows=list(csv.DictReader(io.StringIO((output/'power-curve.csv').read_text())));assert len(rows)==401
 with page.expect_download() as dl:page.locator('#downloadPlot').click()
 dl.value.save_as(output/'power-plots.svg');assert '<svg' in (output/'power-plots.svg').read_text()
 assert not page.evaluate("[...document.querySelectorAll('path')].some(p=>/NaN|Infinity/.test(p.getAttribute('d')))")
 page.locator('#reset').click()
 page.screenshot(path=str(output/'desktop.png'),full_page=True)
 for w in [1366,768,390]:
  page.set_viewport_size({'width':w,'height':900});page.screenshot(path=str(output/f'width-{w}.png'),full_page=True)
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),w
 assert not errors,errors
 print(f'PASS: {len(cases)} probability checks (max error {err:.2g}), comparative statics, controls, tails, exports, responsive layout; no JS errors.')
 browser.close()
