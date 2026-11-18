/* Classroom controls and SVG rendering. Works offline, including file://. */
(function(){
'use strict';
const M=PowerMath,$=id=>document.getElementById(id);
const defaults={tail:'lower',mu:496,alpha:.05,n:36,sigma:12};
let state={...defaults},baseline={...defaults},view=null,seed=1151,simulation=null;
const C={null:'#80273f',alpha:'#ad455f',beta:'#c59a43',power:'#2e8279',saved:'#797979'};
const fmt=(n,d=2)=>Number(n).toFixed(d),pct=n=>(100*n).toFixed(1)+'%';
const short=n=>Number(n.toFixed(2)).toString();
const signed=n=>(n>0?'+':'')+n.toFixed(1);
const txt=(x,y,s,cls='caption',extra='')=>`<text x="${x}" y="${y}" class="${cls}" ${extra}>${s}</text>`;
const line=(x1,y1,x2,y2,cls='axis',extra='')=>`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="${cls}" ${extra}/>`;
function points(a,b,k=300){return Array.from({length:k+1},(_,i)=>a+(b-a)*i/k);}
function path(xs,fn,X,Y){return xs.map((x,i)=>(i?'L':'M')+X(x).toFixed(3)+','+Y(fn(x)).toFixed(3)).join(' ');}
function colorText(x,y,s,color,extra=''){return txt(x,y,s,'caption',`style="fill:${color}" ${extra}`);}
function tickStep(span){const p=10**Math.floor(Math.log10(span/6)),r=span/(6*p);return (r<=1?1:r<=2?2:r<=5?5:10)*p;}
function densityPoints(a,b,mu,se){return [...new Set([...points(a,b,400),...points(Math.max(a,mu-7*se),Math.min(b,mu+7*se),240)])].filter(x=>x>=a&&x<=b).sort((x,y)=>x-y);}
function regionPath(a,b,mu,se,X,Y){
 a=Math.max(a,view.min);b=Math.min(b,view.max);if(a>=b)return '';
 return path(densityPoints(a,b,mu,se),x=>M.density(x,mu,se),X,Y)+` L${X(b)},${Y(0)} L${X(a)},${Y(0)} Z`;
}
function renderDistributions(q,fit=false){
 const peak=M.density(state.mu,state.mu,q.se);
 const need={min:Math.min(500,state.mu)-4.5*q.se,max:Math.max(500,state.mu)+4.5*q.se,top:peak*1.25};
 if(!view||fit)view=need;else view={min:Math.min(view.min,need.min),max:Math.max(view.max,need.max),top:Math.max(view.top,need.top)};
 const left=58,right=658,X=x=>left+(x-view.min)/(view.max-view.min)*(right-left);
 const step=tickStep(view.max-view.min),ticks=[];
 for(let x=Math.ceil(view.min/step)*step;x<=view.max+step*1e-6;x+=step)ticks.push(x);
 let s=`<title id="distTitle">Null and true-mean sampling distributions</title><desc id="distDesc">Alpha is ${pct(state.alpha)} under the null. At a true mean of ${state.mu} mL, beta is ${pct(q.beta)} and power is ${pct(q.power)}. Both distributions have standard error ${fmt(q.se)} mL.</desc>`;
 [500,state.mu].forEach((mu,i)=>{
  const bottom=i?424:205,top=i?271:52,Y=y=>bottom-y/view.top*(bottom-top);
  const regions=[{a:-Infinity,b:q.lo,reject:true},{a:q.lo,b:q.hi,reject:false},{a:q.hi,b:Infinity,reject:true}];
  // Same horizontal and vertical density scale in both panels.
  for(const x of ticks)s+=line(X(x),top,X(x),bottom,'grid');
  s+=txt(left,i?246:27,i?`If the true mean is ${short(mu)} mL`:'Under H₀: μ = 500 mL','plot-title');
  if(!i)s+=colorText(right,27,`α = ${pct(state.alpha)}`,C.alpha,'text-anchor="end"');
  else s+=colorText(right,246,`β ${pct(q.beta)}  ·  Power ${pct(q.power)}`,C.power,'text-anchor="end"');
  for(const r of regions){
   const col=i?(r.reject?C.power:C.beta):(r.reject?C.alpha:'#ece6e8');
   s+=`<path d="${regionPath(r.a,r.b,mu,q.se,X,Y)}" fill="${col}" fill-opacity="${i?.50:r.reject?.65:.65}"/>`;
  }
  s+=`<path class="curve" d="${path(densityPoints(view.min,view.max,mu,q.se),x=>M.density(x,mu,q.se),X,Y)}" stroke="${i?C.power:C.null}"/>`;
  s+=line(left,bottom,right,bottom);
  s+=line(X(mu),bottom,X(mu),Y(peak),'axis',`style="stroke:${i?C.power:C.null};stroke-dasharray:2 4"`);
  for(const c of [q.lo,q.hi].filter(Number.isFinite))s+=line(X(c),top,X(c),bottom,'threshold');
  for(const x of ticks){s+=line(X(x),bottom,X(x),bottom+4);s+=txt(X(x),bottom+21,short(x),'tick','text-anchor="middle"');}
  s+=txt(15,(top+bottom)/2,'Density','tick',`transform="rotate(-90 15 ${(top+bottom)/2})" text-anchor="middle"`);
 });
 s+=txt(358,477,'Sample mean x̄ (mL)','caption','text-anchor="middle"');
 $('distributions').innerHTML=s;
 const rule=state.tail==='lower'?`x̄ &lt; ${fmt(q.lo)}`:state.tail==='upper'?`x̄ &gt; ${fmt(q.hi)}`:`x̄ &lt; ${fmt(q.lo)} or x̄ &gt; ${fmt(q.hi)}`;
 $('decision').innerHTML=`Reject H₀ if ${rule} mL.`;
}
function renderPower(q){
 const l=58,r=540,t=25,b=350,X=x=>l+x/20*(r-l),Y=y=>b-y*(b-t),xs=points(0,20,400);
 const cur=x=>M.powerAtEffect(state,x),old=x=>M.powerAtEffect(baseline,x);
 let s=`<title id="powerTitle">Power versus effect size</title><desc id="powerDesc">The horizontal scale is fixed from zero to twenty mL. The vertical scale is fixed from zero to one hundred percent. Current power at effect size ${short(q.effect)} is ${pct(q.power)}; saved comparison power at that same effect size is ${pct(old(q.effect))}.</desc>`;
 for(let p=0;p<=1.0001;p+=.2){s+=line(l,Y(p),r,Y(p),'grid');s+=txt(l-9,Y(p)+5,Math.round(p*100)+'%','tick','text-anchor="end"');}
 for(let e=0;e<=20;e+=4){s+=line(X(e),t,X(e),b,'grid');s+=txt(X(e),b+24,e,'tick','text-anchor="middle"');}
 // Shaded gap compares tests at the SAME effect size, not at two selected means.
 const gap=path(xs,cur,X,Y)+' '+xs.slice().reverse().map(x=>`L${X(x)},${Y(old(x))}`).join(' ')+' Z';
 s+=`<path d="${gap}" fill="${C.power}" fill-opacity=".10"/>`;
 s+=line(l,b,r,b)+line(l,t,l,b);
 s+=`<path d="${path(xs,old,X,Y)}" fill="none" stroke="${C.saved}" stroke-width="2.2" stroke-dasharray="7 5"/>`;
 s+=`<path class="curve" d="${path(xs,cur,X,Y)}" stroke="${C.power}"/>`;
 s+=line(X(q.effect),b,X(q.effect),Y(q.power),'threshold');
 s+=`<circle cx="${X(q.effect)}" cy="${Y(old(q.effect))}" r="5" fill="white" stroke="${C.saved}" stroke-width="2"/>`;
 s+=`<circle cx="${X(q.effect)}" cy="${Y(q.power)}" r="6" fill="${C.power}" stroke="white" stroke-width="2"/>`;
 const anchor=q.effect>14?'end':'start',offset=q.effect>14?-12:12;
 s+=colorText(X(q.effect)+offset,Math.max(t+17,Y(q.power)-13),pct(q.power),C.power,`text-anchor="${anchor}" font-weight="600"`);
 s+=txt((l+r)/2,402,'Effect size |μHₐ − 500| (mL)','caption','text-anchor="middle"');
 s+=txt(16,(t+b)/2,'Power','caption',`transform="rotate(-90 16 ${(t+b)/2})" text-anchor="middle"`);
 $('powerCurve').innerHTML=s;
 const diff=100*(q.power-old(q.effect));
 $('comparison').textContent=Math.abs(diff)<.05?'Same power at this effect size.':`${signed(diff)} percentage points at this effect size.`;
 $('baselineSettings').textContent=`Saved: α = ${Number(baseline.alpha.toFixed(3)).toString()}, n = ${baseline.n}, σX = ${short(baseline.sigma)} mL. Both curves use the same alternative direction.`;
}
function render(){
 const q=M.quantities(state);
 $('seValue').textContent=fmt(q.se)+' mL';$('effectLabel').textContent=`Effect size: ${short(q.effect)} mL from 500.`;
 $('alphaValue').textContent=pct(state.alpha);$('betaValue').textContent=pct(q.beta);$('powerValue').textContent=pct(q.power);
 const atNull=state.mu===500;
 $('betaMeaning').textContent=atNull?'At H₀: non-rejection, not Type II error':`Fail to reject when μ = ${short(state.mu)}`;
 $('powerMeaning').textContent=atNull?'At H₀: rejection rate equals α':`Reject when μ = ${short(state.mu)}`;
 renderDistributions(q);renderPower(q);
 simulation=null;$('simulationResult').textContent='Each sample contains n bottles. More repeated samples make the estimated rates more stable; they do not change theoretical power.';
}
function sync(){
 $('tail').value=state.tail;
 const min=state.tail==='upper'?500:480,max=state.tail==='lower'?500:520;
 for(const suffix of ['','Number']){$('mu'+suffix).min=min;$('mu'+suffix).max=max;}
 $('muMin').textContent=min;$('muMax').textContent=max;
 for(const key of ['mu','alpha','n','sigma']){$(key).value=state[key];$(key+'Number').value=state[key];}
}
function update(key,raw){
 const input=$(key),value=Number(raw);
 if(raw===''||!Number.isFinite(value)){sync();return;}
 const min=+input.min,max=+input.max,step=+input.step;
 state[key]=Number((Math.round((Math.min(max,Math.max(min,value))-min)/step)*step+min).toFixed(6));sync();render();
}
for(const key of ['mu','alpha','n','sigma']){
 $(key).addEventListener('input',e=>update(key,e.target.value));
 $(key+'Number').addEventListener('change',e=>update(key,e.target.value));
}
$('tail').addEventListener('change',e=>{
 const effect=Math.abs(state.mu-500);state.tail=e.target.value;
 if(state.tail==='lower')state.mu=500-effect;if(state.tail==='upper')state.mu=500+effect;
 baseline={...state};view=null;sync();render();
});
$('reset').addEventListener('click',()=>{state={...defaults};baseline={...defaults};view=null;seed=1151;$('repetitions').value=2000;$('repsValue').value='2,000';sync();render();});
$('fit').addEventListener('click',()=>renderDistributions(M.quantities(state),true));
$('pin').addEventListener('click',()=>{baseline={...state};renderPower(M.quantities(state));});
$('repetitions').addEventListener('input',()=>{$('repsValue').value=(+$('repetitions').value).toLocaleString();simulation=null;$('simulationResult').textContent='Select “Draw samples” to run with this number of repeated samples.';});
$('draw').addEventListener('click',()=>{
 const B=+$('repetitions').value,q=M.quantities(state);simulation=M.simulate(state,B,seed++);
 const {falseAlarms,detections}=simulation;
 function result(title,k,theory,col){return `<div class="sim-result"><strong>${title}</strong><div class="bar"><span style="width:${100*k/B}%;background:${col}"></span></div>${k.toLocaleString()} of ${B.toLocaleString()} samples reject H₀.<br>Simulated: <b>${pct(k/B)}</b> · Theoretical: ${pct(theory)}<div class="sim-meta">Monte Carlo SE ≈ ${(100*Math.sqrt(theory*(1-theory)/B)).toFixed(2)} percentage points.</div></div>`;}
 $('simulationResult').innerHTML='<div class="sim-results">'+result('When μ = 500: false alarms',falseAlarms,state.alpha,C.alpha)+result(`When μ = ${short(state.mu)}: ${state.mu===500?'false alarms':'detections'}`,detections,q.power,C.power)+'</div><p class="hint">New independent samples are drawn each time. The normal curves and their shaded probabilities do not depend on the number of repetitions.</p>';
});
function download(data,type,name){const a=document.createElement('a'),url=URL.createObjectURL(new Blob([data],{type}));a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
$('downloadData').addEventListener('click',()=>{
 const rows=['effect_size_ml,true_mean_ml,current_power,saved_power,tail,alpha,n,sigma_x,saved_alpha,saved_n,saved_sigma_x'];
 for(const effect of points(0,20,400))rows.push([effect,500+(state.tail==='upper'||(state.tail==='two'&&state.mu>=500)?1:-1)*effect,M.powerAtEffect(state,effect),M.powerAtEffect(baseline,effect),state.tail,state.alpha,state.n,state.sigma,baseline.alpha,baseline.n,baseline.sigma].join(','));
 download(rows.join('\n'),'text/csv;charset=utf-8','power-curve.csv');
});
$('downloadPlot').addEventListener('click',()=>{
 const q=M.quantities(state),title=`H₀: μ = 500; ${state.tail}-tailed; μHₐ = ${state.mu}; α = ${state.alpha}; n = ${state.n}; σX = ${state.sigma}`;
 const style='text{font-family:Arial,sans-serif;fill:#262626}.axis{stroke:#aaa;stroke-width:1}.grid{stroke:#eceaeb;stroke-width:1}.tick{font-size:13px;fill:#555}.caption{font-size:14px}.plot-title{font-size:17px;font-weight:600}.curve{fill:none;stroke-width:2.6;stroke-linejoin:round}.threshold{stroke:#555;stroke-dasharray:5 5;stroke-width:1.3}';
 download(`<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="600" viewBox="0 0 1280 600"><style>${style}</style><rect width="1280" height="600" fill="white"/>${txt(28,30,'Visualizing power · ECON 1151','plot-title')}${txt(28,57,title)}<g transform="translate(10 80)">${$('distributions').innerHTML}</g><g transform="translate(710 90)">${$('powerCurve').innerHTML}</g>${txt(740,550,'Solid: current test · Dashed: saved comparison')}${txt(740,575,`Saved: α ${baseline.alpha}, n ${baseline.n}, σX ${baseline.sigma}`)}</svg>`,'image/svg+xml','power-plots.svg');
});
sync();render();
})();
