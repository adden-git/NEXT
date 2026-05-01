import{g as U,s as K,d as Q,e as V,y as Z,x as j,_ as s,l as w,f as q,I as H,N as J,P as X,Q as G,R as Y,i as ee,C as te,S as ae,K as re}from"./vendor-heavy-CAjYQFut.js";import{p as ie}from"./chunk-4BX2VUAB-C-HYkBmM.js";import{p as se}from"./treemap-KMMF4GRG-DFw5SWjr.js";import"./vendor-chat-D7njpw_I.js";import"./vendor-ui-D3C_nIDH.js";import"./min-BEIulci4.js";import"./_baseUniq-BZprQohU.js";var le=re.pie,C={sections:new Map,showData:!1},g=C.sections,D=C.showData,oe=structuredClone(le),ne=s(()=>structuredClone(oe),"getConfig"),ce=s(()=>{g=new Map,D=C.showData,te()},"clear"),de=s(({label:e,value:a})=>{if(a<0)throw new Error(`"${e}" has invalid value: ${a}. Negative values are not allowed in pie charts. All slice values must be >= 0.`);g.has(e)||(g.set(e,a),w.debug(`added new section: ${e}, with value: ${a}`))},"addSection"),pe=s(()=>g,"getSections"),ge=s(e=>{D=e},"setShowData"),ue=s(()=>D,"getShowData"),P={getConfig:ne,clear:ce,setDiagramTitle:j,getDiagramTitle:Z,setAccTitle:V,getAccTitle:Q,setAccDescription:K,getAccDescription:U,addSection:de,getSections:pe,setShowData:ge,getShowData:ue},fe=s((e,a)=>{ie(e,a),a.setShowData(e.showData),e.sections.map(a.addSection)},"populateDb"),he={parse:s(async e=>{const a=await se("pie",e);w.debug(a),fe(a,P)},"parse")},me=s(e=>`
  .pieCircle{
    stroke: ${e.pieStrokeColor};
    stroke-width : ${e.pieStrokeWidth};
    opacity : ${e.pieOpacity};
  }
  .pieOuterCircle{
    stroke: ${e.pieOuterStrokeColor};
    stroke-width: ${e.pieOuterStrokeWidth};
    fill: none;
  }
  .pieTitleText {
    text-anchor: middle;
    font-size: ${e.pieTitleTextSize};
    fill: ${e.pieTitleTextColor};
    font-family: ${e.fontFamily};
  }
  .slice {
    font-family: ${e.fontFamily};
    fill: ${e.pieSectionTextColor};
    font-size:${e.pieSectionTextSize};
    // fill: white;
  }
  .legend text {
    fill: ${e.pieLegendTextColor};
    font-family: ${e.fontFamily};
    font-size: ${e.pieLegendTextSize};
  }
`,"getStyles"),ve=me,Se=s(e=>{const a=[...e.values()].reduce((r,l)=>r+l,0),y=[...e.entries()].map(([r,l])=>({label:r,value:l})).filter(r=>r.value/a*100>=1).sort((r,l)=>l.value-r.value);return ae().value(r=>r.value)(y)},"createPieArcs"),xe=s((e,a,y,$)=>{w.debug(`rendering pie chart
`+e);const r=$.db,l=q(),T=H(r.getConfig(),l.pie),A=40,o=18,d=4,c=450,u=c,f=J(a),n=f.append("g");n.attr("transform","translate("+u/2+","+c/2+")");const{themeVariables:i}=l;let[_]=X(i.pieOuterStrokeWidth);_??=2;const b=T.textPosition,p=Math.min(u,c)/2-A,R=G().innerRadius(0).outerRadius(p),W=G().innerRadius(p*b).outerRadius(p*b);n.append("circle").attr("cx",0).attr("cy",0).attr("r",p+_/2).attr("class","pieOuterCircle");const h=r.getSections(),I=Se(h),M=[i.pie1,i.pie2,i.pie3,i.pie4,i.pie5,i.pie6,i.pie7,i.pie8,i.pie9,i.pie10,i.pie11,i.pie12];let m=0;h.forEach(t=>{m+=t});const E=I.filter(t=>(t.data.value/m*100).toFixed(0)!=="0"),v=Y(M);n.selectAll("mySlices").data(E).enter().append("path").attr("d",R).attr("fill",t=>v(t.data.label)).attr("class","pieCircle"),n.selectAll("mySlices").data(E).enter().append("text").text(t=>(t.data.value/m*100).toFixed(0)+"%").attr("transform",t=>"translate("+W.centroid(t)+")").style("text-anchor","middle").attr("class","slice"),n.append("text").text(r.getDiagramTitle()).attr("x",0).attr("y",-400/2).attr("class","pieTitleText");const k=[...h.entries()].map(([t,x])=>({label:t,value:x})),S=n.selectAll(".legend").data(k).enter().append("g").attr("class","legend").attr("transform",(t,x)=>{const F=o+d,O=F*k.length/2,L=12*o,B=x*F-O;return"translate("+L+","+B+")"});S.append("rect").attr("width",o).attr("height",o).style("fill",t=>v(t.label)).style("stroke",t=>v(t.label)),S.append("text").attr("x",o+d).attr("y",o-d).text(t=>r.getShowData()?`${t.label} [${t.value}]`:t.label);const N=Math.max(...S.selectAll("text").nodes().map(t=>t?.getBoundingClientRect().width??0)),z=u+A+o+d+N;f.attr("viewBox",`0 0 ${z} ${c}`),ee(f,c,z,T.useMaxWidth)},"draw"),we={draw:xe},be={parser:he,db:P,renderer:we,styles:ve};export{be as diagram};
