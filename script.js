const DEFAULT_PEOPLE=[
 {id:'bernardi',name:'Bernardi Jeremy',active:true},
 {id:'banti',name:'Banti Hervé',active:true},
 {id:'maccario',name:'Maccario Sebastien',active:true},
 {id:'gaza',name:'Gaza Sébastien',active:true},
 {id:'podgorny',name:'Podgorny Boris',active:true}
];
const CYCLE_START='2026-08-01';
const KEY='rotationEquipe21';
const initialState=()=>({
 team:DEFAULT_PEOPLE.map(person=>({...person})),
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
let state=load();
let PEOPLE=state.team;
let pending=null;
let editingQueueKey=null;
let editingQueue=[];
let teamDraft=[];
let editingEventId=null;
let selectedCalendarDate=new Date();
let calendarMonthDate=new Date(selectedCalendarDate.getFullYear(),selectedCalendarDate.getMonth(),1);

function load(){
 try{
  const saved=JSON.parse(localStorage.getItem(KEY));
  if(!saved||!saved.stayQueue)return initialState();
  if(!Array.isArray(saved.team)){
   saved.team=DEFAULT_PEOPLE.map(person=>({...person}));
  }else{
   saved.team=saved.team.map(person=>({...person,active:person.active!==false}));
  }
  if(!Array.isArray(saved.undo))saved.undo=[];
  return saved;
 }catch{return initialState()}
}
function save(){localStorage.setItem(KEY,JSON.stringify(state))}
function p(id){return PEOPLE.find(x=>x.id===id)}
function activePeople(){return PEOPLE.filter(person=>person.active!==false)}
function localISO(d=new Date()){const z=new Date(d.getTime()-d.getTimezoneOffset()*60000);return z.toISOString().slice(0,10)}
function dayInfo(date=new Date()){
 const start=new Date(CYCLE_START+'T00:00:00');const d=new Date(date);d.setHours(0,0,0,0);const days=Math.floor((d-start)/86400000);const idx=((days%6)+6)%6;
 return [{key:'nuit1',title:'Jour 1 · Première nuit'},{key:'nuit2',title:'Jour 2 · Deuxième nuit'},{key:'coupure',title:'Jour 3 · Coupure'},{key:'apres',title:'Jour 4 · Après-midi'},{key:'repos',title:'Jour 5 · Repos'},{key:'repos',title:'Jour 6 · Repos'}][idx]
}
function snapshot(){
 return JSON.stringify({
  team:state.team.map(person=>({...person})),
  stayQueue:[...state.stayQueue],
  returnQueue:[...state.returnQueue],
  fifthQueue:[...state.fifthQueue],
  history:[...state.history]
 });
}
function pushUndo(){
 state.undo.push(snapshot());
 if(state.undo.length>30)state.undo.shift();
}
function render(){
 const now=new Date();
 document.getElementById('nowLabel').textContent=now.toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long',year:'numeric'})+' · '+now.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'});
 document.getElementById('workDate').textContent=now.toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
 const info=dayInfo(now);
 document.getElementById('workType').textContent=info.title;
 renderActions(info.key);
 renderTodayRotationCards();
 renderQueues();
 renderJournal();
 renderTeam();
 renderCalendar();
 document.querySelectorAll('.undo').forEach(b=>b.disabled=!state.undo.length);
}
function renderActions(service){
 const root=document.getElementById('serviceActions');
 if(service==='repos'){root.innerHTML='<div class="empty">Aucune saisie prévue pendant le repos.</div>';return}
 if(service==='apres'){
  const id=state.fifthQueue[0];
  root.innerHTML=`<div class="person"><div class="person-top"><div><div class="rank">5ème prévu</div><div class="name">${p(id).name}</div></div></div><div class="buttons one"><button class="action fifth" onclick="openAction('${id}','fifth','apres')">Parti</button></div></div>`;
  return;
 }
 root.innerHTML='<div class="people-grid">'+activePeople().map(person=>{
  const bs=service==='coupure'
   ?`<button class="action depart" onclick="openAction('${person.id}','depart','coupure')">Parti</button><button class="action return" onclick="openAction('${person.id}','return','coupure')">Retour</button><button class="action stay" onclick="openAction('${person.id}','stay','coupure')">Resté</button>`
   :`<button class="action depart" onclick="openAction('${person.id}','depart','${service}')">Parti</button><button class="action stay" onclick="openAction('${person.id}','stay','${service}')">Resté</button>`;
  return `<div class="person"><div class="person-top"><div class="name">${person.name}</div></div><div class="buttons">${bs}</div></div>`;
 }).join('')+'</div>';
}
function queueHTML(key,title,note,arr){
 return `<button type="button" class="rotation-block rotation-clickable" onclick="openRotationEditor('${key}')" aria-label="Modifier le roulement ${title}">
   <div class="rotation-top"><div><div class="rotation-title">${title}</div><div class="rotation-note">${note}</div></div><span class="edit-badge">✏️ Modifier</span></div>
   <ol class="queue">${arr.map((id,i)=>`<li>${p(id).name}${i===0?'<span class="next-badge">PROCHAIN</span>':''}</li>`).join('')}</ol>
 </button>`;
}
function todayRotationCard(key,title,note,arr){
 const nextPerson=p(arr[0]);
 return `<button type="button" class="today-rotation-card" onclick="openRotationEditor('${key}')" aria-label="Modifier le roulement ${title}">
   <div class="today-card-top">
     <div class="today-card-title">${title}</div>
     <span class="today-edit-icon">✏️ Modifier</span>
   </div>
   <div class="today-card-note">${note}</div>
   <div class="today-card-name">${nextPerson ? nextPerson.name : 'Non défini'}</div>
 </button>`;
}
function renderTodayRotationCards(){
 const root=document.getElementById('todayRotationCards');
 if(!root)return;
 root.innerHTML=
  todayRotationCard('stayQueue','Nuits','Prochain à rester',state.stayQueue)+
  todayRotationCard('returnQueue','Coupure','Prochain retour',state.returnQueue)+
  todayRotationCard('fifthQueue','5ème','Prochain 5ème',state.fifthQueue);
}
function renderQueues(){
 document.getElementById('rotationQueues').innerHTML=
  queueHTML('stayQueue','Nuits','Ordre des prochaines personnes à rester',state.stayQueue)+
  queueHTML('returnQueue','Coupure','Ordre prioritaire des retours',state.returnQueue)+
  queueHTML('fifthQueue','5ème','Ordre de départ de l’après-midi',state.fifthQueue);
}
function serviceName(s){return {nuit1:'Première nuit',nuit2:'Deuxième nuit',coupure:'Coupure',apres:'Après-midi'}[s]||s}
function actionName(a){return {depart:'Parti',stay:'Resté',return:'Retour',fifth:'Parti — 5ème'}[a]}
function tagClass(a){return a==='stay'?'tag-stay':a==='return'?'tag-return':a==='fifth'?'tag-fifth':'tag-depart'}
function journalActionIcon(action){
 return {depart:'↗',stay:'●',return:'↩',fifth:'⑤'}[action]||'•';
}
function renderJournal(){
 const root=document.getElementById('journal');
 if(!state.history.length){
  root.innerHTML='<div class="empty">Aucune décision enregistrée.</div>';
  return;
 }

 const ids=[...new Set(state.history.map(h=>h.personId))];

 const groups=ids.map(personId=>{
  const person=p(personId);
  const events=state.history
   .filter(h=>h.personId===personId)
   .sort((a,b)=>{
    const ta=`${a.date}T${a.time||'00:00'}:00`;
    const tb=`${b.date}T${b.time||'00:00'}:00`;
    const c=ta.localeCompare(tb);
    return c!==0 ? c : String(a.id).localeCompare(String(b.id));
   });

  return {
   name:person?.name||'Personne inconnue',
   events
  };
 }).sort((a,b)=>a.name.localeCompare(b.name,'fr',{sensitivity:'base'}));

 root.innerHTML=groups.map(group=>`
  <section class="journal-person">
   <div class="journal-person-header">
    <div class="journal-person-avatar">${group.name.charAt(0).toUpperCase()}</div>
    <div>
     <div class="journal-person-name">${group.name}</div>
     <div class="journal-person-count">${group.events.length} événement${group.events.length>1?'s':''}</div>
    </div>
   </div>
   <div class="journal-person-events">
    ${group.events.map(h=>`
     <div class="journal-event journal-event-${h.action}">
      <div class="journal-event-icon ${tagClass(h.action)}">${journalActionIcon(h.action)}</div>
      <div class="journal-event-content">
       <div class="journal-event-top">
        <strong>${new Date(h.date+'T12:00:00').toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit',year:'numeric'})}</strong>
        <span class="journal-time">${h.time}</span>
       </div>
       <div class="journal-event-bottom">
        <span class="tag ${tagClass(h.action)}">${actionName(h.action)}</span>
        <span class="journal-service">${serviceName(h.service)}</span>
       </div>
      </div>
     </div>`).join('')}
   </div>
  </section>`).join('');
}
function renderTeam(){
 const root=document.getElementById('team');
 const active=activePeople();
 root.innerHTML=active.length
  ? active.map((person,index)=>`<div class="team-row"><span class="team-number">${index+1}</span><span>${person.name}</span></div>`).join('')
  : '<div class="empty">Aucune personne dans l’équipe.</div>';
}

function makeTeamId(){
 return 'person_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,7);
}
function openTeamEditor(){
 teamDraft=activePeople().map(person=>({id:person.id,name:person.name,isNew:false}));
 renderTeamEditor();
 document.getElementById('team').style.display='none';
 document.getElementById('teamEditMain').style.display='none';
 document.getElementById('teamEditor').classList.add('open');
}
function renderTeamEditor(){
 const root=document.getElementById('teamEditor');
 root.innerHTML=`
  <div class="team-editor-list">
   ${teamDraft.map((person,index)=>`
    <div class="team-edit-row">
     <span class="team-edit-number">${index+1}</span>
     <input type="text" value="${person.name.replace(/"/g,'&quot;')}" oninput="updateTeamDraftName(${index},this.value)" aria-label="Nom de la personne ${index+1}">
     <button type="button" class="team-remove-btn" onclick="removeTeamDraft(${index})" ${teamDraft.length<=1?'disabled':''}>Retirer</button>
    </div>`).join('')}
  </div>
  <button type="button" class="team-add-btn" onclick="addTeamDraft()">＋ Ajouter une personne</button>
  <div class="team-editor-actions">
   <button type="button" class="cancel" onclick="cancelTeamEditor()">Annuler</button>
   <button type="button" class="save" onclick="saveTeamEditor()">Enregistrer l’équipe</button>
  </div>`;
}
function updateTeamDraftName(index,value){
 if(teamDraft[index])teamDraft[index].name=value;
}
function addTeamDraft(){
 teamDraft.push({id:makeTeamId(),name:'Nouvelle personne',isNew:true});
 renderTeamEditor();
 setTimeout(()=>{
  const inputs=document.querySelectorAll('#teamEditor input');
  const input=inputs[inputs.length-1];
  if(input){input.focus();input.select()}
 },50);
}
function removeTeamDraft(index){
 if(teamDraft.length<=1){
  alert('L’équipe doit contenir au moins une personne.');
  return;
 }
 teamDraft.splice(index,1);
 renderTeamEditor();
}
function cancelTeamEditor(){
 teamDraft=[];
 document.getElementById('teamEditor').classList.remove('open');
 document.getElementById('teamEditor').innerHTML='';
 document.getElementById('team').style.display='';
 document.getElementById('teamEditMain').style.display='';
}
function saveTeamEditor(){
 const cleaned=teamDraft.map(person=>({...person,name:person.name.trim()}));
 if(cleaned.some(person=>!person.name)){
  alert('Chaque personne doit avoir un nom.');
  return;
 }
 const normalized=cleaned.map(person=>person.name.toLocaleLowerCase('fr-FR'));
 if(new Set(normalized).size!==normalized.length){
  alert('Deux personnes ne peuvent pas avoir exactement le même nom.');
  return;
 }

 pushUndo();
 const keptIds=new Set(cleaned.map(person=>person.id));
 const oldIds=new Set(activePeople().map(person=>person.id));

 state.team=state.team.map(person=>{
  const draft=cleaned.find(item=>item.id===person.id);
  if(draft)return {...person,name:draft.name,active:true};
  if(person.active!==false)return {...person,active:false};
  return person;
 });

 cleaned.filter(person=>!state.team.some(existing=>existing.id===person.id))
  .forEach(person=>state.team.push({id:person.id,name:person.name,active:true}));

 const addedIds=cleaned.filter(person=>!oldIds.has(person.id)).map(person=>person.id);
 state.stayQueue=state.stayQueue.filter(id=>keptIds.has(id)).concat(addedIds);
 state.returnQueue=state.returnQueue.filter(id=>keptIds.has(id)).concat(addedIds);
 state.fifthQueue=state.fifthQueue.filter(id=>keptIds.has(id)).concat(addedIds);

 PEOPLE=state.team;
 save();
 cancelTeamEditor();
 render();
}

