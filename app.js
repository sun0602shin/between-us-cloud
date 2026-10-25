'use strict';
const $=s=>document.querySelector(s),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=()=>crypto.randomUUID?.()||('id_'+Date.now()+'_'+Math.random().toString(36).slice(2));
const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
const dtime=()=>new Date().toISOString();const datePlus=(d,n)=>{let x=new Date(d+'T12:00:00');x.setDate(x.getDate()+n);return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`};
const sections=['daily','feelings','points','agreements','rewards','more'];const labels=['달력','마음','포인트','약속','보상','더보기'];const emojis=['📅','💗','⭐','🤝','🎁','☰'];
const collections=['daily','messages','transactions','categories','agreements','checks','restrictions','rewards','requests','photos','cardTypes','proposals'];
const defaults={daily:[],messages:[],transactions:[],categories:[{id:'cat_life',name:'생활습관',reward:10,penalty:10},{id:'cat_screen',name:'TV·게임',reward:10,penalty:20},{id:'cat_exercise',name:'운동·줄넘기',reward:15,penalty:10},{id:'cat_study',name:'학습',reward:20,penalty:10},{id:'cat_kind',name:'배려',reward:10,penalty:0}].map(x=>({...x,updatedAt:'2025-01-01T00:00:00Z'})),agreements:[],checks:[],restrictions:[],rewards:[],requests:[],photos:[],cardTypes:['고마워','미안해','화해하고 싶어','화해했어','칭찬해','응원해','엄마 돌아보기','오늘의 이야기'].map((name,i)=>({id:'card_'+i,name,owner:'mom',updatedAt:'2025-01-01T00:00:00Z'})),proposals:[]};
let listPage={feelings:5,points:5,agreements:5,checks:5},listFilter={feelings:'all',points:'all',agreements:'all',agreementStatus:'active'},listMonth={feelings:today().slice(0,7),points:today().slice(0,7),checks:today().slice(0,7)};
let pointDraft=null,returnPoint=false,cardDraft=null,cardReturn=false,proposalPage=3,proposalFilter='pending',agreementSearch='',expandedCategories={};
let db, state,tab='daily',selected=today(),month=today().slice(0,7),role=localStorage.getItem('bu_v9_role')||'',device=localStorage.getItem('bu_v9_device')||uid();localStorage.setItem('bu_v9_device',device);
const getName=()=>role==='mom'?'엄마':'딸';const other=()=>role==='mom'?'daughter':'mom';
function storeOpen(){return new Promise((res,rej)=>{const q=indexedDB.open('BetweenUsV92MigrationDB',1);q.onupgradeneeded=()=>q.result.createObjectStore('kv');q.onsuccess=()=>{db=q.result;res()};q.onerror=()=>rej(q.error)})}
function read(){return new Promise((res,rej)=>{let q=db.transaction('kv','readonly').objectStore('kv').get('state');q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error)})}
function write(){return new Promise((res,rej)=>{let tx=db.transaction('kv','readwrite');tx.objectStore('kv').put(state,'state');tx.oncomplete=res;tx.onerror=()=>rej(tx.error)})}
function add(col,item){let data={id:uid(),owner:role,updatedAt:dtime(),...item};state[col].push(data);save();return data}
function update(col,id,props){let x=state[col].find(x=>x.id===id);if(!x)return;Object.assign(x,props,{updatedAt:dtime()});save()}
function remove(col,id){update(col,id,{deleted:true})}
function valid(col){return (state[col]||[]).filter(x=>!x.deleted)}
function save(){write().catch(e=>alert('저장 실패: '+e.message));state.changed=true;render()}
function cat(id){return valid('categories').find(x=>x.id===id)}
function balance(){return valid('transactions').reduce((s,x)=>s+Number(x.amount||0),0)}
function momOnly(){if(role!=='mom'){alert('엄마 계정에서만 가능한 작업이에요.');return false}return true}
function ownShare(c,x){if((c==='daily'||c==='messages')&&x.visibility==='private')return false;return x.owner===role || (c==='proposals' && x.decidedBy===role && x.status!=='pending')}
function formatStamp(){return new Date().toLocaleString('ko-KR')}
function formatDate(d){return d?.replaceAll('-','. ')||''}
function btn(txt,method='primary',action=''){return `<button class="${method}" ${action}>${txt}</button>`}
function optionRows(rows,value=''){return rows.map(x=>`<option value="${esc(x.id)}" ${x.id===value?'selected':''}>${esc(x.name)}</option>`).join('')}
// Nested dialog navigation: preserve the actual parent DOM (including unfinished form values).
const modalStack=[];
function modal(title,html,replace=false){
 const root=$('#modalRoot');
 const existing=root.firstElementChild;
 if(existing){
  if(replace){existing.remove()}else{
   modalStack.push({node:existing,scroll:existing.querySelector('.modal')?.scrollTop||0});existing.remove();
  }
 }
 const wrapper=document.createElement('div');wrapper.className='modalwrap';wrapper.id='modalShade';
 wrapper.innerHTML=`<div class="modal" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="modalhead"><h2>${esc(title)}</h2><button type="button" onclick="closeModal()" aria-label="닫기">×</button></div>${html}</div>`;
 root.appendChild(wrapper);
 wrapper.addEventListener('click',e=>{if(e.target===wrapper)closeModal()});
}
function closeModal(){
 const root=$('#modalRoot');root.replaceChildren();
 if(modalStack.length){
  const previous=modalStack.pop();root.appendChild(previous.node);
  const panel=previous.node.querySelector('.modal');if(panel)panel.scrollTop=previous.scroll;
  // Old one-off navigation flags should never reopen a duplicate parent.
  cardReturn=false;returnPoint=false;
  return;
 }
 // Legacy returns are needed only for exceptional paths without a saved parent.
 if(cardReturn){cardReturn=false;openMessage(cardDraft);return}
 if(returnPoint){returnPoint=false;openPoint(pointDraft?.type||'plus',pointDraft);return}
}
function closeAllModals(){modalStack.length=0;cardReturn=false;returnPoint=false;$('#modalRoot').replaceChildren()}
function field(label,name,type='text',value='',required=false){return `<div class="field"><label>${esc(label)}</label><input name="${name}" type="${type}" value="${esc(value)}" ${required?'required':''}></div>`}
function textarea(label,name,value='',required=false){return `<div class="field"><label>${esc(label)}</label><textarea name="${name}" ${required?'required':''}>${esc(value)}</textarea></div>`}
function select(label,name,options){return `<div class="field"><label>${esc(label)}</label><select name="${name}">${options}</select></div>`}
function form(html,fn,label='저장하기'){modal('기록하기',`<form id="entryForm">${html}<button class="primary" style="width:100%">${label}</button></form>`);$('#entryForm').onsubmit=e=>{e.preventDefault();let data=Object.fromEntries(new FormData(e.target));Promise.resolve(fn(data)).then(ok=>{if(ok!==false)closeModal()}).catch(err=>alert(err.message))}}
function pendingRewardRequests(){return valid('requests').filter(x=>x.status==='requested').sort((a,b)=>(b.updatedAt||'').localeCompare(a.updatedAt||''))}
function rewardRequestAlert(){
 const pending=pendingRewardRequests();
 if(role!=='mom'||!pending.length)return '';
 return `<button class="rewardAlert" onclick="openPendingRewards()"><span>🎁 <strong>보상 신청 ${pending.length}건 대기 중</strong><small>${esc(pending[0].title)} · ${Number(pending[0].cost||0)}P${pending.length>1?' 외 '+(pending.length-1)+'건':''}</small></span><span>상세 보기 ›</span></button>`;
}
function requestStatusText(status){return ({requested:'승인 대기',approved:'승인 완료',used:'사용 완료',cancelled:'거절·취소'})[status]||status||'알 수 없음'}
function openPendingRewards(){go('rewards');const first=pendingRewardRequests()[0];if(first)requestDetail(first.id)}
function requestDetail(id){
 const x=valid('requests').find(r=>r.id===id);if(!x)return alert('신청 내역을 찾을 수 없어요.');
 const product=valid('rewards').find(r=>r.id===x.rewardId);
 const tx=valid('transactions').find(t=>t.requestId===id);
 modal('보상 신청 상세',`<div class="notice"><strong>🎁 ${esc(x.title||'보상')}</strong><p>${Number(x.cost||0)}P · ${esc(requestStatusText(x.status))}</p></div>
 <div class="rewardDetail"><p><b>신청자</b><span>${x.owner==='daughter'?'딸':'엄마'}</span></p><p><b>신청 날짜</b><span>${esc(x.date||'미기록')}</span></p><p><b>필요 포인트</b><span>${Number(x.cost||0)}P</span></p><p><b>현재 상태</b><span>${esc(requestStatusText(x.status))}</span></p>${product?.description?`<p><b>보상 설명</b><span>${esc(product.description)}</span></p>`:''}${x.updatedAt?`<p><b>마지막 변경</b><span>${esc(new Date(x.updatedAt).toLocaleString('ko-KR'))}</span></p>`:''}${tx?`<p><b>차감 기록</b><span>${Number(tx.amount)}P · ${esc(tx.date||'')}</span></p>`:''}</div>
 ${role==='mom'&&x.status==='requested'?`<div class="detailActions"><button class="primary" onclick="requestAction('${x.id}','approved')">승인하기</button><button class="secondary" onclick="requestAction('${x.id}','cancelled')">거절하기</button></div>`:''}
 ${role==='mom'&&x.status==='approved'?`<button class="primary full" onclick="requestAction('${x.id}','used')">사용 완료 (${Number(x.cost||0)}P 차감)</button>`:''}`);
}
function requestAction(id,status){
 const x=valid('requests').find(r=>r.id===id);if(!x)return;
 const msg=status==='approved'?'이 보상 신청을 승인할까요?':status==='cancelled'?'이 보상 신청을 거절할까요?':'사용 완료로 처리하고 포인트를 차감할까요?';
 if(!confirm(msg))return;
 setRequest(id,status);
 closeAllModals();
 // If validation prevented a change, keep details accessible from the list.
}
function render(){let x=$('#app');if(!x)return;x.innerHTML=`<header class="head"><button class="brand brandButton" onclick="go('daily')" aria-label="달력 홈으로"><img src="icon-192.png" alt="우리 사이"><span><strong>우리 사이</strong><span class="sub">Between Us · v9.3.1 실제 기록</span></span></button><div class="headright"><strong class="balance">⭐ ${balance()}P</strong><button class="secondary roleButton" onclick="changeRole()">${role==='mom'?'👩 엄마':'👧 딸'} ▾</button></div></header><div class="syncQuick"><div class="syncQuickText"><strong>☁️ 서버 동기화</strong><small id="syncQuickStatus">${esc(localStorage.getItem('bu_v92_lastSync')||'수동으로 기록 전송·가져오기')}</small></div><button class="primary" onclick="quickCloudSync()">↻ 동기화</button></div>${tab==='daily'?rewardRequestAlert():''}`+({daily:calendarView,feelings:feelingsView,points:pointsView,agreements:agreementsView,rewards:rewardsView,more:moreView})[tab]();$('#tabs').innerHTML=sections.map((t,i)=>`<button class="${tab===t?'active':''}" onclick="go('${t}')"><span>${emojis[i]}</span>${labels[i]}</button>`).join('');window.v9cloud?.refreshPanel?.()}

function go(t){closeAllModals();tab=t;render();window.scrollTo(0,0)}
function changeRole(){modal('사용자 선택',`<p class="muted">이 설정은 해당 아이폰에서 사용하는 사람을 구분해요. 비밀번호나 계정 인증은 제공하지 않아요.</p><div class="grid2">${btn('👩 엄마','secondary',`onclick="setRole('mom')"`)}${btn('👧 딸','secondary',`onclick="setRole('daughter')"`)}</div>`)}
function setRole(r){role=r;localStorage.setItem('bu_v9_role',r);closeModal();render()}
function listSet(group,key,value){listFilter[group]=value;listPage[group==='agreementStatus'?'agreements':group]=5;render()}
function listMore(group){listPage[group]=(listPage[group]||5)+5;render()}
function listMonthSet(group,value){if(!/^\d{4}-\d{2}$/.test(value))return;listMonth[group]=value;listPage[group]=5;render()}
function compactItem(title,meta,detail,extra=''){return `<div class="compactEntry"><div class="compactTitle"><strong>${title}</strong>${extra}</div><small class="muted">${meta}</small>${detail?`<div class="clampText">${detail}</div>`:''}</div>`}
function moreButton(group,total){return total>(listPage[group]||5)?`<button class="secondary full mt" onclick="listMore('${group}')">지난 기록 5개 더보기 (${Math.min(listPage[group],total)}/${total})</button>`:''}
function myDaily(d,who=role){return valid('daily').find(x=>x.date===d&&x.owner===who)}
function restrictionOn(d){return valid('restrictions').filter(x=>x.start<=d&&x.end>=d&&x.status!=='cancelled'&&(!x.releasedAt||d<x.releasedAt))}
function calendarView(){let [y,m]=month.split('-').map(Number),first=new Date(y,m-1,1).getDay(),count=new Date(y,m,0).getDate();let cells='';for(let i=0;i<Math.ceil((first+count)/7)*7;i++){let day=i-first+1;if(day<1||day>count){cells+='<div class="day empty"></div>';continue}let dt=month+'-'+String(day).padStart(2,'0'),own=myDaily(dt),peer=myDaily(dt,other()),tx=valid('transactions').filter(x=>x.date===dt),rest=restrictionOn(dt);cells+=`<button class="day ${dt===selected?'active':''} ${rest.length?'restricted':''}" onclick="chooseDay('${dt}')"><span class="num">${day}</span><span class="em">${own?.mood||peer?.mood||''}</span>${tx.length?`<span class="marker">${tx.reduce((a,b)=>a+Number(b.amount),0)>0?'+':''}${tx.reduce((a,b)=>a+Number(b.amount),0)}P</span>`:''}${rest.length?'<span class="bar">🔒 제한</span>':''}</button>`}
let checksToday=valid('checks').filter(x=>x.date===selected),items=valid('transactions').filter(x=>x.date===selected),daily=valid('daily').filter(x=>x.date===selected&&(x.owner===role||x.visibility==='shared')),msgs=valid('messages').filter(x=>x.date===selected&&(x.owner===role||x.visibility==='shared'));
return `<div class="calendarQuick"><button onclick="${role==='mom'?'openPoint()':"go(\'agreements\')"}">⭐ ${role==='mom'?'상점·벌점':'약속 제안'}</button><button onclick="openMessage()">💌 마음 카드</button><button onclick="openDaily()">💗 오늘 마음</button></div><div class="card"><div class="titleline"><h2>우리의 달력</h2><span class="pill">${balance()} P</span></div><div class="row between mb"><button class="tiny" onclick="moveMonth(-1)">‹ 이전</button><strong>${y}년 ${m}월</strong><button class="tiny" onclick="moveMonth(1)">다음 ›</button></div><div class="week">${['일','월','화','수','목','금','토'].map(x=>`<div class="weekday">${x}</div>`).join('')}${cells}</div><div class="muted mt">😊 감정　±P 포인트　🔒 제한</div></div><div class="card shareShortcut"><div class="titleline"><h2>☁️ 내 기록 공유하기</h2><span class="pill">${role==='mom'?'mom/mom.json':'daughter/daughter.json'}</span></div><p class="muted">전체 공개 기록을 iCloud Drive의 지정된 폴더에 저장해요. 마지막 공유: ${esc(state.lastExport||'없음')}</p><div class="shareButtons"><button class="primary" onclick="exportData(false,'icloud')">☁️ iCloud 저장</button><button class="secondary" onclick="exportData(false,'airdrop')">📤 AirDrop 보내기</button></div><button class="secondary full mt" onclick="pickImport()">📥 상대방 기록 가져오기</button></div><div class="card" id="daySummary"><div class="titleline"><h2>${formatDate(selected)}의 기록</h2>${btn('＋ 마음 기록','secondary','onclick="openDaily()"')}</div>${daily.length?daily.map(x=>`<div class="bubble">${x.mood} <strong>${x.owner==='mom'?'엄마':'딸'}</strong> · ${esc(x.relation||'')}${x.visibility==='private'?' 🔐':''}<p>${esc(x.note)}</p></div>`).join(''):'<div class="emptymsg">아직 감정 기록이 없어요.</div>'}${activityRows(selected)}${restrictionOn(selected).map(x=>`<div class="notice">🔒 ${esc(x.title)} (${x.start} ~ ${x.end})</div>`).join('')}${msgs.slice(0,3).map(x=>`<div class="bubble">💌 ${esc(x.type)} · ${x.owner==='mom'?'엄마':'딸'}<p>${esc(x.text)}</p></div>`).join('')}${msgs.length>3?`<button class="secondary full" onclick="openDayAll('messages')">마음 카드 전체 보기 (${msgs.length})</button>`:''}<div class="dayActions"><button class="secondary" onclick="openDaily()">💗 마음 기록</button><button class="secondary" onclick="openMessage()">💌 마음 카드</button><button class="secondary" onclick="${role==='mom'?'openPoint()':'go(\'agreements\')'}">⭐ 상·벌점</button></div></div>`}
function activityRows(date){
 const txs=valid('transactions').filter(x=>x.date===date);
 const checks=valid('checks').filter(x=>x.date===date);
 const linked=new Set(checks.map(x=>x.pointTransactionId).filter(Boolean));
 const rows=[];
 for(const x of checks){const tx=txs.find(t=>t.id===x.pointTransactionId||t.checkId===x.id);if(tx)linked.add(tx.id);const amount=tx?Number(tx.amount):Number(x.points||0);rows.push({stamp:x.updatedAt||'',icon:x.result==='kept'?'✅':'❌',title:x.title||valid('agreements').find(a=>a.id===x.agreementId)?.title||'실천기록',detail:x.reason||'',amount,tx});}
 for(const x of txs){if(linked.has(x.id))continue;const used=!!x.requestId||String(x.reason||'').startsWith('보상 아이템 사용:');const title=used?(valid('requests').find(r=>r.id===x.requestId)?.title||String(x.reason||'').replace(/^보상 아이템 사용:\s*/,'')):(x.agreementName||valid('agreements').find(a=>a.id===x.agreementId)?.title||x.categoryName||cat(x.categoryId)?.name||'상·벌점');rows.push({stamp:x.updatedAt||'',icon:used?'🎁':Number(x.amount)<0?'🔻':'⭐',title,detail:used?'보상 사용 완료':x.reason||'',amount:Number(x.amount),tx:x});}
 rows.sort((x,y)=>y.stamp.localeCompare(x.stamp));
 return rows.map(x=>`<div class="item activityItem"><span class="activityIcon">${x.icon}</span><div class="activityBody"><strong>${esc(x.title)}</strong>${x.detail?`<div class="muted">${esc(x.detail)}</div>`:''}</div><span class="${x.amount>=0?'plus':'minus'}">${x.amount>0?'+':''}${x.amount}P</span>${role==='mom'&&x.tx&&!x.tx.requestId?`<button class="tiny" onclick="editTransaction('${x.tx.id}')">수정</button>`:''}</div>`).join('');
}
function chooseDay(d){selected=d;render();document.getElementById('daySummary')?.scrollIntoView({behavior:'smooth',block:'start'})}function moveMonth(n){let [y,m]=month.split('-').map(Number),d=new Date(y,m-1+n,1);month=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;selected=month+'-01';render()}
function openDaily(){let cur=myDaily(selected),relations=['💕 좋았어','🌿 평범했어','☁️ 서운했어','🌧️ 다퉜어','🌈 화해했어'];let relation=cur?.relation||relations[1];modal('오늘의 마음',`<form id="dailyForm"><p class="muted">${esc(selected)} · ${getName()}의 기록</p><label class="formLabel">오늘 내 기분</label><div class="moods">${['🥰','😊','😐','😢','😡'].map(e=>`<button type="button" class="${(cur?.mood||'😊')===e?'selected':''}" onclick="pickMood(this,'${e}')">${e}</button>`).join('')}</div><input type="hidden" name="mood" value="${cur?.mood||'😊'}"><label class="formLabel">오늘 우리 관계</label><div class="relationChoices">${relations.map(e=>`<button type="button" class="${relation===e?'selected':''}" onclick="pickRelation(this,'${e}')">${e}</button>`).join('')}</div><input type="hidden" name="relation" value="${esc(relation)}">${textarea('오늘의 이야기','note',cur?.note||'')}${select('공개 범위','visibility',`<option value="shared" ${cur?.visibility!=='private'?'selected':''}>함께 보기</option><option value="private" ${cur?.visibility==='private'?'selected':''}>나만 보기</option>`)}<button class="primary full">마음 저장</button></form>`);$('#dailyForm').onsubmit=e=>{e.preventDefault();let v=Object.fromEntries(new FormData(e.target));cur?update('daily',cur.id,v):add('daily',{date:selected,...v});closeModal()}}
function pickMood(el,e){el.closest('form').querySelector('[name=mood]').value=e;el.parentElement.querySelectorAll('button').forEach(x=>x.classList.remove('selected'));el.classList.add('selected')}
function pickRelation(el,e){el.closest('form').querySelector('[name=relation]').value=e;el.parentElement.querySelectorAll('button').forEach(x=>x.classList.remove('selected'));el.classList.add('selected')}

function feelingsView(){let m=listMonth.feelings,filter=listFilter.feelings;let cards=valid('messages').filter(x=>(x.owner===role||x.visibility==='shared')&&x.date?.startsWith(m)).map(x=>({...x,recordType:'card'}));let hearts=valid('daily').filter(x=>(x.owner===role||x.visibility==='shared')&&x.date?.startsWith(m)).map(x=>({...x,recordType:'daily'}));let rows=[...cards,...hearts].filter(x=>filter==='all'||x.recordType===filter).sort((a,b)=>(b.date+(b.updatedAt||'')).localeCompare(a.date+(a.updatedAt||'')));return `<div class="card"><div class="titleline"><h2>우리 마음 💗</h2>${btn('＋ 마음 전하기','primary','onclick="openMessage()"')}</div><div class="listControls"><input type="month" aria-label="조회 월" value="${m}" onchange="listMonthSet('feelings',this.value)"><div class="choicebar compactFilters">${[['all','전체'],['daily','오늘 마음'],['card','마음 카드']].map(([id,label])=>`<button class="choice ${filter===id?'active':''}" onclick="listSet('feelings','${id}','${id}')">${label}</button>`).join('')}</div></div>${rows.slice(0,listPage.feelings).map(x=>compactItem(x.recordType==='card'?'💌 '+esc(x.type):`${x.mood||'😊'} 오늘의 마음`,`${x.date} · ${x.owner==='mom'?'엄마':'딸'} ${x.visibility==='private'?'🔐':''}`,esc(x.recordType==='card'?x.text:x.note),x.recordType==='card'&&x.owner===role?`<button class="tiny" onclick="deleteAsk('messages','${x.id}')">삭제</button>`:'' )).join('')||'<div class="emptymsg">해당 월에 기록이 없어요.</div>'}${moreButton('feelings',rows.length)}</div>`}
function captureCardDraft(){const f=$('#entryForm');if(!f)return cardDraft||{};const d=Object.fromEntries(new FormData(f));cardDraft={...d};return cardDraft}
function openCardManagerFromMessage(){captureCardDraft();cardReturn=true;openCardTypes()}
function openMessage(draft=null){let opts=optionRows(valid('cardTypes'),draft?.typeId||'');if(!opts)return openCardTypes();cardDraft=draft||null;form(`${select('종류','typeId',opts)}${field('날짜','date','date',draft?.date||selected,true)}${textarea('전하고 싶은 말','text',draft?.text||'',true)}${select('공개 범위','visibility',`<option value="shared" ${draft?.visibility!=='private'?'selected':''}>함께 보기</option><option value="private" ${draft?.visibility==='private'?'selected':''}>나만 보기</option>`)}<button type="button" class="secondary full" onclick="openCardManagerFromMessage()">⚙️ 마음 카드 종류 관리</button>`,v=>{let t=valid('cardTypes').find(x=>x.id===v.typeId);if(!t||!v.text.trim())return false;cardDraft=null;add('messages',{...v,type:t.name})},'마음 카드 저장')}
function openCardTypes(){modal('마음 카드 종류 관리',`<p class="muted">서로에게 전할 카드의 종류를 추가하고 수정할 수 있어요.</p>${valid('cardTypes').map(x=>`<div class="item row between"><strong>${esc(x.name)}</strong><div><button class="tiny" onclick="editCardType('${x.id}')">수정</button> <button class="tiny" onclick="deleteAsk('cardTypes','${x.id}')">보관</button></div></div>`).join('')}${btn('＋ 종류 추가','primary','onclick="editCardType()"')}`)}
function editCardType(id){let x=valid('cardTypes').find(x=>x.id===id);form(`${field('카드 종류 이름','name','text',x?.name||'',true)}`,v=>{if(!v.name.trim())return false;x?update('cardTypes',id,{name:v.name.trim()}):add('cardTypes',{name:v.name.trim()});if(cardReturn){cardReturn=false;setTimeout(()=>closeModal(),0)}})}

function pointsView(){let filter=listFilter.points,m=listMonth.points;let all=valid('transactions'),entries=all.filter(x=>x.date?.startsWith(m)&&(filter==='all'||(filter==='plus'?Number(x.amount)>0:Number(x.amount)<0))).sort((a,b)=>(b.date+(b.updatedAt||'')).localeCompare(a.date+(a.updatedAt||'')));return `<div class="card"><div class="titleline"><h2>우리 포인트</h2><span class="pill">${balance()} P</span></div><div class="grid2"><div class="stat"><strong class="plus">+${all.filter(x=>x.amount>0).reduce((s,x)=>s+Number(x.amount),0)}</strong><small>총 상점</small></div><div class="stat"><strong class="minus">${all.filter(x=>x.amount<0).reduce((s,x)=>s+Number(x.amount),0)}</strong><small>총 벌점·사용</small></div></div><div class="row mt">${role==='mom'?btn('＋ 상점·벌점 등록','primary','onclick="openPoint()"'):''}${role==='mom'?btn('카테고리 관리','secondary','onclick="openCategoryList()"'):''}</div></div><div class="card"><h2>상점·벌점 내역</h2><div class="listControls"><input type="month" value="${m}" aria-label="포인트 조회 월" onchange="listMonthSet('points',this.value)"><div class="choicebar compactFilters">${[['all','전체'],['plus','＋ 상점'],['minus','－ 벌점']].map(([id,label])=>`<button class="choice ${filter===id?'active':''}" onclick="listSet('points','${id}','${id}')">${label}</button>`).join('')}</div></div>${entries.slice(0,listPage.points).map(x=>compactItem(esc(x.agreementName||x.reason||'포인트 기록'),`${x.date} · ${esc(x.categoryName||cat(x.categoryId)?.name||'보상 상점')}`,esc(x.reason),`<span class="${x.amount>=0?'plus':'minus'}"><strong>${x.amount>0?'+':''}${x.amount}P</strong></span>${role==='mom'?`<button class="tiny" onclick="editTransaction('${x.id}')">수정</button> <button class="tiny" onclick="deleteAsk('transactions','${x.id}')">취소</button>`:''}`)).join('')||'<div class="emptymsg">해당 월의 상·벌점 내역이 없어요.</div>'}${moreButton('points',entries.length)}</div>`}
function openPoint(initialType='plus',draft=null){
 if(!momOnly())return;
 const cats=valid('categories');if(!cats.length)return openCategoryList();
 const picked=new Map();
 modal('상점 / 벌점 일괄 등록',`<form id="pointForm">
 ${field('날짜','date','date',draft?.date||selected||today(),true)}
 <div class="field"><label>항목 찾기</label><div class="choicebar"><button type="button" class="choice active" id="plusChoice">＋ 상점</button><button type="button" class="choice" id="minusChoice">－ 벌점</button></div><input type="hidden" name="type" value="plus"></div>
 ${select('카테고리','categoryId',optionRows(cats))}
 <div class="field"><label>항목 선택 (여러 개 가능)</label><div id="pointChoices"></div></div>
 <div id="newRuleLink"></div>
 <div class="notice">카테고리나 상점·벌점을 바꿔도 선택한 항목은 유지돼요. 항목별로 포인트와 사유를 수정할 수 있어요.</div>
 <div id="pointSelected"></div>
 <button class="primary full" id="pointSave" type="submit">선택한 항목 저장</button></form>`);
 const f=$('#pointForm'),el=n=>f.elements.namedItem(n);
 const key=(type,id)=>type+'::'+id;
 const label=a=>[a.title,a.content||a.description,a.criterion].filter(Boolean).join(' · ');
 const choiceFor=(type,categoryId)=>valid('agreements').filter(a=>a.categoryId===categoryId&&(a.kind||'promise')===(type==='plus'?'praise':'promise')&&a.status!=='archived');
 function capture(){
  f.querySelectorAll('[data-point-card]').forEach(card=>{
   const p=picked.get(card.dataset.key);if(!p)return;
   p.amount=card.querySelector('[data-amount]').value;
   p.reason=card.querySelector('[data-reason]').value;
   if(p.type==='minus'){
    p.restrict=card.querySelector('[data-restrict]').checked;
    p.days=card.querySelector('[data-days]').value;
    p.restrictionTitle=card.querySelector('[data-title]').value;
   }
  });
 }
 function selectedRender(){
  const rows=[...picked.values()];
  $('#pointSave').textContent=`${rows.length}개 항목 저장`;
  $('#pointSelected').innerHTML=rows.length?`<h3>선택한 항목 (${rows.length})</h3>`+rows.map(p=>{
   const a=valid('agreements').find(x=>x.id===p.id),minus=p.type==='minus';
   return `<div class="referencebox" data-point-card data-key="${esc(key(p.type,p.id))}">
    <div class="row between"><strong>${minus?'－ 벌점':'＋ 상점'} · ${esc(a?.title||p.title)}</strong><button class="tiny" type="button" data-remove="${esc(key(p.type,p.id))}">제외</button></div>
    <small class="muted">${esc(cat(p.categoryId)?.name||'기타')} · ${esc(a?.content||a?.description||'')}${a?.criterion?' · 기준: '+esc(a.criterion):''}</small>
    <div class="field"><label>${minus?'벌점':'상점'} 포인트</label><input type="number" min="0" step="1" data-amount value="${esc(p.amount)}" required></div>
    <div class="field"><label>사유 (${minus?'필수':'선택'})</label><textarea data-reason ${minus?'required':''}>${esc(p.reason)}</textarea></div>
    ${minus?`<div class="periodgroup"><label class="checkrow"><input type="checkbox" data-restrict ${p.restrict?'checked':''}> 기간 제한 적용</label>
    <div class="field"><label>제한 기간 (일)</label><input type="number" min="1" data-days value="${esc(p.days)}"></div>
    <div class="field"><label>제한 내용</label><input type="text" data-title value="${esc(p.restrictionTitle)}"></div></div>`:''}
   </div>`;
  }).join(''):'<p class="muted">아래 목록에서 항목을 선택해 주세요.</p>';
  f.querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>{capture();picked.delete(b.dataset.remove);refreshChoices();selectedRender()});
 }
 function refreshChoices(){
  const type=el('type').value,categoryId=el('categoryId').value;
  const rows=choiceFor(type,categoryId);
  $('#pointChoices').innerHTML=rows.map(a=>`<label class="checkrow" style="display:flex;align-items:flex-start;gap:8px;padding:9px 0;border-bottom:1px solid #ddd">
   <input type="checkbox" data-pick="${esc(a.id)}" ${picked.has(key(type,a.id))?'checked':''}>
   <span><strong>${esc(a.title||'이름 없음')}</strong>${a.content||a.description||a.criterion?`<small class="muted" style="display:block">${esc([a.content||a.description,a.criterion].filter(Boolean).join(' · '))}</small>`:''}</span>
   </label>`).join('')||'<p class="muted">이 카테고리에 등록된 항목이 없어요.</p>';
  $('#pointChoices').querySelectorAll('[data-pick]').forEach(input=>input.onchange=()=>{
   capture();const a=valid('agreements').find(x=>x.id===input.dataset.pick);if(!a)return;
   const k=key(type,a.id);
   if(input.checked)picked.set(k,{id:a.id,type,categoryId:a.categoryId,title:a.title,amount:String(type==='minus'?a.penalty??cat(a.categoryId)?.penalty??0:a.reward??cat(a.categoryId)?.reward??0),reason:'',restrict:type==='minus'&&Number(a.days)>0,days:String(a.days||0),restrictionTitle:a.restrictionTitle||a.title||''});
   else picked.delete(k);
   selectedRender();
  });
  const kind=type==='plus'?'praise':'promise';
  $('#newRuleLink').innerHTML=`<button class="secondary full" type="button" id="addRuleInline">＋ 새 ${type==='plus'?'칭찬':'약속'} 항목 등록</button>`;
  $('#addRuleInline').onclick=()=>{
   capture();
   editAgreement(null,{kind,categoryId});
   // Nested modal returns to this form; refresh choices after the child dialog closes.
   const root=$('#modalRoot');
   const observer=new MutationObserver(()=>{
    if(root.querySelector('#pointForm')===f){observer.disconnect();refreshChoices();selectedRender()}
   });
   observer.observe(root,{childList:true});
  };
 }
 function switchType(type){
  capture();el('type').value=type;
  $('#plusChoice').classList.toggle('active',type==='plus');
  $('#minusChoice').classList.toggle('active',type==='minus');
  refreshChoices();
 }
 $('#plusChoice').onclick=()=>switchType('plus');
 $('#minusChoice').onclick=()=>switchType('minus');
 el('categoryId').onchange=()=>{capture();refreshChoices()};
 switchType(initialType==='minus'?'minus':'plus');
 f.onsubmit=e=>{
  e.preventDefault();if(!momOnly())return;capture();
  const date=el('date').value,rows=[...picked.values()];
  if(!date||!rows.length)return alert('날짜와 항목을 선택해 주세요.');
  for(const p of rows){
   const n=Number(p.amount);
   if(!Number.isFinite(n)||n<0||!Number.isInteger(n))return alert('포인트는 0 이상의 정수로 입력해 주세요.');
   if(p.type==='minus'&&!p.reason.trim())return alert('벌점 항목은 사유를 입력해야 해요.');
   if(p.type==='minus'&&p.restrict&&(!Number.isInteger(Number(p.days))||Number(p.days)<1||!p.restrictionTitle.trim()))return alert('기간 제한의 일수와 내용을 확인해 주세요.');
  }
  const duplicates=rows.filter(p=>valid('transactions').some(t=>t.date===date&&t.agreementId===p.id&&t.categoryId===p.categoryId&&(Number(t.amount)<0?'minus':'plus')===p.type));
  if(duplicates.length&&!confirm(`${date}에 이미 기록된 항목 ${duplicates.length}개가 있어요:\n${duplicates.map(p=>'• '+p.title).join('\n')}\n\n그래도 추가 저장할까요?`))return;
  if(!confirm(`${date}에 상·벌점 ${rows.length}건을 저장할까요?`))return;
  const saveButton=$('#pointSave');saveButton.disabled=true;
  for(const p of rows){
   const a=valid('agreements').find(x=>x.id===p.id);
   const reason=p.reason.trim();
   const t=add('transactions',{date,categoryId:p.categoryId,categoryName:cat(p.categoryId)?.name||'기타',agreementId:p.id,agreementName:a?.title||p.title,itemContent:a?.content||a?.description||'',itemCriterion:a?.criterion||'',reason,amount:p.type==='minus'?-Number(p.amount):Number(p.amount)});
   if(p.type==='minus'&&p.restrict)add('restrictions',{transactionId:t.id,agreementId:p.id,title:p.restrictionTitle.trim(),reason,start:date,end:datePlus(date,Number(p.days)-1),status:'active'});
  }
  selected=date;closeModal();
 };
}

function editTransaction(id){
 if(!momOnly())return;
 const x=valid('transactions').find(t=>t.id===id);if(!x)return;
 const r=valid('restrictions').find(t=>t.transactionId===id&&t.status!=='cancelled');
 const isMinus=Number(x.amount)<0;
 const start=r?.start||x.date||today(),end=r?.end||start;
 const fields=`${field('날짜','date','date',x.date,true)}${select('카테고리','categoryId',optionRows(valid('categories'),x.categoryId))}${select('항목명','agreementId','<option value="">직접 입력</option>'+valid('agreements').map(z=>`<option value="${esc(z.id)}" ${x.agreementId===z.id?'selected':''}>${esc(z.title)}</option>`).join(''))}<div id="customAgreementNameWrap" ${x.agreementId?'hidden':''}>${field('새 항목명','agreementName','text',x.agreementName||'',false)}</div>${field('적용 포인트 (상점 양수, 벌점 음수)','amount','number',x.amount,true)}${textarea(isMinus?'구체적인 사유 (필수)':'구체적인 사유 (선택)','reason',x.reason||'',isMinus)}`;
 const period=isMinus?`<label class="checkrow"><input type="checkbox" id="editRestrictionToggle" ${r?'checked':''}> 기간 제한 적용</label><div id="editRestrictionGroup" ${r?'':'hidden'}>${field('제한 내용','restrictionTitle','text',r?.title||x.agreementName||'사용 제한')}<div class="periodDates periodDatesV8">${field('제한 시작일','start','date',start)}${field('제한 종료일','end','date',end)}</div></div>`:'';
 form(fields+period,v=>{
  if(!momOnly())return false;
  const enabled=isMinus&&!!document.querySelector('#editRestrictionToggle')?.checked;
  const group=document.querySelector('#editRestrictionGroup');
  const restricted={title:group?.querySelector('[name="restrictionTitle"]')?.value.trim()||'',start:group?.querySelector('[name="start"]')?.value||'',end:group?.querySelector('[name="end"]')?.value||''};
  if((isMinus&&!v.reason?.trim())||!Number.isFinite(Number(v.amount))||!v.date)return alert('날짜, 포인트, 사유를 확인해 주세요.'),false;
  if(enabled&&(!restricted.start||!restricted.end||restricted.end<restricted.start||!restricted.title))return alert('제한 시작일·종료일 및 제한 내용을 확인해 주세요.'),false;
  if(r){
   if(enabled)update('restrictions',r.id,{...restricted,status:'active',releasedAt:null,reason:v.reason.trim(),editedBy:role});
   else update('restrictions',r.id,{status:'cancelled',editedBy:role});
  }else if(enabled){add('restrictions',{transactionId:id,agreementId:x.agreementId||null,...restricted,status:'active',reason:v.reason.trim(),editedBy:role});}
  const agreement=valid('agreements').find(z=>z.id===v.agreementId);update('transactions',id,{date:v.date,amount:Number(v.amount),reason:v.reason.trim(),categoryId:v.categoryId,categoryName:cat(v.categoryId)?.name||'기타',agreementId:v.agreementId||'',agreementName:agreement?.title||v.agreementName||'',editedBy:role});
 });
 const agreementSelect=document.querySelector('#modalRoot [name="agreementId"]');
 const customWrap=document.querySelector('#customAgreementNameWrap');
 if(agreementSelect&&customWrap){
  const refreshCustom=()=>{customWrap.hidden=!!agreementSelect.value};
  agreementSelect.addEventListener('change',refreshCustom);
  refreshCustom();
 }
 const toggle=document.querySelector('#editRestrictionToggle');if(toggle)toggle.addEventListener('change',()=>{document.querySelector('#editRestrictionGroup').hidden=!toggle.checked});
}

function agreementsView(){
 const status=listFilter.agreementStatus||'active';const all=valid('agreements');
 const a=all.filter(x=>(listFilter.agreements==='all'||x.kind===listFilter.agreements)&&(status==='archived'?x.status==='archived':x.status!=='archived')).sort((x,y)=>(y.updatedAt||y.createdAt||'').localeCompare(x.updatedAt||x.createdAt||''));
 const pending=valid('proposals').filter(x=>role==='mom'?x.status==='pending':x.owner===role&&x.status!=='pending'&&!state.seenProposalIds?.includes(x.id));
 const running=all.filter(x=>x.status!=='archived').length,archived=all.filter(x=>x.status==='archived').length,monthChecks=valid('checks').filter(x=>x.date?.startsWith(listMonth.checks)).length;
 return `<div class="card"><div class="titleline"><h2>우리의 약속 🤝</h2>${role==='mom'?btn('＋ 새 항목','primary','onclick="editAgreement()"'):btn('＋ 제안','primary','onclick="openProposal()"')}</div>
 ${pending.length?`<button class="proposalAlert" onclick="openAgreementsSection('proposals')">💌 ${role==='mom'?'검토할 새로운 제안':'새로운 제안 결과'} ${pending.length}건 확인하기 →</button>`:''}
 <div class="agreementStats"><div><strong>${running}</strong><small>진행 중</small></div><div><strong>${monthChecks}</strong><small>이번 달 실천</small></div><div><strong>${archived}</strong><small>종료·보관</small></div></div>
 <div class="choicebar compactFilters">${[['all','전체'],['promise','우리의 약속'],['praise','칭찬 항목']].map(([id,label])=>`<button class="choice ${listFilter.agreements===id?'active':''}" onclick="listSet('agreements','${id}','${id}')">${label}</button>`).join('')}</div>
 <div class="choicebar compactFilters">${[['active','진행 중'],['archived','종료·보관']].map(([id,label])=>`<button class="choice ${status===id?'active':''}" onclick="listSet('agreementStatus','${id}','${id}')">${label}</button>`).join('')}</div>
 <div class="agreementSearchBox"><input id="agreementSearch" type="search" placeholder="약속 제목·카테고리 검색" value="${esc(agreementSearch)}" oninput="filterAgreementSearch(this.value)"><div class="categoryControls"><button class="tiny" onclick="toggleAllCategories(true)">모두 펼치기</button><button class="tiny" onclick="toggleAllCategories(false)">모두 접기</button></div></div>
 ${agreementCategoryRows(a)}

 <div class="agreementLinks"><button class="secondary" onclick="openAgreementsSection('proposals')">💌 제안함</button><button class="secondary" onclick="openAgreementsSection('checks')">✅ 실천내역</button><button class="secondary" onclick="openAgreementsSection('restrictions')">🔒 기간 제한</button>${role==='mom'?`<button class="secondary" onclick="openCategoryList()">🏷️ 카테고리</button>`:''}</div></div>`;
}
function agreementCategoryRows(items){
 const groups=new Map();for(const a of items){const name=cat(a.categoryId)?.name||'기타';if(!groups.has(name))groups.set(name,[]);groups.get(name).push(a)}
 const term=agreementSearch.trim().toLowerCase();let output='';let matched=0;
 for(const [name,all] of groups){const rows=all.filter(a=>!term||name.toLowerCase().includes(term)||String(a.title||'').toLowerCase().includes(term)||String(a.content||'').toLowerCase().includes(term));if(!rows.length)continue;matched+=rows.length;const opened=term?true:!!expandedCategories[name];
 output+=`<div class="agreementGroup"><button class="agreementGroupHead" onclick="toggleAgreementCategory('${encodeURIComponent(name)}')"><span>📁 ${esc(name)}</span><span>${rows.length}개 ${opened?'⌃':'⌄'}</span></button>${opened?rows.map(a=>`<button class="agreementListRow" onclick="agreementDetail('${a.id}')"><span><strong>${esc(a.title)}</strong><small>${a.kind==='praise'?'칭찬·상점':'약속·벌점'}</small></span><span class="agreementPoints ${a.kind==='praise'?'plus':'minus'}">${a.kind==='praise'?'+':'−'}${a.kind==='praise'?Number(a.reward||0):Number(a.penalty||0)}P</span><span class="agreementArrow">›</span></button>`).join(''):''}</div>`;
 }return output||'<div class="emptymsg">검색 결과가 없어요.</div>';
}
function toggleAgreementCategory(encoded){const name=decodeURIComponent(encoded);expandedCategories[name]=!expandedCategories[name];render()}
function toggleAllCategories(open){expandedCategories=Object.fromEntries(valid('categories').map(x=>[x.name,open]));expandedCategories['기타']=open;render()}
function filterAgreementSearch(v){agreementSearch=v;const el=document.getElementById('agreementSearch');const pos=el?.selectionStart;render();const next=document.getElementById('agreementSearch');if(next){next.focus();try{next.setSelectionRange(pos,pos)}catch{}}}
function quickCloudSync(){if(!window.v9cloud?.isConnected?.()){go('more');document.getElementById('cloudSyncPanel')?.scrollIntoView({behavior:'smooth'});return}window.v9cloud.sync()}
function agreementDetail(id){const x=valid('agreements').find(a=>a.id===id);if(!x)return;const archived=x.status==='archived';modal('약속·칭찬 상세',`<div class="notice"><strong>${esc(x.title)}</strong><br>${esc(cat(x.categoryId)?.name||'기타')} · ${archived?'종료·보관':'진행 중'}</div><p><b>내용</b><br>${esc(x.content||x.description||'')}</p>${x.criterion?`<p><b>기준</b><br>${esc(x.criterion)}</p>`:''}<p>상점 +${Number(x.reward||0)}P · 벌점 −${Number(x.penalty||0)}P ${x.days>0?'· 기본 제한 '+x.days+'일':''}</p><div class="detailActions">${role==='mom'&&!archived?`<button class="primary" onclick="logCheck('${x.id}')">실천 기록</button>`:''}<button class="secondary" onclick="agreementHistory('${x.id}')">과거 내역</button>${role==='mom'?`<button class="secondary" onclick="editAgreement('${x.id}')">수정</button><button class="secondary" onclick="changeAgreementStatus('${x.id}')">${archived?'약속 재개':'종료·보관'}</button>`:`<button class="secondary" onclick="openProposal('${x.id}')">변경 제안</button>`}</div>`)}
function openAgreementsSection(section,refresh=false){const checks=valid('checks').filter(x=>x.date?.startsWith(listMonth.checks)).sort((a,b)=>(b.date+(b.updatedAt||'')).localeCompare(a.date+(a.updatedAt||'')));if(section==='proposals'){modal('약속·상점 제안함',proposalsView(),refresh);return}if(section==='checks'){modal('실천내역',`<input type="month" value="${listMonth.checks}" onchange="listMonth.checks=this.value;openAgreementsSection('checks',true)">${checks.slice(0,listPage.checks).map(x=>compactItem(esc(x.title||'약속'),esc(x.date),esc(x.reason||''),x.result==='kept'?'✅':'⚠️')).join('')||'<div class="emptymsg">해당 월 기록이 없어요.</div>'}${checks.length>listPage.checks?`<button class="secondary full" onclick="listPage.checks+=5;openAgreementsSection('checks',true)">5개 더보기</button>`:''}`,refresh);return}if(section==='restrictions'){const active=valid('restrictions').filter(x=>x.status!=='cancelled'&&x.end>=today()&&(!x.releasedAt||x.releasedAt>today()));modal('진행 중인 제한',`${role==='mom'?btn('＋ 기간 제한','secondary','onclick="openRestriction()"'):''}${active.map(x=>compactItem('🔒 '+esc(x.title),`${x.start} ~ ${x.end}`,esc(x.reason||''),role==='mom'?`<button class="tiny" onclick="editRestriction('${x.id}')">수정·조기 해제</button>`:'')).join('')||'<div class="emptymsg">현재 제한이 없어요.</div>'}`)}}
function openDayAll(kind){const list=valid(kind).filter(x=>x.date===selected&&(x.owner===role||x.visibility==='shared'));modal(formatDate(selected)+' 전체 기록',list.map(x=>`<div class="item"><strong>${esc(x.title||x.type||x.result||'기록')}</strong><p>${esc(x.reason||x.text||'')}</p></div>`).join('')||'<p class="emptymsg">기록이 없어요.</p>')}
function agreementHistory(id){const a=valid('agreements').find(x=>x.id===id);if(!a)return;const entries=valid('checks').filter(x=>x.agreementId===id).sort((x,y)=>(y.date+(y.updatedAt||'')).localeCompare(x.date+(x.updatedAt||'')));modal('약속 과거 실천 내역',`<div class="notice"><strong>${esc(a.title)}</strong><br>${a.status==='archived'?'종료·보관':'진행 중'} ${a.endedAt?'· 종료일 '+esc(a.endedAt):''}</div>${entries.map(x=>`<div class="item"><strong>${esc(x.date)} · ${x.result==='kept'?'✅ 실천':'⚠️ 위반'}</strong><p>${esc(x.reason||'')}</p></div>`).join('')||'<p class="emptymsg">실천 기록이 없어요.</p>'}<button class="secondary full" type="button" onclick="closeModal()">닫기</button>`)}
function changeAgreementStatus(id){if(!momOnly())return;const a=valid('agreements').find(x=>x.id===id);if(!a)return;const archived=a.status==='archived';form(`<div class="notice">${esc(a.title)} — ${archived?'약속 재개':'약속 종료·보관'}</div>${field(archived?'재개 날짜':'종료 날짜','date','date',today(),true)}${textarea('사유','reason','',true)}<p class="muted">과거 실천기록과 상점/벌점은 그대로 보존됩니다.</p>`,v=>{if(!v.reason.trim())return false;const history=[...(a.statusHistory||[]),{action:archived?'resumed':'archived',date:v.date,reason:v.reason,by:role,at:dtime()}];update('agreements',id,archived?{status:'active',resumedAt:v.date,statusHistory:history}:{status:'archived',endedAt:v.date,endReason:v.reason,statusHistory:history});listPage.agreements=5;});}
function editAgreement(id, preset={}){if(!momOnly())return;let x=valid('agreements').find(x=>x.id===id),cats=valid('categories');form(`${select('항목 구분','kind',`<option value="promise" ${(x?.kind||preset.kind)!=='praise'?'selected':''}>우리의 약속</option><option value="praise" ${(x?.kind||preset.kind)==='praise'?'selected':''}>칭찬 항목</option>`)}${select('카테고리','categoryId',optionRows(cats,x?.categoryId||preset.categoryId))}${field('항목 이름 (필수)','title','text',x?.title||'',true)}${textarea('내용 (필수)','content',x?.content||x?.description||'',true)}${textarea('기준 (선택)','criterion',x?.criterion||'')}${field('기본 상점 (+P)','reward','number',x?.reward??cat(x?.categoryId)?.reward??10,true)}${field('기본 벌점 (-P)','penalty','number',x?.penalty??cat(x?.categoryId)?.penalty??10,true)}${field('차감 시 기본 제한 기간 (일, 없으면 0)','days','number',x?.days??0,true)}${field('기본 제한 내용','restrictionTitle','text',x?.restrictionTitle||'')}${select('반복 주기','recurrence',['필요할 때','매일','평일','주말','매주'].map(t=>`<option ${x?.recurrence===t?'selected':''}>${t}</option>`).join(''))}<p class="muted">제한 기간은 차감 등록 시 기본값으로 표시되며, 직접 수정하거나 끌 수 있어요.</p>`,v=>{if(!v.title.trim()||!v.content.trim()||[v.reward,v.penalty,v.days].some(y=>!Number.isFinite(+y)||+y<0))return alert('필수 항목과 숫자를 확인하세요.'),false;let data={...v,reward:+v.reward,penalty:+v.penalty,days:+v.days};if(x)update('agreements',x.id,data);else{let created=add('agreements',data);if(returnPoint&&pointDraft){pointDraft.agreementId=created.id;pointDraft.categoryId=created.categoryId;pointDraft.amount=String(created.kind==='praise'?created.reward:created.penalty);pointDraft.days=String(created.days||0);pointDraft.restrict=created.days>0;pointDraft.restrictionTitle=created.restrictionTitle||created.title;}}})}
function chooseCheckResult(button,value){
 const f=button.closest('form');f.elements.namedItem('result').value=value;
 button.parentElement.querySelectorAll('button').forEach(b=>b.classList.toggle('active',b===button));
 const a=valid('agreements').find(x=>x.id===f.dataset.agreement);
 const points=f.elements.namedItem('points');if(points)points.value=value==='kept'?Number(a?.reward||0):Number(a?.penalty||0);
 const area=f.querySelector('#practiceRestriction');if(area)area.hidden=value!=='broken';
}
function togglePracticeRestriction(el){const panel=el.closest('form').querySelector('#practiceRestrictionFields');if(panel)panel.hidden=!el.checked}
function logCheck(id){
 if(!momOnly())return;const a=valid('agreements').find(x=>x.id===id);if(!a||a.status==='archived')return alert('종료된 약속은 실천 기록을 추가할 수 없어요.');
 const initialDate=today();
 form(`<div class="notice"><strong>${esc(a.title)}</strong><br>${esc(a.content||a.description||'')}${a.criterion?`<br>기준: ${esc(a.criterion)}`:''}</div>
 ${field('실천 날짜','date','date',initialDate,true)}
 <div class="choicebar checkResultChoices"><button type="button" class="choice active" onclick="chooseCheckResult(this,'kept')">✅ 약속 지킴 / 칭찬</button><button type="button" class="choice" onclick="chooseCheckResult(this,'broken')">⚠️ 약속 위반</button></div><input type="hidden" name="result" value="kept">
 ${field('상점/벌점 포인트 (0 가능)','points','number',a.reward??0,true)}
 <div id="practiceRestriction" hidden><label class="checkrow"><input type="checkbox" name="restrict" onchange="togglePracticeRestriction(this)" ${a.days>0?'checked':''}> 기간 제한 적용</label>
 <div id="practiceRestrictionFields" ${a.days>0?'':'hidden'}>${field('제한 기간 (일)','days','number',a.days||1,true)}${field('기간 중 제한·실천할 내용','restrictionTitle','text',a.restrictionTitle||a.title,true)}${field('제한 시작일','start','date',initialDate,true)}</div></div>
 ${textarea('구체적인 실천·위반 사유 (필수)','reason','',true)}<p class="muted">포인트가 0이면 거래를 만들지 않고 실천만 기록해요.</p>`,v=>{
  const kept=v.result==='kept',points=Number(v.points);if(!v.reason?.trim()||!v.date||!Number.isFinite(points)||points<0)return alert('날짜, 포인트, 사유를 확인해 주세요.'),false;
  if(!kept&&v.restrict&&(!Number.isInteger(+v.days)||+v.days<1||!v.restrictionTitle?.trim()||!v.start))return alert('제한 기간과 내용을 확인해 주세요.'),false;
  const check=add('checks',{agreementId:id,title:a.title,date:v.date,result:v.result,reason:v.reason,points:kept?points:-points});
  let tx=null;if(points>0)tx=add('transactions',{date:v.date,agreementId:id,checkId:check.id,categoryId:a.categoryId,categoryName:cat(a.categoryId)?.name||'',agreementName:a.title,reason:v.reason,amount:kept?points:-points});
  let rest=null;if(!kept&&v.restrict){rest=add('restrictions',{agreementId:id,checkId:check.id,transactionId:tx?.id||null,title:v.restrictionTitle,reason:v.reason,start:v.start,end:datePlus(v.start,+v.days-1),status:'active'});}
  update('checks',check.id,{pointTransactionId:tx?.id||null,restrictionId:rest?.id||null});selected=v.date;setTimeout(()=>alert('실천기록이 저장되었어요.\n'+a.title+' · '+(kept?'성공':'실패')+' · '+(points?((kept?'+':'-')+points+'P'):'0P')),0);
 });
 const f=$('#entryForm');if(f)f.dataset.agreement=id;
}
function openRestriction(){if(!momOnly())return;form(`${field('제한 내용','title','text','TV/게임 제한',true)}${textarea('사유','reason','',true)}${field('시작일','start','date',selected,true)}${field('종료일','end','date',selected,true)}`,v=>{if(v.end<v.start)return alert('종료일이 시작일보다 빠를 수 없어요.'),false;add('restrictions',{...v,status:'active'})})}
function editRestriction(id){if(!momOnly())return;let x=valid('restrictions').find(t=>t.id===id);if(!x)return;form(`${field('제한 내용','title','text',x.title,true)}${textarea('사유','reason',x.reason||'',true)}<div class="periodDates periodDatesV8">${field('시작일','start','date',x.start,true)}${field('종료일','end','date',x.end,true)}</div>${x.status==='active'?`<button type="button" class="danger full mt" onclick="earlyRelease('${x.id}')">🔓 기간 제한 조기 해제</button>`:''}`,v=>{if(v.end<v.start||!v.title.trim())return alert('날짜와 제한 내용을 확인해주세요.'),false;update('restrictions',id,v)})}
function earlyRelease(id){if(!momOnly())return;let x=valid('restrictions').find(t=>t.id===id);if(!x)return;form(`<div class="notice">${esc(x.title)}<br>기존 기간: ${esc(x.start)} ~ ${esc(x.end)}</div>${field('조기 해제일','releasedAt','date',today(),true)}${textarea('해제 사유','releaseReason','',true)}`,v=>{if(!v.releaseReason.trim()||v.releasedAt<x.start)return alert('해제일과 사유를 확인해주세요.'),false;update('restrictions',id,{releasedAt:v.releasedAt,releaseReason:v.releaseReason,releasedBy:role,originalEnd:x.originalEnd||x.end,status:'released'});});}
function openProposal(agreementId=''){let a=valid('agreements').find(x=>x.id===agreementId);form(`${select('제안 종류','kind',`<option value="promise" ${a?.kind!=='praise'?'selected':''}>약속</option><option value="praise" ${a?.kind==='praise'?'selected':''}>칭찬</option>`)}${select('카테고리','categoryId',optionRows(valid('categories'),a?.categoryId))}${field('항목 이름','title','text',a?.title||'',true)}${textarea('내용','content',a?.content||a?.description||'',true)}${textarea('기준','criterion',a?.criterion||'')}${field('희망 기본 포인트','points','number',a?.kind==='praise'?a.reward:a?.penalty??10,true)}${textarea('제안 이유','reason','',true)}`,v=>{if(!v.title.trim()||!v.content.trim()||!v.reason.trim()||Number(v.points)<0)return false;add('proposals',{...v,kind:v.kind==='praise'?'praise':'promise',points:Number(v.points),agreementId,status:'pending'})},'제안 보내기')}
function proposalsView(){
 const all=valid('proposals').sort((a,b)=>(b.updatedAt||'').localeCompare(a.updatedAt||''));
 const arr=all.filter(x=>proposalFilter==='pending'?x.status==='pending':x.status!=='pending');
 return `<div class="proposalList" id="proposalPanel"><div class="titleline"><h2>💌 약속·상점 제안함</h2>${btn('＋ 제안하기','secondary','onclick="openProposal()"')}</div><div class="choicebar">${[['pending','검토 대기'],['done','처리 완료']].map(([v,t])=>`<button class="choice ${proposalFilter===v?'active':''}" onclick="setProposalFilter('${v}')">${t} (${all.filter(x=>v==='pending'?x.status==='pending':x.status!=='pending').length})</button>`).join('')}</div>${arr.slice(0,proposalFilter==='pending'?undefined:proposalPage).map(x=>`<button class="proposalRow" onclick="proposalDetail('${x.id}')"><span><strong>${esc(x.title)}</strong><small>${x.kind==='praise'?'상점·칭찬':'약속·벌점'} · ${x.owner==='mom'?'엄마':'딸'} · ${x.kind==='praise'?'+':'−'}${Number(x.points||0)}P</small></span><span class="tag">${x.status==='pending'?'검토 대기':x.status==='approved'?'✅ 승인':'거절'}</span><span>›</span></button>`).join('')||'<div class="emptymsg">해당하는 제안이 없어요.</div>'}${proposalFilter==='done'&&arr.length>proposalPage?`<button class="secondary full mt" onclick="moreProposals()">처리된 제안 3건 더보기</button>`:''}</div>`;
}
function setProposalFilter(v){proposalFilter=v;openAgreementsSection('proposals',true)}
function moreProposals(){proposalPage+=3;openAgreementsSection('proposals',true)}
function showProposalsTop(){state.seenProposalIds=valid('proposals').filter(x=>x.owner===role&&x.status!=='pending').map(x=>x.id);write();openAgreementsSection('proposals')}
function proposalDetail(id){const x=valid('proposals').find(y=>y.id===id);if(!x)return;modal('제안 상세',`<div class="notice"><strong>${esc(x.title)}</strong><br>${x.kind==='praise'?'상점·칭찬 (+)':'약속·벌점 (−)'} ${Number(x.points||0)}P · ${x.status==='pending'?'검토 대기':x.status==='approved'?'승인 완료':'거절'}</div><p><b>카테고리</b><br>${esc(cat(x.categoryId)?.name||'기타')}</p><p><b>내용</b><br>${esc(x.content||'')}</p><p><b>기준</b><br>${esc(x.criterion||'없음')}</p><p><b>제안 이유</b><br>${esc(x.reason||'없음')}</p>${x.status==='rejected'?`<p><b>거절 사유</b><br>${esc(x.rejectionReason||'입력 없음')}</p>`:''}${role==='mom'&&x.status==='pending'?`<div class="grid2"><button class="secondary" onclick="openProposalReject('${x.id}')">거절</button><button class="primary" onclick="decideProposal('${x.id}',true)">승인하기</button></div>`:''}`)}
function openProposalReject(id){if(!momOnly())return;modal('제안 거절',`<p>거절 사유는 선택 입력이에요. 딸에게 동기화로 전달돼요.</p><form id="proposalRejectForm">${textarea('거절 사유 (선택)','rejectionReason','')}<button class="danger full" type="submit">거절 확정</button></form>`);document.getElementById('proposalRejectForm').onsubmit=e=>{e.preventDefault();decideProposal(id,false,new FormData(e.target).get('rejectionReason')||'')}}
function decideProposal(id,approve,rejectionReason=''){
 if(!momOnly())return;const x=valid('proposals').find(t=>t.id===id);if(!x||x.status!=='pending'){alert('이미 처리된 제안이에요.');return}
 if(!['praise','promise'].includes(x.kind)){alert('제안 종류가 올바르지 않아요. 승인 전 종류를 확인해 주세요.');return}
 if(approve){let linked=valid('agreements').find(a=>a.sourceProposalId===id);if(!linked){linked=add('agreements',{kind:x.kind,categoryId:x.categoryId,title:x.title,content:x.content,criterion:x.criterion,reward:x.kind==='praise'?Number(x.points):0,penalty:x.kind==='promise'?Number(x.points):0,days:0,restrictionTitle:'',sourceProposalId:id})}update('proposals',id,{status:'approved',decidedBy:role,approvedAgreementId:linked.id,decidedAt:dtime()})}
 else update('proposals',id,{status:'rejected',rejectionReason:String(rejectionReason).trim(),decidedBy:role,decidedAt:dtime()});
 closeAllModals();openAgreementsSection('proposals');
}

function rewardsView(){let items=valid('rewards'),req=valid('requests');return `<div class="card"><div class="titleline"><h2>보상 상점 🎁</h2><span class="pill">${balance()} P</span></div><div class="row">${role==='mom'?btn('＋ 보상 아이템 추가','primary','onclick="editReward()"'):''}</div><div class="grid2 mt">${items.map(x=>`<div class="stat"><strong style="font-size:15px">🎁 ${esc(x.title)}</strong><p>${x.cost}P</p><button class="tiny" onclick="requestReward('${x.id}')">사용 신청</button> ${role==='mom'?`<button class="tiny" onclick="editReward('${x.id}')">수정</button>`:''}</div>`).join('')}</div>${!items.length?'<div class="emptymsg">보상 아이템을 추가해보세요.</div>':''}</div><div class="card"><div class="titleline"><h2>보상 신청 내역</h2><span class="pill">승인 대기 ${req.filter(r=>r.status==='requested').length}건</span></div>${req.sort((a,b)=>(b.updatedAt||'').localeCompare(a.updatedAt||'')).map(x=>`<button class="rewardRequestRow" onclick="requestDetail('${x.id}')"><span><strong>${esc(x.title)}</strong><small>${esc(x.date||'')} · ${x.owner==='mom'?'엄마':'딸'} 신청 · ${Number(x.cost||0)}P</small></span><span class="tag">${esc(requestStatusText(x.status))}</span><span aria-hidden="true">›</span></button>`).join('')||'<div class="emptymsg">신청 내역이 없어요.</div>'}</div>`}

function editReward(id){if(!momOnly())return;let x=valid('rewards').find(x=>x.id===id);form(`${field('보상 아이템 이름','title','text',x?.title||'',true)}${field('필요 포인트','cost','number',x?.cost??100,true)}${textarea('보상 아이템 설명','description',x?.description||'')}`,v=>{if(+v.cost<0)return false;let data={...v,cost:+v.cost};x?update('rewards',x.id,data):add('rewards',data)})}
function requestReward(id){let x=valid('rewards').find(x=>x.id===id);if(!confirm(`${x.title} (${x.cost}P)을 신청할까요?`))return;add('requests',{rewardId:id,title:x.title,cost:x.cost,date:today(),status:'requested'});alert('신청을 기록했어요. 승인 후 사용 완료하면 포인트가 차감돼요.')}
function setRequest(id,status){if(!momOnly())return;let x=valid('requests').find(x=>x.id===id);if(status==='used'){if(balance()<x.cost)return alert('포인트가 부족해요.');if(valid('transactions').some(t=>t.requestId===id))return alert('이미 차감된 보상이에요.');add('transactions',{date:today(),requestId:id,reason:'보상 아이템 사용: '+x.title,categoryName:'보상 상점',amount:-x.cost})}update('requests',id,{status,decidedBy:'mom',decidedAt:dtime()})}
function moreView(){let d=valid('daily'),m=valid('messages'),t=valid('transactions');let start=datePlus(today(),-6);return `<div class="card"><h2>우리의 7일 🌷</h2><div class="grid2"><div class="stat"><strong>${d.filter(x=>x.date>=start).length}</strong><small>감정 기록</small></div><div class="stat"><strong>${m.filter(x=>x.date>=start).length}</strong><small>마음 카드</small></div><div class="stat"><strong>${t.filter(x=>x.date>=start&&x.amount>0).length}</strong><small>칭찬 횟수</small></div><div class="stat"><strong>${valid('checks').filter(x=>x.date>=start&&x.result==='kept').length}</strong><small>약속 실천</small></div></div></div><div class="card" id="cloudSyncPanel"><div class="titleline"><h2>☁️ 서버 수동 동기화 · v9.2 실제 기록</h2><span class="pill">실제 기록 전용</span></div><p class="muted">v9.1 테스트 기록과 분리된 새 저장 공간입니다. 우선 각자 v9.2 이전용 전체 백업을 가져온 후 동기화하세요. 서버의 v9.1 시험 기록은 읽지 않습니다.</p><textarea id="cloudConfig" rows="5" placeholder="Firebase 설정 JSON"></textarea><div class="mt">${btn('① Firebase 연결 / 내 UID 확인','secondary','onclick="cloudConnect()"')}</div><div class="mt">${btn('② 서버와 동기화','primary','onclick="cloudSync()"')}</div><p class="muted" id="cloudStatus">연결 전 · 아직 서버로 전송한 데이터 없음</p><div class="notice">반드시 Firestore Rules에 v9.2 실데이터 경로를 먼저 추가해 주세요. 기존 v9.1 테스트 기록은 서버에 격리 보존됩니다.</div></div><div class="card"><div class="titleline"><h2>iCloud 공유센터 ☁️</h2><span class="pill">수동 공유</span></div><p class="muted">저장 위치: iCloud Drive / Apps-내가만든 / between-us / <strong>${role}</strong> / <strong>${role}.json</strong></p><p class="muted">내보낸 파일은 iOS 저장 화면에서 위 경로를 직접 선택하고, 같은 이름의 파일을 교체해 주세요.</p><div class="notice">iCloud에 자동 백업되는 방식이 아니에요. 내보내기 후 파일 앱에서 공유 폴더를 직접 선택해야 해요.</div><div class="mt">${btn('☁️ 내 공유 기록 내보내기','primary','onclick="exportData(false)"')}</div><div class="mt">${btn('📥 상대방 기록 가져오기','secondary','onclick="pickImport()"')}</div><p class="muted">마지막 내보내기: ${esc(state.lastExport||'없음')}<br>마지막 가져오기: ${esc(state.lastImport||'없음')}</p><div class="row">${btn('🔐 전체 개인 백업','secondary','onclick="exportData(true)"')}${btn('전체 백업 복원','secondary','onclick="pickImport()"')}</div></div><div class="card"><h2>설정 및 안내</h2><button class="settingslink" onclick="changeRole()">👤 이 기기의 사용자: ${getName()} → 변경</button><button class="settingslink" onclick="openCategoryList()">🏷️ 전체 카테고리 관리 (약속·칭찬 공통)</button><button class="settingslink" onclick="openCardTypes()">💌 마음 카드 종류 관리</button><button class="settingslink" onclick="showGuide()">📘 공유·데이터 보관 안내</button><div class="muted">앱 버전 9.3 · 기존 시험 데이터와 분리된 저장소</div></div>`}
function showGuide(){modal('공유 안내',`<p>1. 엄마와 딸의 아이폰에 앱을 설치하고 각자의 사용자 역할을 선택해요.</p><p>2. 각자 일기·감정·마음 카드를 기록하고, 엄마가 포인트·제한을 확정해요.</p><p>3. <b>내 공유 기록 내보내기</b>를 누르고 파일 앱의 iCloud Drive / Apps-내가만든 / between-us의 각자 mom 또는 daughter 폴더에 저장해요. 파일명은 mom.json 또는 daughter.json으로 고정됩니다.</p><p>4. 상대방은 <b>상대방 기록 가져오기</b>에서 해당 JSON 파일을 선택해요.</p><p>5. 서로 기록을 수정한 경우 수정 시각이 더 새로운 데이터가 반영됩니다. 동시 수정 충돌은 완전히 해결되지 않습니다. 실제 서비스에서는 충돌 검토가 필요하므로 중요한 기록은 별도로 백업하세요.</p><div class="notice">🔒 나만 보기 감정·마음 카드는 공유 파일에서 제외해요. 전체 개인 백업은 비공개 기록도 포함하므로 공유 폴더에 넣지 마세요.<br>별도 암호화는 제공하지 않아요. 아이폰 저장공간이나 브라우저 데이터를 지우면 기록이 삭제될 수 있어요.</div>`)}
function exportData(full,mode='icloud'){let data={app:'BetweenUs',version:1,kind:full?'full-backup':'shared-sync',exportedAt:dtime(),sourceDevice:device,sourceRole:role,collections:{}};collections.forEach(c=>{data.collections[c]=state[c].filter(x=>full||ownShare(c,x))});let blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),filename=full?`between-us-${role}-private-backup-${today()}.json`:`${role}.json`,file=new File([blob],filename,{type:'application/json'});const mark=()=>{state.lastExport=formatStamp();write();render()};if(navigator.canShare?.({files:[file]})&&navigator.share){navigator.share({files:[file],title:mode==='airdrop'?'우리 사이 · AirDrop 선택':'우리 사이 · 파일에 저장 선택'}).then(()=>{mark();alert(mode==='airdrop'?'공유 메뉴에서 AirDrop을 선택해 전송했는지 확인해주세요.':'공유 메뉴에서 ‘파일에 저장’을 선택하고 iCloud Drive의 지정 폴더를 확인해주세요.')}).catch(err=>{if(err.name!=='AbortError'){downloadFile(blob,filename,()=>{});alert('공유 메뉴를 열 수 없어 JSON 다운로드로 대체했어요. 파일 앱에서 iCloud에 저장하거나 AirDrop으로 공유해주세요.')}})}else{downloadFile(blob,filename,()=>{});alert('이 환경에서는 파일 공유 메뉴가 지원되지 않아 JSON으로 다운로드했어요. 파일 앱에서 iCloud Drive로 옮기거나 AirDrop으로 보내주세요.')}}
function downloadFile(blob,filename,done){let url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),5000);done()}
function pickImport(){$('#importFile').value='';$('#importFile').click()}
async function importData(file){if(!file)return;if(file.size>25*1024*1024)return alert('파일이 너무 커요 (최대 25MB).');let data;try{data=JSON.parse(await file.text())}catch{return alert('JSON 파일을 읽을 수 없어요.')}if(data.app!=='BetweenUs'||data.version!==1||!data.collections||!Array.isArray(data.collections.daily))return alert('지원하지 않는 파일이에요.');if(data.kind==='full-backup'&&data.sourceRole!==role)return alert('다른 사람의 비공개 전체 백업은 가져오지 않아요.');if(data.kind==='full-backup'&&!confirm('v9.2에 본인의 이전용 전체 백업을 가져옵니다.\n파일이 원본이 아니라 이전용 IMPORT 파일인지 확인해주세요.\n계속할까요?'))return;if(!confirm(`${data.kind==='full-backup'?'전체 백업':'공유 기록'}을 현재 기록에 병합할까요?\n보낸 사람: ${data.sourceRole||'알 수 없음'}`))return;let added=0,changed=0;for(const c of collections){let incoming=data.collections[c];if(!Array.isArray(incoming))continue;for(const x of incoming){if(!x||typeof x.id!=='string'||typeof x.updatedAt!=='string')continue;if((c==='daily'||c==='messages')&&x.visibility==='private'&&data.kind!=='full-backup')continue;let idx=state[c].findIndex(y=>y.id===x.id);if(idx<0){state[c].push(x);added++}else if(x.updatedAt>state[c][idx].updatedAt){state[c][idx]=x;changed++}}}state.lastImport=new Date().toLocaleString('ko-KR');await write();render();alert(`가져오기 완료!\n새 기록 ${added}건, 갱신 ${changed}건\n동일 기록은 중복 추가하지 않았어요.`)}
function deleteAsk(c,id){if(['transactions','restrictions','agreements','categories','rewards'].includes(c)&&!momOnly())return;if(!confirm('해당 기록을 삭제/보관할까요? (다음 공유에도 반영됩니다)'))return;remove(c,id);if(c==='cardTypes'&&cardReturn){cardReturn=false;openCardTypes()}else closeModal()}

