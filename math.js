/* Normal-model power. No packages, network requests, or fitted distributions. */
(function (root) {
  'use strict';
  const MU0 = 500;
  const clamp = (x,a,b) => Math.max(a,Math.min(b,x));
  // Stable complementary-error-function approximation, evaluated in the tail.
  // Keep the small tail directly (rather than subtracting a CDF from one).
  function sf(x) {
    if(x===0)return .5;
    if(x===Infinity)return 0;if(x===-Infinity)return 1;
    const z=Math.abs(x)/Math.SQRT2,t=1/(1+.5*z);
    const tail=.5*t*Math.exp(-z*z-1.26551223+t*(1.00002368+t*(.37409196+t*(.09678418+t*(-.18628806+t*(.27886807+t*(-1.13520398+t*(1.48851587+t*(-.82215223+t*.17087277)))))))));
    return x>=0?tail:1-tail;
  }
  const cdf=x=>sf(-x);
  function quantile(p) {
    if(!(p>0&&p<1)) throw Error('Quantile probability must be between zero and one.');
    let a=-10,b=10;
    for(let i=0;i<65;i++){const m=(a+b)/2;if(cdf(m)<p)a=m;else b=m;}
    return (a+b)/2;
  }
  const density=(x,mu,se)=>Math.exp(-.5*((x-mu)/se)**2)/(se*Math.sqrt(2*Math.PI));
  function validate(s){
    if(!['lower','upper','two'].includes(s.tail)||!Number.isFinite(s.alpha)||s.alpha<=0||s.alpha>=1||!Number.isInteger(s.n)||s.n<1||!Number.isFinite(s.sigma)||s.sigma<=0)throw Error('Invalid test settings.');
  }
  function thresholds(s){
    validate(s);const se=s.sigma/Math.sqrt(s.n),q=quantile(1-s.alpha/(s.tail==='two'?2:1));
    return {se,lo:s.tail==='upper'?-Infinity:MU0-q*se,hi:s.tail==='lower'?Infinity:MU0+q*se};
  }
  function probability(s,mu){
    const {se,lo,hi}=thresholds(s);
    const lower=Number.isFinite(lo)?cdf((lo-mu)/se):0;
    const upper=Number.isFinite(hi)?sf((hi-mu)/se):0;
    return clamp(lower+upper,0,1);
  }
  function powerAtEffect(s,effect){return probability(s,MU0+(s.tail==='upper'?1:-1)*effect);}
  function quantities(s){const t=thresholds(s),power=probability(s,s.mu);return {...t,power,beta:1-power,effect:Math.abs(s.mu-MU0)};}
  const reject=(x,t)=>x<t.lo||x>t.hi;
  function simulate(s,repetitions,seed){
    const t=thresholds(s);let state=seed>>>0||1;
    const uniform=()=>{state^=state<<13;state^=state>>>17;state^=state<<5;return ((state>>>0)+.5)/4294967296;};
    const normal=()=>Math.sqrt(-2*Math.log(uniform()))*Math.cos(2*Math.PI*uniform());
    const nullMeans=[],altMeans=[];let falseAlarms=0,detections=0;
    for(let i=0;i<repetitions;i++){
      const x=MU0+t.se*normal(),y=s.mu+t.se*normal();nullMeans.push(x);altMeans.push(y);
      falseAlarms+=reject(x,t);detections+=reject(y,t);
    }
    return {nullMeans,altMeans,falseAlarms,detections,repetitions,seed};
  }
  root.PowerMath={MU0,cdf,sf,quantile,density,thresholds,probability,powerAtEffect,quantities,reject,simulate};
})(globalThis);