function openAction(personId,action,service,dateValue=localISO()){
 pending={personId,action,service,editId:null};
 document.getElementById('modalTitle').textContent=`${actionName(action)} — ${p(personId).name}`;
 document.getElementById('modalText').textContent='L’heure est saisie manuellement.';
 document.getElementById('eventDate').value=dateValue;
 document.getElementById('eventTime').value='';
 document.getElementById('timeModal').classList.add('open');
 setTimeout(()=>document.getElementById('eventTime').focus(),150);
}
function allowedActionsForService(service){
 if(service==='coupure')return [
  {value:'depart',label:'Parti'},
  {value:'return',label:'Retour'},
  {value:'stay',label:'Resté'}
 ];
 if(service==='apres')return [{value:'fifth',label:'Parti — 5ème'}];
 return [
  {value:'depart',label:'Parti'},
  {value:'stay',label:'Resté'}
 ];
}
function editCalendarEvent(eventId){
 const event=state.history.find(h=>h.id===eventId);
 if(!event)return;
 editingEventId=eventId;

 const personSelect=document.getElementById('editEventPerson');
 personSelect.innerHTML=activePeople().map(person=>
  `<option value="${person.id}" ${person.id===event.personId?'selected':''}>${person.name}</option>`
 ).join('');

 const actionSelect=document.getElementById('editEventAction');
 actionSelect.innerHTML=allowedActionsForService(event.service).map(action=>
  `<option value="${action.value}" ${action.value===event.action?'selected':''}>${action.label}</option>`
 ).join('');

 document.getElementById('editEventDate').value=event.date;
 document.getElementById('editEventTime').value=event.time;
 document.getElementById('eventEditModal').classList.add('open');
}
function closeEventEditModal(){
 document.getElementById('eventEditModal').classList.remove('open');
 editingEventId=null;
}
function saveEditedEvent(){
 if(!editingEventId)return;
 const index=state.history.findIndex(h=>h.id===editingEventId);
 if(index<0)return;

 const personId=document.getElementById('editEventPerson').value;
 const action=document.getElementById('editEventAction').value;
 const date=document.getElementById('editEventDate').value;
 const time=document.getElementById('editEventTime').value;

 if(!personId||!action||!date||!time){
  alert('Renseigne la personne, l’action, la date et l’heure.');
  return;
 }
 pushUndo();
 state.history[index]={...state.history[index],personId,action,date,time};
 save();
 closeEventEditModal();
 render();
}
function deleteEditedEvent(){
 if(!editingEventId)return;
 const event=state.history.find(h=>h.id===editingEventId);
 if(!event)return;
 const personName=p(event.personId)?.name||'cette personne';
 if(!confirm(`Supprimer définitivement l’événement "${actionName(event.action)}" de ${personName} ?`))return;
 pushUndo();
 state.history=state.history.filter(h=>h.id!==editingEventId);
 save();
 closeEventEditModal();
 render();
}
function closeModal(){document.getElementById('timeModal').classList.remove('open');pending=null}
function moveToEnd(arr,id){return arr.filter(x=>x!==id).concat(id)}
function confirmAction(){
 if(!pending)return;
 const date=document.getElementById('eventDate').value;
 const time=document.getElementById('eventTime').value;
 if(!date||!time){alert('Entre la date et l’heure avant d’enregistrer.');return}
 pushUndo();

 if(pending.editId){
  const index=state.history.findIndex(h=>h.id===pending.editId);
  if(index>=0){
   state.history[index]={...state.history[index],date,time};
  }
 }else{
  if(pending.action==='stay')state.stayQueue=moveToEnd(state.stayQueue,pending.personId);
  if(pending.action==='return')state.returnQueue=moveToEnd(state.returnQueue,pending.personId);
  if(pending.action==='fifth')state.fifthQueue=moveToEnd(state.fifthQueue,pending.personId);
  const {editId,...eventData}=pending;
  state.history.push({id:'h'+Date.now(),...eventData,date,time});
 }
 save();closeModal();render();
}
function queueLabel(key){
 return {stayQueue:'Nuits',returnQueue:'Coupure',fifthQueue:'5ème'}[key]||'Roulement';
}
function openRotationEditor(key){
 if(!['stayQueue','returnQueue','fifthQueue'].includes(key))return;
 editingQueueKey=key;
 editingQueue=[...state[key]];
 document.getElementById('rotationModalTitle').textContent='Modifier le roulement — '+queueLabel(key);
 renderRotationEditor();
 document.getElementById('rotationModal').classList.add('open');
}
function renderRotationEditor(){
 const root=document.getElementById('rotationEditor');
 root.innerHTML=editingQueue.map((id,index)=>`
  <div class="editor-row">
   <div class="editor-position">${index+1}</div>
   <div class="editor-name">${p(id).name}${index===0?'<span class="editor-next">Prochain</span>':''}</div>
   <div class="editor-controls">
    <button type="button" class="move-btn" onclick="moveEditorItem(${index},-1)" ${index===0?'disabled':''} aria-label="Monter">↑</button>
    <button type="button" class="move-btn" onclick="moveEditorItem(${index},1)" ${index===editingQueue.length-1?'disabled':''} aria-label="Descendre">↓</button>
   </div>
  </div>`).join('');
}
function moveEditorItem(index,direction){
 const target=index+direction;
 if(target<0||target>=editingQueue.length)return;
 [editingQueue[index],editingQueue[target]]=[editingQueue[target],editingQueue[index]];
 renderRotationEditor();
}
function closeRotationEditor(){
 document.getElementById('rotationModal').classList.remove('open');
 editingQueueKey=null;
 editingQueue=[];
}
function saveRotationEditor(){
 if(!editingQueueKey)return;
 const original=state[editingQueueKey];
 if(JSON.stringify(original)!==JSON.stringify(editingQueue)){
  pushUndo();
  state[editingQueueKey]=[...editingQueue];
  save();
 }
 closeRotationEditor();
 render();
}
function undoLast(){
 if(!state.undo.length){alert('Aucune action à annuler.');return}
 if(!confirm('Annuler la dernière action ou modification de roulement ?'))return;
 const previous=JSON.parse(state.undo.pop());
 const remaining=state.undo;
 state={...state,...previous,undo:remaining};
 PEOPLE=state.team;
 save();render();
}