function openCategoryList(){
 const rows=valid('categories').map(c=>`<div class="item"><strong>${esc(c.name)}</strong><span class="muted"> 기본 상점 +${Number(c.reward)||0}P / 기본 벌점 -${Number(c.penalty)||0}P</span> ${role==='mom'?`<button type="button" class="tiny" onclick="editCategory('${c.id}')">수정</button><button type="button" class="tiny" onclick="deleteAsk('categories','${c.id}')">보관</button>`:''}</div>`).join('');
 modal('카테고리 관리',`${rows||'<p>등록된 카테고리가 없어요.</p>'}${role==='mom'?'<button type="button" class="primary full mt" onclick="editCategory()">＋ 카테고리 추가</button>':''}`);
}
function editCategory(id){
 if(!momOnly())return;
 const c=id?valid('categories').find(x=>x.id===id):null;
 form(`${field('카테고리 이름','name','text',c?.name||'',true)}${field('기본 상점 포인트','reward','number',c?.reward??10,true)}${field('기본 벌점 포인트','penalty','number',c?.penalty??10,true)}`,v=>{
  const name=v.name.trim(),reward=Number(v.reward),penalty=Number(v.penalty);
  if(!name||!Number.isFinite(reward)||!Number.isFinite(penalty)||reward<0||penalty<0)return false;
  if(c)update('categories',c.id,{name,reward,penalty});else add('categories',{name,reward,penalty});
  setTimeout(openCategoryList,0);
 },'카테고리 저장');
}

