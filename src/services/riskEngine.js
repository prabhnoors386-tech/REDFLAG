const WEIGHTS={financial:25,timeline:20,compliance:25,duplicate:15,agency:15};
const TODAY=new Date("2026-09-03T00:00:00Z");
const STOP=new Set("the a an and of for to in on with from by at into public work construction improvement development road hall building facility facilities village project".split(" "));
const norm=s=>String(s||"").toLowerCase().replace(/[^a-z0-9\s]/g," ").split(/\s+/).filter(w=>w&&!STOP.has(w)).join(" ");
const tokens=s=>new Set(norm(s).split(" ").filter(Boolean));
const jaccard=(a,b)=>{const A=tokens(a),B=tokens(b);if(!A.size||!B.size)return 0;let i=0;A.forEach(x=>B.has(x)&&i++);return i/(A.size+B.size-i)};
const days=(a,b)=>a&&b?Math.round((new Date(b)-new Date(a))/86400000):null;
function percentile(val,arr){const xs=[...arr].sort((a,b)=>a-b);if(!xs.length)return 50;let below=xs.filter(x=>x<=val).length;return below/xs.length*100}
function riskFinancial(p,all){const peers=all.filter(x=>x.category===p.category).map(x=>x.expenditure_amount/x.sanction_amount).filter(Number.isFinite);const ratio=p.expenditure_amount/p.sanction_amount;const dev=(ratio-1)*100;const pp=percentile(ratio,peers);let score=dev>30?25:dev>20?20:dev>10?14:dev>5?8:Math.max(0,Math.round((pp-65)/5));score=Math.min(25,Math.max(0,score));return {score,max:25,dev,percentile:pp,reason:dev>10?`Expenditure is ${dev.toFixed(1)}% above sanctioned value.`:"Expenditure remains close to the sanctioned baseline."}}
function riskTimeline(p){const sanctionDelay=days(p.recommendation_date,p.sanction_date);const completionDuration=p.completion_date?days(p.sanction_date,p.completion_date):null;const lateSanction=sanctionDelay>45;const lateCompletion=completionDuration!==null&&completionDuration>365;const ongoing=p.status==="Delayed"&&completionDuration===null;let score=0;if(lateSanction)score+=8;if(lateCompletion)score+=12;if(ongoing)score+=Math.min(12,Math.max(4,Math.round((days(p.sanction_date,TODAY)||0)/60)));score=Math.min(20,score);let reason="Timeline is within the prototype's applicable monitoring window.";if(lateCompletion)reason=`Completion duration is ${completionDuration} days, beyond the proposed one-year normal window.`;else if(lateSanction)reason=`Sanction lag is ${sanctionDelay} days, beyond the 45-day prototype review window.`;else if(ongoing)reason=`Work remains open and is showing a delayed status.`;return {score,max:20,sanctionDelay,completionDuration,reason}}
function compliance(p){const out=[];const desc=norm(p.description+" "+p.work_name);const restricted=["temple","church","mosque","private club","residential","commercial shop","member recreation"];const hit=restricted.find(w=>desc.includes(w));if(hit&&!desc.includes("road leading"))out.push({rule:"Work-category eligibility screening",status:"Requires Review",severity:"High",confidence:"Medium",explanation:`Description contains a phrase associated with a restricted/private-benefit category (“${hit}”). Context review is required.`,evidence:p.work_name});else out.push({rule:"Work-category eligibility screening",status:"Passed",severity:"Low",confidence:"High",explanation:"No restricted/private-benefit phrase was triggered by the prototype screen.",evidence:p.work_name});out.push({rule:"Sanction timeline",status:days(p.recommendation_date,p.sanction_date)>45?"Requires Review":"Passed",severity:days(p.recommendation_date,p.sanction_date)>45?"Medium":"Low",confidence:"High",explanation:days(p.recommendation_date,p.sanction_date)>45?`Sanction lag of ${days(p.recommendation_date,p.sanction_date)} days exceeds the 45-day prototype review threshold.`:"Recommendation-to-sanction timing is within the prototype threshold.",evidence:`Recommendation ${p.recommendation_date}; sanction ${p.sanction_date}`});out.push({rule:"Minimum work value",status:p.sanction_amount>=250000?"Passed":"Requires Review",severity:p.sanction_amount>=250000?"Low":"Medium",confidence:"Medium",explanation:p.sanction_amount>=250000?"Sanctioned value is at or above the researched prototype candidate threshold.":"Sanctioned value is below the researched prototype candidate threshold; verify applicable exceptions.",evidence:`Sanctioned ₹${p.sanction_amount.toLocaleString("en-IN")}`});return out}
export function calculateAll(raw) {
  const agencyCounts = raw.reduce((acc, p) => { acc[p.agency] = (acc[p.agency] || 0) + 1; return acc; }, {});
  return raw.map(p => {
    const f = riskFinancial(p, raw);
    const t = riskTimeline(p);
    const c = compliance(p);
    const dupList = [];
    raw.filter(x => x.work_id !== p.work_id && x.category === p.category).forEach(x => {
      const s = jaccard(p.description, x.description);
      if (s >= 0.55) dupList.push({ id:x.work_id, score:Math.round(s*100), reason:"Textual similarity within the same work category" });
    });
    dupList.sort((a,b) => b.score-a.score);
    const duplicateScore = dupList[0] ? Math.min(15, Math.max(4, Math.round((dupList[0].score-50)/3))) : 0;
    const agencyRate = agencyCounts[p.agency] > 2 ? raw.filter(x => x.agency === p.agency && x.status === "Delayed").length / agencyCounts[p.agency] : 0;
    const agencyScore = Math.min(15, Math.round(agencyRate*15));
    const complianceScore = Math.min(25, c.filter(x => x.status === "Requires Review").reduce((sum,x) => sum + (x.severity === "High" ? 15 : 10), 0));
    const components = {
      Financial: {score:f.score,max:25,reason:f.reason}, Timeline:{score:t.score,max:20,reason:t.reason},
      Compliance:{score:complianceScore,max:25,reason:complianceScore?`${c.filter(x=>x.status==="Requires Review").length} compliance review signal(s).`:`No compliance review signal.`},
      Duplicate:{score:duplicateScore,max:15,reason:dupList[0]?`${dupList[0].score}% textual similarity with ${dupList[0].id}.`:`No strong similar-work signal.`},
      Agency:{score:agencyScore,max:15,reason:agencyScore?`${Math.round(agencyRate*100)}% of this agency portfolio is delayed.`:`No elevated delay concentration in this sample.`}
    };
    const score = Object.values(components).reduce((sum,x) => sum+x.score, 0);
    const signals = [];
    if (f.score >= 8) signals.push({type:"financial",label:"Cost deviation",severity:f.score>=20?"High":"Medium",confidence:"High",explanation:f.reason,evidence:`Expenditure ₹${p.expenditure_amount.toLocaleString("en-IN")} vs sanction ₹${p.sanction_amount.toLocaleString("en-IN")}`});
    if (t.score >= 8) signals.push({type:"timeline",label:"Timeline deviation",severity:t.score>=15?"High":"Medium",confidence:"High",explanation:t.reason,evidence:`Recommendation ${p.recommendation_date}; sanction ${p.sanction_date}; completion ${p.completion_date||"open"}`});
    c.filter(x=>x.status==="Requires Review").forEach(x=>signals.push({type:"compliance",label:"Compliance review",severity:x.severity,confidence:x.confidence,explanation:x.explanation,evidence:x.evidence}));
    if (dupList[0] && dupList[0].score >= 70) signals.push({type:"duplicate",label:"Potentially overlapping works",severity:dupList[0].score>=85?"High":"Medium",confidence:"Medium",explanation:`High textual similarity detected with ${dupList[0].id}. Human verification is recommended.`,evidence:`Similarity ${dupList[0].score}% · ${dupList[0].reason}`});
    if (agencyScore >= 7) signals.push({type:"agency",label:"Agency risk concentration",severity:"Medium",confidence:"Medium",explanation:`This agency shows an elevated delayed-work rate within the loaded sample.`,evidence:`Delayed portfolio rate ${Math.round(agencyRate*100)}%`});
    const confidence = signals.length >= 3 ? "High" : signals.length ? "Medium" : "Low";
    const tier = riskTier(score);
    const priority = Math.round(score * (p.sanction_amount/1000000) * ({"High Risk":1.15,"Critical Risk":1.3,"Moderate Risk":1,"Low Risk":0.7}[tier]));
    return {...p,costDeviation:f.dev,peerPercentile:f.percentile,timelineRisk:t.score,components,score,signals,confidence,priority,riskTier:tier,compliance:c,similar:dupList.slice(0,5),sanctionDelay:t.sanctionDelay,completionDuration:t.completionDuration,costReason:f.reason,timelineReason:t.reason,dataQuality:quality(p),recommendedAction:score>=70?"Priority field verification recommended.":score>=50?"Priority document and timeline review recommended.":signals.length?"Targeted desk review recommended.":"Routine monitoring.",reviewChecklist:signals.some(s=>s.type==="financial")?["sanction documentation","revised estimate/scope"]:["applicable exceptions","project status history"]};
  });
}

function riskTier(s){return s>=70?"Critical Risk":s>=50?"High Risk":s>=30?"Moderate Risk":"Low Risk"}
function quality(p){const keys=["recommendation_date","sanction_date","work_name","description","state","district","constituency","agency"];let good=keys.filter(k=>p[k]).length;if(days(p.recommendation_date,p.sanction_date)<0)good--;return Math.round(good/keys.length*100)}