function formatISODate(date){
 const d=new Date(date);
 const z=new Date(d.getTime()-d.getTimezoneOffset()*60000);
 return z.toISOString().slice(0,10);
}
function sameCalendarDate(a,b){return formatISODate(a)===formatISODate(b)}
function eventsForDate(date){
 const iso=formatISODate(date);
 return state.history.filter(h=>h.date===iso);
}
function renderCalendar(){
 const grid=document.getElementById('calendarGrid');
 if(!grid)return;
 document.getElementById('calendarMonthTitle').textContent=
  calendarMonthDate.toLocaleDateString('fr-FR',{month:'long',year:'numeric'}).replace(/^./,c=>c.toUpperCase());

 const year=calendarMonthDate.getFullYear();
 const month=calendarMonthDate.getMonth();
 const first=new Date(year,month,1);
 const last=new Date(year,month+1,0);
 const offset=(first.getDay()+6)%7;
 const cellCount=Math.ceil((offset+last.getDate())/7)*7;

 let output='';
 for(let i=0;i<cellCount;i++){
  const day=i-offset+1;
  if(day<1||day>last.getDate()){
   output+='<div class="calendar-day calendar-empty"></div>';
   continue;
  }
  const date=new Date(year,month,day,12,0,0);
  const info=dayInfo(date);
  const events=eventsForDate(date);
  const classes=['calendar-day'];
  if(sameCalendarDate(date,new Date()))classes.push('is-today');
  if(sameCalendarDate(date,selectedCalendarDate))classes.push('is-selected');
  if(events.length)classes.push('has-events');

  output+=`<button type="button" class="${classes.join(' ')}" onclick="selectCalendarDate('${formatISODate(date)}')">
    <span class="calendar-number">${day}</span>
    <span class="calendar-service">${info.title.replace(/^Jour \d+ · /,'')}</span>
    ${events.length?`<span class="event-count">${events.length}</span>`:''}
  </button>`;
 }
 grid.innerHTML=output;
 renderSelectedDay();
}

