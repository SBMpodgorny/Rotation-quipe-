const PEOPLE=[
 {id:'bernardi',name:'Bernardi Jeremy'},
 {id:'banti',name:'Banti Hervé'},
 {id:'maccario',name:'Maccario Sebastien'},
 {id:'gaza',name:'Gaza Sébastien'},
 {id:'podgorny',name:'Podgorny Boris'}
];
const CYCLE_START='2026-08-01';
const KEY='rotationEquipe21';
const initialState=()=>({
 stayQueue:['bernardi','banti','maccario','gaza','podgorny'],
 returnQueue:['gaza','bernardi','banti','maccario','podgorny'],
 fifthQueue:['podgorny','maccario','banti','bernardi','gaza'],
 history:[
  {id:'h1',personId:'bernardi',action:'depart',service:'nuit1',date:'2026-08-01',time:'03:00'},
  {id:'h2',personId:'banti',action:'depart',service:'nuit1',date:'2026-08-01',time:'03:00'},
  {id:'h3',personId:'maccario',action:'depart',service:'nuit1',date:'2026-08-01',time:'03:00'},
  {id:'h4',personId:'gaza',action:'stay',service:'nuit1',date:'2026-08-01',time:'04:00'},
  {id:'h5',personId:'podgorny',action:'stay',service:'nuit1',date:'2026-08-01',time:'04:00'},
  {id:'h6',personId:'bernardi',action:'depart',service:'nuit2',date:'2026-08-02',time:'02:00'},
  {id:'h7',personId:'banti',action:'depart',service:'nuit2',date:'2026-08-02',time:'02:00'},
  {id:'h8',personId:'maccario',action:'depart',service:'nuit2',date:'2026-08-02',time:'02:00'},
  {id:'h9',personId:'gaza',action:'depart',service:'nuit2',date:'2026-08-02',time:'02:00'},
  {id:'h10',personId:'podgorny',action:'depart',service:'nuit2',date:'2026-08-02',time:'02:00'}
 ],undo:[]
});
let state=load();let pending=null;
function load(){try{const s=JSON.parse(localStorage.getItem(KEY));return s&&s.stayQueue?s:initialState()}catch{return initialState()}}
function save(){localStorage.setItem(KEY,JSON.stringify(state))}
function p(id){return PEOPLE.find(x=>x.id===id)}
function localISO(d=new Date()){const z=new Date(d.getTime()-d.getTimezoneOffset()*60000);return z.toISOString().slice(0,10)}
function dayInfo(date=new Date()){
 const start=new Date(CYCLE_START+'T00:00:00');const d=new Date(date);d.setHours(0,0,0,0);const days=Math.floor((d-start)/86400000);const idx=((days%6)+6)%6;
 return [{key:'nuit1',title:'Jour 1 · Première nuit'},{key:'nuit2',title:'Jour 2 · Deuxième nuit'},{key:'coupure',title:'Jour 3 · Coupure'},{key:'apres',title:'Jour 4 · Après-midi'},{key:'repos',title:'Jour 5 · Repos'},{key:'repos',title:'Jour 6 · Repos'}][idx]
}
function render(){
 const now=new Date();document.getElementById('nowLabel').textContent=now.toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long',year:'numeric'})+' · '+now.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'});
 document.getElementById('workDate').textContent=now.toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long',year:'numeric'});const info=dayInfo(now);document.getElementById('workType').textContent=info.title;
 renderActions(info.key);renderQueues();renderJournal();renderTeam();document.querySelectorAll('.undo').forEach(b=>b.disabled=!state.undo.length)
}
function renderActions(service){const root=document.getElementById('serviceActions');
 if(service==='repos'){root.innerHTML='<div class="empty">Aucune saisie prévue pendant le repos.</div>';return}
 if(service==='apres'){
  const id=state.fifthQueue[0];root.innerHTML=`<div class="person"><div class="person-top"><div><div class="rank">5ème prévu</div><div class="name">${p(id).name}</div></div></div><div class="buttons one"><button class="action fifth" onclick="openAction('${id}','fifth','apres')">Parti</button></div></div>`;return
 }
 root.innerHTML='<div class="people-grid">'+PEOPLE.map(person=>{
  const bs=service==='coupure'?`<button class="action return" onclick="openAction('${person.id}','return','coupure')">Retour</button><button class="action stay" onclick="openAction('${person.id}','stay','coupure')">Resté</button>`:`<button class="action depart" onclick="openAction('${person.id}','depart','${service}')">Parti</button><button class="action stay" onclick="openAction('${person.id}','stay','${service}')">Resté</button>`;
  return `<div class="person"><div class="person-top"><div class="name">${person.name}</div></div><div class="buttons">${bs}</div></div>`}).join('')+'</div>'
}
function queueHTML(title,note,arr){return `<div class="rotation-block"><div class="rotation-title">${title}</div><div class="rotation-note">${note}</div><ol class="queue">${arr.map((id,i)=>`<li>${p(id).name}${i===0?'<span class="next-badge">PROCHAIN</span>':''}</li>`).join('')}</ol></div>`}
function renderQueues(){document.getElementById('rotationQueues').innerHTML=queueHTML('Nuits + Resté en coupure','Ordre des prochaines personnes à rester',state.stayQueue)+queueHTML('Coupure','Ordre prioritaire des retours',state.returnQueue)+queueHTML('5ème','Ordre de départ de l’après-midi',state.fifthQueue)}
function serviceName(s){return {nuit1:'Première nuit',nuit2:'Deuxième nuit',coupure:'Coupure',apres:'Après-midi'}[s]||s}
function actionName(a){return {depart:'Parti',stay:'Resté',return:'Retour',fifth:'Parti — 5ème'}[a]}
function tagClass(a){return a==='stay'?'tag-stay':a==='return'?'tag-return':a==='fifth'?'tag-fifth':'tag-depart'}
function renderJournal(){const root=document.getElementById('journal');if(!state.history.length){root.innerHTML='<div class="empty">Aucune décision enregistrée.</div>';return}
 root.innerHTML=[...state.history].reverse().map(h=>`<div class="journal-item"><div class="journal-main"><strong>${p(h.personId)?.name||'Personne inconnue'}</strong><span class="tag ${tagClass(h.action)}">${actionName(h.action)}</span></div><div class="journal-meta">${new Date(h.date+'T12:00:00').toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long',year:'numeric'})} · ${h.time} · ${serviceName(h.service)}</div></div>`).join('')}