window.requestDetail=requestDetail;window.requestAction=requestAction;window.openPendingRewards=openPendingRewards;window.quickCloudSync=quickCloudSync;window.toggleAllCategories=toggleAllCategories;window.toggleAgreementCategory=toggleAgreementCategory;window.filterAgreementSearch=filterAgreementSearch;window.setProposalFilter=setProposalFilter;window.proposalDetail=proposalDetail;window.openProposalReject=openProposalReject;window.cloudConnect=()=>window.v9cloud?.connect();window.cloudSync=()=>window.v9cloud?.sync();window.agreementDetail=agreementDetail;window.openAgreementsSection=openAgreementsSection;window.openDayAll=openDayAll;window.earlyRelease=earlyRelease;window.togglePracticeRestriction=togglePracticeRestriction;window.agreementHistory=agreementHistory;window.changeAgreementStatus=changeAgreementStatus;window.chooseCheckResult=chooseCheckResult;window.moreProposals=moreProposals;window.openCardManagerFromMessage=openCardManagerFromMessage;window.listSet=listSet;window.listMore=listMore;window.listMonthSet=listMonthSet;window.showProposalsTop=showProposalsTop;window.go=go;window.setRole=setRole;window.changeRole=changeRole;window.closeModal=closeModal;window.pickMood=pickMood;window.pickRelation=pickRelation;window.openCardTypes=openCardTypes;window.editCardType=editCardType;window.openProposal=openProposal;window.decideProposal=decideProposal;window.editTransaction=editTransaction;window.editRestriction=editRestriction;window.chooseDay=chooseDay;window.moveMonth=moveMonth;window.openDaily=openDaily;window.openPoint=openPoint;window.openMessage=openMessage;window.openCategoryList=openCategoryList;window.editCategory=editCategory;window.editAgreement=editAgreement;window.logCheck=logCheck;window.openRestriction=openRestriction;window.editReward=editReward;window.requestReward=requestReward;window.setRequest=setRequest;window.exportData=exportData;window.pickImport=pickImport;window.showGuide=showGuide;window.deleteAsk=deleteAsk;
(async()=>{try{await storeOpen();state=await read()||structuredClone(defaults);collections.forEach(k=>state[k]??=structuredClone(defaults[k]||[]));$('#importFile').addEventListener('change',e=>importData(e.target.files[0]));if(!role){role='mom';localStorage.setItem('bu_v9_role',role);render();changeRole()}else render();if('serviceWorker'in navigator&&location.protocol==='https:')navigator.serviceWorker.register('./sw.js').catch(()=>{})}catch(e){$('#app').innerHTML=`<div class="card"><h2>앱 저장소 오류</h2><p>${esc(e.message)}</p><p>Safari 일반 모드 또는 홈 화면에서 다시 실행해주세요.</p></div>`}})();

window.v9Data={getState:()=>state,getRole:()=>role,collections,ownShare,write,render,ensureReady:()=>!!state};