function calendarActionButtons(info){
 const iso=formatISODate(selectedCalendarDate);
 if(info.key==='repos'){
  return '<div class="empty">Aucun service prévu ce jour-là.</div>';
 }
 if(info.key==='apres'){
  return '<div class="calendar-action-grid">'+activePeople().map(person=>`
   <div class="calendar-person-action">
    <strong>${person.name}</strong>
    <button type="button" class="calendar-action-btn fifth" onclick="openAction('${person.id}','fifth','apres','${iso}')">Parti — 5ème</button>
   </div>`).join('')+'</div>';
 }
 const buttons=info.key==='coupure'
  ? person=>`<button type="button" class="calendar-action-btn depart" onclick="openAction('${person.id}','depart','coupure','${iso}')">Parti</button>
              <button type="button" class="calendar-action-btn return" onclick="openAction('${person.id}','return','coupure','${iso}')">Retour</button>
              <button type="button" class="calendar-action-btn stay" onclick="openAction('${person.id}','stay','coupure','${iso}')">Resté</button>`
  : person=>`<button type="button" class="calendar-action-btn depart" onclick="openAction('${person.id}','depart','${info.key}','${iso}')">Parti</button>
              <button type="button" class="calendar-action-btn stay" onclick="openAction('${person.id}','stay','${info.key}','${iso}')">Resté</button>`;

 return '<div class="calendar-action-grid">'+activePeople().map(person=>`
  <div class="calendar-person-action">
   <strong>${person.name}</strong>
   <div class="calendar-action-buttons">${buttons(person)}</div>
  </div>`).join('')+'</div>';
}
function toggleCalendarEventEditor(){
 const editor=document.getElementById('calendarEventEditor');
 if(!editor)return;
 editor.classList.toggle('open');
 const btn=document.getElementById('calendarEditToggle');
 if(btn)btn.textContent=editor.classList.contains('open')?'Fermer la modification':'Ajouter un événement';
}