function renderTeam(){document.getElementById('team').innerHTML=PEOPLE.map(x=>`<div class="team-row">${x.name}</div>`).join('')}
function openAction(personId,action,service){pending={personId,action,service};document.getElementById('modalTitle').textContent=`${actionName(action)} — ${p(personId).name}`;document.getElementById('modalText').textContent='L’heure ne sera jamais prise automatiquement.';document.getElementById('eventDate').value=localISO();document.getElementById('eventTime').value='';document.getElementById('timeModal').classList.add('open');setTimeout(()=>document.getElementById('eventTime').focus(),150)}
function closeModal(){document.getElementById('timeModal').classList.remove('open');pending=null}
function moveToEnd(arr,id){return arr.filter(x=>x!==id).concat(id)}
function confirmAction(){if(!pending)return;const date=document.getElementById('eventDate').value;const time=document.getElementById('eventTime').value;if(!date||!time){alert('Entre la date et l’heure avant d’enregistrer.');return}
 state.undo.push(JSON.stringify({stayQueue:state.stayQueue,returnQueue:state.returnQueue,fifthQueue:state.fifthQueue,history:state.history}));if(state.undo.length>30)state.undo.shift();
 if(pending.action==='stay')state.stayQueue=moveToEnd(state.stayQueue,pending.personId);if(pending.action==='return')state.returnQueue=moveToEnd(state.returnQueue,pending.personId);if(pending.action==='fifth')state.fifthQueue=moveToEnd(state.fifthQueue,pending.personId);
 state.history.push({id:'h'+Date.now(),...pending,date,time});save();closeModal();render()}
function undoLast(){if(!state.undo.length){alert('Aucune action à annuler.');return}if(!confirm('Annuler la dernière action enregistrée ?'))return;const previous=JSON.parse(state.undo.pop());const remaining=state.undo;state={...state,...previous,undo:remaining};save();render()}
function showView(name,btn){document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));document.getElementById(name+'View').classList.add('active');document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));btn.classList.add('active')}
function resetToCorrectState(){if(!confirm('Réinitialiser toutes les données et revenir à la situation correcte du 3 août 2026 ?'))return;state=initialState();save();render();showView('today',document.querySelector('.tab'))}
document.getElementById('timeModal').addEventListener('click',e=>{if(e.target.id==='timeModal')closeModal()});render();
