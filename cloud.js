import {initializeApp,getApp,getApps} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js';
import {getAuth,onAuthStateChanged,signInAnonymously} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';
import {getFirestore,collection,doc,getDocs,setDoc} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';
const PREFIX='bu_v9_cloud_lab_', ROOM='family-sync-v9-real', COLLECTION='records';
let auth,store,user=null,busy=false;
const byId=id=>document.getElementById(id);
const status=(message)=>{const e=byId('cloudStatus');if(e)e.textContent=message;const q=byId('syncQuickStatus');if(q)q.textContent=message;localStorage.setItem(PREFIX+'status',message)};
const current=()=>window.v9Data;
const shared=(c,x)=> x && typeof x.id==='string' && typeof x.updatedAt==='string' && !( (c==='daily'||c==='messages')&&x.visibility==='private') && (x.owner==='mom'||x.owner==='daughter');
function refreshPanel(){const config=byId('cloudConfig');if(config&&!config.dataset.initialized){config.value=localStorage.getItem(PREFIX+'config')||'';config.dataset.initialized='1'}const st=byId('cloudStatus');if(st)st.textContent=localStorage.getItem(PREFIX+'status')||'연결 전 · 아직 서버로 전송한 데이터 없음';}
async function connect(silent=false){if(busy)return;busy=true;try{const raw=byId('cloudConfig')?.value?.trim()||localStorage.getItem(PREFIX+'config');if(!raw)throw Error('Firebase 설정 JSON을 입력해 주세요.');let cfg;try{cfg=JSON.parse(raw)}catch{throw Error('중괄호 안의 설정을 정확한 JSON 형식으로 입력해주세요.')}for(const k of ['apiKey','authDomain','projectId','appId'])if(!cfg[k])throw Error(k+' 항목이 없어요.');const existing=getApps().find(x=>x.name==='between-us-v9-cloud-lab');if(existing&&JSON.stringify(existing.options)!==JSON.stringify(cfg))throw Error('설정이 변경되었습니다. Safari 탭을 새로 열어서 연결해 주세요.');const app=existing||initializeApp(cfg,'between-us-v9-cloud-lab');auth=getAuth(app);store=getFirestore(app);const result=auth.currentUser?{user:auth.currentUser}:await signInAnonymously(auth);user=result.user;localStorage.setItem(PREFIX+'config',JSON.stringify(cfg));status('Firebase 연결 성공 · UID: '+user.uid+' · UID를 보안 규칙에 등록하세요.');if(!silent)alert('Firebase 연결 성공!\n현재 UID: '+user.uid+'\nUID를 복사하여 Firestore 규칙에 추가해야 동기화할 수 있습니다.')}catch(e){status('연결 오류: '+e.message)}finally{busy=false}}
async function sync(){if(busy)return;if(!user||!store){status('먼저 Firebase 연결을 해주세요.');return}if(!current()?.ensureReady()){status('로컬 데이터 준비 중입니다.');return}if(!current().getState().lastImport){status('먼저 내 v9.2 IMPORT 백업을 가져와 주세요.');return}busy=true;
 try{
 const local=current().getState();const role=current().getRole();const remoteRef=collection(store,'rooms',ROOM,COLLECTION);status('서버 기록을 읽는 중…');const snapshot=await getDocs(remoteRef);
 const remote=new Map(snapshot.docs.map(x=>[x.id,x.data()]));
 let toUpload=[],toDownload=[],conflicts=0;
 for(const c of current().collections){
   for(const rec of local[c]){
     if(!shared(c,rec))continue;
     const key=c+'__'+rec.id;const r=remote.get(key);
     if(!r){
       // Only upload one's own documents, or mother's amendments to child's proposal.
       if(rec.owner===role || (role==='mom'&&c==='proposals'&&rec.decidedBy==='mom'))toUpload.push({key,c,rec,mode:'create'});
     }else if(r.collection===c && r.record?.id===rec.id){
       if(rec.updatedAt>r.record.updatedAt){
         // A mother's approval, rejection or usage completion must sync even for
         // request documents created on the daughter's phone. Earlier versions
         // did not save decidedBy; also migrate those already-edited requests.
         const motherRequestDecision=role==='mom' && c==='requests' && rec.owner==='daughter'
           && ['approved','used','cancelled'].includes(rec.status);
         if(rec.owner===role || (role==='mom'&&c==='proposals'&&rec.decidedBy==='mom') || motherRequestDecision){
           const uploadRec=motherRequestDecision ? {...rec,decidedBy:'mom',decidedAt:rec.decidedAt||rec.updatedAt} : rec;
           toUpload.push({key,c,rec:uploadRec,mode:'update'});
         }
         else conflicts++;
       }else if(r.record.updatedAt>rec.updatedAt){toDownload.push({c,rec:r.record})}
     }
   }
 }
 for(const [key,r] of remote){
  if(!current().collections.includes(r.collection)||!shared(r.collection,r.record))continue;
  const existing=local[r.collection].find(x=>x.id===r.record.id);
  if(!existing)toDownload.push({c:r.collection,rec:r.record});
 }
 // Show changes before the first upload, and protect against unexpected bulk uploads.
 if(toUpload.length>100){throw Error('전송할 기록이 100건을 초과해 안전을 위해 중단했어요. 실제 가족 데이터를 가져오지 않았는지 확인해주세요.')}
 if((toUpload.length||toDownload.length)&&!confirm(`서버와 병합할까요?\n올리기 ${toUpload.length}건 / 가져오기 ${toDownload.length}건\n충돌 검토 필요 ${conflicts}건\n\nv9.2 실제 가족 기록만 사용해주세요.`)){status('동기화 취소됨');return}
 // Newer records pulled first; write is saved only after successful remote upload.
 let sent=0,received=0;
 for(const p of toUpload){
  const data={collection:p.c,record:JSON.parse(JSON.stringify(p.rec)),ownerUid:user.uid};
  await setDoc(doc(store,'rooms',ROOM,COLLECTION,p.key),data);sent++;
 }
 for(const p of toDownload){let i=local[p.c].findIndex(x=>x.id===p.rec.id);if(i<0){local[p.c].push(p.rec);received++}else if(p.rec.updatedAt>local[p.c][i].updatedAt){local[p.c][i]=p.rec;received++}}
 await current().write();current().render();localStorage.setItem('bu_v92_lastSync','최근 성공 '+new Date().toLocaleString('ko-KR'));status('동기화 완료 · 전송 '+sent+'건 / 가져오기 '+received+'건'+(conflicts?' / 검토 필요 '+conflicts+'건':''));
 }catch(e){status('동기화 실패: '+e.message)}finally{busy=false}}
window.v9cloud={connect,sync,refreshPanel,isConnected:()=>!!user&&!!store};refreshPanel();if(localStorage.getItem(PREFIX+'config'))connect(true);