function renderSelectedDay(){
 const date=new Date(selectedCalendarDate);
 const info=dayInfo(date);
 const events=eventsForDate(date);

 document.getElementById('selectedDateTitle').textContent=
  date.toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
 document.getElementById('selectedDateService').textContent=info.title;

 const details=document.getElementById('selectedDayDetails');

 let mainContent='';
 if(events.length){
  mainContent='<div class="calendar-detail-title">Événements enregistrés</div>'+
   events.map(h=>`<div class="calendar-event editable-event">
     <div>
       <strong>${p(h.personId)?.name||'Personne inconnue'}</strong>
       <div class="calendar-event-meta">${actionName(h.action)} · ${h.time}</div>
     </div>
     <button type="button" class="event-edit-btn" onclick="editCalendarEvent('${h.id}')">Modifier</button>
   </div>`).join('');
 }else if(formatISODate(date)<formatISODate(new Date())){
  mainContent='<div class="empty">Aucun événement enregistré pour cette date.</div>';
 }else{
  let forecast='';
  if(info.key==='nuit1'||info.key==='nuit2'){
   forecast=`<div class="forecast-card"><div class="forecast-label">Prochain à rester</div><div class="forecast-name">${p(state.stayQueue[0]).name}</div></div>`;
  }else if(info.key==='coupure'){
   forecast=`<div class="forecast-card"><div class="forecast-label">Prochain retour</div><div class="forecast-name">${p(state.returnQueue[0]).name}</div></div>
   <div class="forecast-card"><div class="forecast-label">Prochain à rester</div><div class="forecast-name">${p(state.stayQueue[0]).name}</div></div>`;
  }else if(info.key==='apres'){
   forecast=`<div class="forecast-card"><div class="forecast-label">Prochain 5ème</div><div class="forecast-name">${p(state.fifthQueue[0]).name}</div></div>`;
  }else{
   forecast='<div class="empty">Jour de repos prévu.</div>';
  }
  mainContent='<div class="calendar-detail-title">Prévision</div>'+forecast+
   '<div class="forecast-note">La consultation du calendrier ne modifie pas les roulements.</div>';
 }

 details.innerHTML=mainContent+
  `<button type="button" class="calendar-edit-toggle" id="calendarEditToggle" onclick="toggleCalendarEventEditor()">Ajouter un événement</button>
   <div class="calendar-event-editor" id="calendarEventEditor">
     <div class="calendar-detail-title">Saisir un événement pour cette date</div>
     ${calendarActionButtons(info)}
   </div>`;
}
function selectCalendarDate(iso){
 selectedCalendarDate=new Date(iso+'T12:00:00');
 calendarMonthDate=new Date(selectedCalendarDate.getFullYear(),selectedCalendarDate.getMonth(),1);
 renderCalendar();
}
function changeCalendarMonth(delta){
 calendarMonthDate=new Date(calendarMonthDate.getFullYear(),calendarMonthDate.getMonth()+delta,1);
 renderCalendar();
}
function changeSelectedDay(delta){
 selectedCalendarDate=new Date(
  selectedCalendarDate.getFullYear(),
  selectedCalendarDate.getMonth(),
  selectedCalendarDate.getDate()+delta,
  12,0,0
 );
 calendarMonthDate=new Date(selectedCalendarDate.getFullYear(),selectedCalendarDate.getMonth(),1);
 renderCalendar();
}
function selectToday(){
 selectedCalendarDate=new Date();
 calendarMonthDate=new Date(selectedCalendarDate.getFullYear(),selectedCalendarDate.getMonth(),1);
 renderCalendar();
}

function showView(name,btn){
 document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
 document.getElementById(name+'View').classList.add('active');
 document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
 btn.classList.add('active');
 if(name==='calendar')renderCalendar();
}
function resetToCorrectState(){
 if(!confirm('Réinitialiser toutes les données et revenir à la situation correcte du 3 août 2026 ?'))return;
 state=initialState();PEOPLE=state.team;save();render();showView('today',document.querySelector('.tab'));
}
document.getElementById('timeModal').addEventListener('click',e=>{if(e.target.id==='timeModal')closeModal()});
document.getElementById('rotationModal').addEventListener('click',e=>{if(e.target.id==='rotationModal')closeRotationEditor()});
document.getElementById('eventEditModal').addEventListener('click',e=>{if(e.target.id==='eventEditModal')closeEventEditModal()});
render();
