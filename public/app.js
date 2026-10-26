const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const money = value => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(value || 0));
const todayISO = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0,10); };
const addDays = (date, days) => { const d = new Date(`${date}T12:00:00`); d.setDate(d.getDate() + days); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const STORAGE_KEY = 'nomadStayHotelDemoV1';
let mode = 'demo';
let currentTab = 'reservations';
let rooms = [], reservations = [], guests = [], staff = [], billing = [];
let nextReservationId = 20, nextGuestId = 10, nextBillId = 20;

const seed = {
  rooms: [
    {Room_ID:1,Room_Number:'101',Room_Type:'Single',Rate_Per_Night:3200,Floor:1,Status:'Available',Description:'A calm, thoughtfully designed room for solo stays.',Image_URL:'https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=900&q=85',Capacity:1},
    {Room_ID:2,Room_Number:'102',Room_Type:'Double',Rate_Per_Night:4800,Floor:1,Status:'Available',Description:'A warm, spacious room for a comfortable city escape.',Image_URL:'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=900&q=85',Capacity:2},
    {Room_ID:3,Room_Number:'201',Room_Type:'Deluxe',Rate_Per_Night:7200,Floor:2,Status:'Available',Description:'Soft linens, natural textures and a little extra room.',Image_URL:'https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=900&q=85',Capacity:2},
    {Room_ID:4,Room_Number:'202',Room_Type:'Deluxe',Rate_Per_Night:7600,Floor:2,Status:'Available',Description:'A light-filled retreat with a lounge corner.',Image_URL:'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=900&q=85',Capacity:3},
    {Room_ID:5,Room_Number:'301',Room_Type:'Suite',Rate_Per_Night:12500,Floor:3,Status:'Available',Description:'An elevated suite with a separate living area.',Image_URL:'https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&w=900&q=85',Capacity:4},
    {Room_ID:6,Room_Number:'302',Room_Type:'Suite',Rate_Per_Night:14800,Floor:3,Status:'Maintenance',Description:'Signature suite, currently being prepared for guests.',Image_URL:'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=900&q=85',Capacity:4}
  ],
  guests: [
    {Guest_ID:1,Guest_Name:'Aarav Mehta',Email:'aarav.mehta@example.com',Phone:'9876501234',Address:'Jaipur',Reservation_Count:1},
    {Guest_ID:2,Guest_Name:'Mira Kapoor',Email:'mira.kapoor@example.com',Phone:'9876505678',Address:'Delhi',Reservation_Count:1},
    {Guest_ID:3,Guest_Name:'Kabir Rao',Email:'kabir.rao@example.com',Phone:'9876512345',Address:'Udaipur',Reservation_Count:1}
  ],
  staff: [
    {Staff_ID:1,Staff_Name:'Riya Sharma',Designation:'Front Desk Manager',Shift:'Morning',Salary:42000},
    {Staff_ID:2,Staff_Name:'Arjun Singh',Designation:'Guest Relations',Shift:'Evening',Salary:35000},
    {Staff_ID:3,Staff_Name:'Neha Verma',Designation:'Reservations Executive',Shift:'Night',Salary:33000}
  ],
  reservations: [
    {Reservation_ID:1,Room_ID:2,Guest_ID:1,Staff_ID:1,Check_In_Date:'2027-01-14',Check_Out_Date:'2027-01-17',Num_Guests:2,Status:'Booked'},
    {Reservation_ID:2,Room_ID:4,Guest_ID:2,Staff_ID:2,Check_In_Date:'2027-02-05',Check_Out_Date:'2027-02-08',Num_Guests:2,Status:'Booked'},
    {Reservation_ID:3,Room_ID:1,Guest_ID:3,Staff_ID:3,Check_In_Date:'2027-01-03',Check_Out_Date:'2027-01-05',Num_Guests:1,Status:'Checked-Out'}
  ],
  billing: [
    {Bill_ID:1,Reservation_ID:1,Service_Description:'Room service',Amount:850,Billing_Date:'2027-01-15',Payment_Status:'Pending'},
    {Bill_ID:2,Reservation_ID:1,Service_Description:'Laundry',Amount:450,Billing_Date:'2027-01-16',Payment_Status:'Pending'},
    {Bill_ID:3,Reservation_ID:2,Service_Description:'Welcome dining',Amount:1200,Billing_Date:'2027-02-05',Payment_Status:'Paid'},
    {Bill_ID:4,Reservation_ID:3,Service_Description:'Room charges',Amount:6400,Billing_Date:'2027-01-05',Payment_Status:'Paid'}
  ]
};
function loadDemo(){
  try { const saved = localStorage.getItem(STORAGE_KEY); if(saved){ const parsed=JSON.parse(saved); if(parsed.rooms&&parsed.reservations){Object.assign(seed, parsed);} } } catch(_e) {}
  rooms = structuredClone(seed.rooms); guests = structuredClone(seed.guests); staff = structuredClone(seed.staff); reservations = structuredClone(seed.reservations); billing = structuredClone(seed.billing);
  nextReservationId = Math.max(19,...reservations.map(x=>Number(x.Reservation_ID)||0))+1;
  nextGuestId = Math.max(9,...guests.map(x=>Number(x.Guest_ID)||0))+1;
  nextBillId = Math.max(19,...billing.map(x=>Number(x.Bill_ID)||0))+1;
}
function saveDemo(){ try{ localStorage.setItem(STORAGE_KEY, JSON.stringify({rooms,guests,staff,reservations,billing})); }catch(_e){} }
async function api(path, options={}){
  const response = await fetch(path, {headers:{'Content-Type':'application/json',...(options.headers||{})},...options});
  const data = await response.json().catch(()=>({}));
  if(!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data;
}
async function initData(){
  loadDemo();
  try{
    const health = await api('/api/health');
    if(health.database === 'connected'){
      const [r,g,s,b,rs,d] = await Promise.all([api('/api/rooms'),api('/api/guests'),api('/api/staff'),api('/api/billing'),api('/api/reservations'),api('/api/dashboard')]);
      rooms=r; guests=g; staff=s; billing=b; reservations=rs; mode='live'; renderMetrics(d);
      $('#modePill').className='mode-pill live'; $('#modePill').innerHTML='<span class="mode-dot"></span> MYSQL CONNECTED';
    } else { throw new Error('Database not connected'); }
  }catch(_e){
    mode='demo'; $('#modePill').className='mode-pill demo'; $('#modePill').innerHTML='<span class="mode-dot"></span> DEMO MODE · BROWSER STORAGE';
    renderMetrics();
  }
  renderRooms(); renderTable(); fillSelects();
}
function isRoomAvailable(room, checkIn, checkOut){
  if(room.Status==='Maintenance') return false;
  if(!checkIn||!checkOut) return room.Status!=='Occupied';
  const overlaps = reservations.some(r=>Number(r.Room_ID)===Number(room.Room_ID)&&['Booked','Checked-In'].includes(r.Status)&&r.Check_In_Date<checkOut&&r.Check_Out_Date>checkIn);
  return !overlaps;
}
function renderRooms(list=rooms){
  const type=$('#searchType')?.value||'All';
  const checkIn=$('#searchCheckIn')?.value||''; const checkOut=$('#searchCheckOut')?.value||'';
  const shown=list.filter(room=>(type==='All'||room.Room_Type===type) && (checkIn&&checkOut ? isRoomAvailable(room,checkIn,checkOut) : room.Status!=='Maintenance'));
  $('#roomGrid').innerHTML = shown.length ? shown.map(room=>`<article class="room-card"><div class="room-image-wrap"><img class="room-image" src="${escapeHTML(room.Image_URL||'https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=900&q=85')}" alt="${escapeHTML(room.Room_Type)} room ${escapeHTML(room.Room_Number)}" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=900&q=85'"><span class="room-tag">${escapeHTML(room.Room_Type.toUpperCase())} ROOM</span></div><div class="room-body"><div class="room-title-line"><h3>${escapeHTML(room.Room_Type)} Room</h3><span class="room-capacity">♧ Up to ${Number(room.Capacity||2)} guests</span></div><p class="room-description">${escapeHTML(room.Description||'A considered, comfortable space for your stay.')}</p><div class="room-footer"><span class="room-price">${money(room.Rate_Per_Night)} <small>/ night</small></span><button class="room-book" data-book-room="${room.Room_ID}">RESERVE ↗</button></div></div></article>`).join('') : '<div class="empty-state">No rooms match these dates and filters. Try another room type or date range.</div>';
  $$('.room-book').forEach(btn=>btn.addEventListener('click',()=>openBooking(btn.dataset.bookRoom)));
}
function roomFor(id){return rooms.find(r=>Number(r.Room_ID)===Number(id))||{Room_Number:'—',Room_Type:'Room',Rate_Per_Night:0};}
function guestFor(id){return guests.find(g=>Number(g.Guest_ID)===Number(id))||{Guest_Name:'Guest',Email:'',Phone:''};}
function staffFor(id){return staff.find(s=>Number(s.Staff_ID)===Number(id))||{Staff_Name:'Unassigned'};}
function reservationFor(id){return reservations.find(r=>Number(r.Reservation_ID)===Number(id));}
function renderMetrics(serverData=null){
  const totalRooms=rooms.length, available=rooms.filter(r=>r.Status==='Available').length, occupied=rooms.filter(r=>r.Status==='Occupied').length;
  const revenue=billing.filter(b=>b.Payment_Status==='Paid').reduce((a,b)=>a+Number(b.Amount||0),0);
  $('#metricGrid').innerHTML = [
    ['ROOMS',totalRooms,`${available} available · ${occupied} occupied`],
    ['RESERVATIONS',reservations.length,`${reservations.filter(r=>r.Status==='Booked').length} booked for a stay`],
    ['GUESTS',guests.length,'Registered guest records'],
    ['PAID REVENUE',money(revenue),'Recorded payments']
  ].map(([title,value,sub])=>`<div class="metric"><span>${title}</span><strong>${value}</strong><small>${sub}</small></div>`).join('');
}
function statusClass(status){return String(status||'').toLowerCase().replace(/[^a-z]+/g,'-');}
function statusTag(status){return `<span class="status ${statusClass(status)}">${escapeHTML(status||'—')}</span>`;}
function renderTable(){
  const titleMap={reservations:['Recent reservations','A quick look at upcoming and recent stays.'],guests:['Registered guests','Guest records linked to reservation history.'],billing:['Billing & payments','Service charges and payment status.'],staff:['Hotel staff','Employees supporting the guest experience.']};
  $('#tableTitle').textContent=titleMap[currentTab][0]; $('#tableSubtitle').textContent=titleMap[currentTab][1];
  let html='';
  if(currentTab==='reservations'){
    const rows=[...reservations].sort((a,b)=>Number(b.Reservation_ID)-Number(a.Reservation_ID));
    html=rows.length?`<table><thead><tr><th>BOOKING</th><th>GUEST</th><th>ROOM</th><th>DATES</th><th>STATUS</th><th>ACTION</th></tr></thead><tbody>${rows.map(r=>{const guest=r.Guest_Name? r:guestFor(r.Guest_ID);const room=r.Room_Number?r:roomFor(r.Room_ID);return `<tr><td>#${r.Reservation_ID}</td><td><strong>${escapeHTML(guest.Guest_Name)}</strong><br><small>${escapeHTML(guest.Email||'')}</small></td><td>${escapeHTML(room.Room_Number)} <small>· ${escapeHTML(room.Room_Type)}</small></td><td>${escapeHTML(r.Check_In_Date)}<br><small>to ${escapeHTML(r.Check_Out_Date)}</small></td><td>${statusTag(r.Status)}</td><td>${actionForReservation(r)}</td></tr>`}).join('')}</tbody></table>`:'<div class="empty-table">No reservations yet. Use “Plan your stay” to create the first booking.</div>';
  } else if(currentTab==='guests'){
    html=guests.length?`<table><thead><tr><th>GUEST</th><th>EMAIL</th><th>PHONE</th><th>RESERVATIONS</th><th>CITY / ADDRESS</th></tr></thead><tbody>${guests.map(g=>`<tr><td><strong>${escapeHTML(g.Guest_Name)}</strong><br><small>ID ${g.Guest_ID}</small></td><td>${escapeHTML(g.Email)}</td><td>${escapeHTML(g.Phone)}</td><td>${g.Reservation_Count ?? reservations.filter(r=>Number(r.Guest_ID)===Number(g.Guest_ID)).length}</td><td>${escapeHTML(g.Address||'—')}</td></tr>`).join('')}</tbody></table>`:'<div class="empty-table">Guest records will appear here after a booking is made.</div>';
  } else if(currentTab==='billing'){
    html=billing.length?`<table><thead><tr><th>BILL</th><th>GUEST / ROOM</th><th>SERVICE</th><th>DATE</th><th>AMOUNT</th><th>PAYMENT</th><th>ACTION</th></tr></thead><tbody>${billing.map(b=>{const r=reservationFor(b.Reservation_ID)||{};const g=guestFor(r.Guest_ID);const rm=roomFor(r.Room_ID);return `<tr><td>#${b.Bill_ID}</td><td><strong>${escapeHTML(b.Guest_Name||g.Guest_Name)}</strong><br><small>Room ${escapeHTML(b.Room_Number||rm.Room_Number)}</small></td><td>${escapeHTML(b.Service_Description)}</td><td>${escapeHTML(b.Billing_Date)}</td><td><strong>${money(b.Amount)}</strong></td><td>${statusTag(b.Payment_Status)}</td><td>${b.Payment_Status==='Pending'?`<button class="table-action" data-pay="${b.Bill_ID}">Mark paid</button>`:'—'}</td></tr>`}).join('')}</tbody></table>`:'<div class="empty-table">No billing records are available.</div>';
  } else {
    html=staff.length?`<table><thead><tr><th>STAFF MEMBER</th><th>DESIGNATION</th><th>SHIFT</th><th>ASSIGNED BOOKINGS</th></tr></thead><tbody>${staff.map(s=>`<tr><td><strong>${escapeHTML(s.Staff_Name)}</strong><br><small>Staff ID ${s.Staff_ID}</small></td><td>${escapeHTML(s.Designation||'—')}</td><td>${escapeHTML(s.Shift||'—')}</td><td>${reservations.filter(r=>Number(r.Staff_ID)===Number(s.Staff_ID)).length}</td></tr>`).join('')}</tbody></table>`:'<div class="empty-table">No staff records are available.</div>';
  }
  $('#tableContent').innerHTML=html;
  $$('[data-res-status]').forEach(btn=>btn.addEventListener('click',()=>changeReservationStatus(btn.dataset.id,btn.dataset.resStatus)));
  $$('[data-pay]').forEach(btn=>btn.addEventListener('click',()=>markBillPaid(Number(btn.dataset.pay))));
}
function actionForReservation(r){
  if(r.Status==='Booked') return `<button class="table-action" data-id="${r.Reservation_ID}" data-res-status="Checked-In">Check in</button> <button class="table-action" data-id="${r.Reservation_ID}" data-res-status="Cancelled">Cancel</button>`;
  if(r.Status==='Checked-In') return `<button class="table-action" data-id="${r.Reservation_ID}" data-res-status="Checked-Out">Check out</button>`;
  return '—';
}
function fillSelects(){
  const roomSelect=$('#modalRoomSelect'); const prev=roomSelect.value;
  roomSelect.innerHTML='<option value="">Choose a room</option>'+rooms.filter(r=>r.Status!=='Maintenance').map(r=>`<option value="${r.Room_ID}">Room ${escapeHTML(r.Room_Number)} · ${escapeHTML(r.Room_Type)} · ${money(r.Rate_Per_Night)}/night</option>`).join('');
  if(prev&&rooms.some(r=>String(r.Room_ID)===prev))roomSelect.value=prev;
  const staffSelect=$('#modalStaffSelect'); staffSelect.innerHTML='<option value="">Assign later</option>'+staff.map(s=>`<option value="${s.Staff_ID}">${escapeHTML(s.Staff_Name)} · ${escapeHTML(s.Designation||'Staff')}</option>`).join('');
}
let toastTimer;
function toast(message,error=false){const el=$('#toast');el.textContent=message;el.className=`toast show${error?' error':''}`;clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.className='toast',3300);}
function openBooking(roomId=null){
  fillSelects(); const modal=$('#bookingModal'); modal.classList.add('open'); modal.setAttribute('aria-hidden','false'); document.body.style.overflow='hidden';
  if(roomId) $('#modalRoomSelect').value=String(roomId);
  $('#modalCheckIn').min=todayISO(); $('#modalCheckOut').min=addDays($('#modalCheckIn').value||todayISO(),1);
  if(!$('#modalCheckIn').value||$('#modalCheckIn').value<todayISO())$('#modalCheckIn').value=todayISO();
  if(!$('#modalCheckOut').value||$('#modalCheckOut').value<addDays($('#modalCheckIn').value,1))$('#modalCheckOut').value=addDays($('#modalCheckIn').value,1);
  $('#formMessage').textContent='';$('#formMessage').className='form-message';
  setTimeout(()=>$('#bookingModal input[name="guestName"]').focus(),80);
}
function closeBooking(){ $('#bookingModal').classList.remove('open');$('#bookingModal').setAttribute('aria-hidden','true');document.body.style.overflow=''; }
function overlaps(roomId,checkIn,checkOut,excludeId=null){return reservations.some(r=>Number(r.Room_ID)===Number(roomId)&&Number(r.Reservation_ID)!==Number(excludeId)&&['Booked','Checked-In'].includes(r.Status)&&r.Check_In_Date<checkOut&&r.Check_Out_Date>checkIn);}
async function submitReservation(form){
  const data=Object.fromEntries(new FormData(form)); data.roomId=Number(data.roomId);data.guests=Number(data.guests);data.staffId=data.staffId?Number(data.staffId):null;
  if(!data.checkIn||!data.checkOut||data.checkOut<=data.checkIn){throw new Error('Check-out must be after check-in.');}
  const room=roomFor(data.roomId); if(!room.Room_ID)throw new Error('Please choose a room.');
  if(data.checkIn<todayISO())throw new Error('Check-in cannot be in the past.');
  if(data.guests>Number(room.Capacity||2))throw new Error(`This room can host up to ${room.Capacity} guest(s).`);
  if(mode==='live') return await api('/api/reservations',{method:'POST',body:JSON.stringify(data)});
  if(room.Status==='Maintenance')throw new Error('This room is under maintenance.');
  if(overlaps(data.roomId,data.checkIn,data.checkOut))throw new Error('That room is already booked for these dates. Choose another room or dates.');
  let guest=guests.find(g=>String(g.Email).toLowerCase()===data.email.trim().toLowerCase());
  if(guest){guest.Guest_Name=data.guestName.trim();guest.Phone=data.phone.trim();}
  else {guest={Guest_ID:nextGuestId++,Guest_Name:data.guestName.trim(),Email:data.email.trim().toLowerCase(),Phone:data.phone.trim(),Address:'',Reservation_Count:0};guests.unshift(guest);}
  const r={Reservation_ID:nextReservationId++,Room_ID:data.roomId,Guest_ID:guest.Guest_ID,Staff_ID:data.staffId,Check_In_Date:data.checkIn,Check_Out_Date:data.checkOut,Num_Guests:data.guests,Status:'Booked'};
  reservations.unshift(r);guest.Reservation_Count=(guest.Reservation_Count||0)+1;saveDemo();return {...r,Guest_Name:guest.Guest_Name,Email:guest.Email,Room_Number:room.Room_Number,Room_Type:room.Room_Type,Rate_Per_Night:room.Rate_Per_Night};
}
async function changeReservationStatus(id,status){
  if(!confirm(`Change reservation #${id} to “${status}”?`))return;
  try{
    if(mode==='live'){
      await api(`/api/reservations/${id}/status`,{method:'PATCH',body:JSON.stringify({status})});
      const [r,g,s,b,d]=await Promise.all([api('/api/rooms'),api('/api/guests'),api('/api/staff'),api('/api/billing'),api('/api/reservations')]);rooms=r;guests=g;staff=s;billing=b;reservations=d;
    }else{
      const r=reservationFor(id);if(!r)throw new Error('Reservation not found.');
      if(['Cancelled','Checked-Out'].includes(r.Status))throw new Error('This reservation is already closed.');
      if(status==='Checked-In'){
        const conflict=reservations.some(x=>Number(x.Room_ID)===Number(r.Room_ID)&&Number(x.Reservation_ID)!==Number(id)&&x.Status==='Checked-In');
        if(conflict)throw new Error('This room is occupied by another stay.');
        const room=roomFor(r.Room_ID);room.Status='Occupied';
      }
      r.Status=status;
      if(['Checked-Out','Cancelled'].includes(status)){const active=reservations.some(x=>Number(x.Room_ID)===Number(r.Room_ID)&&Number(x.Reservation_ID)!==Number(id)&&x.Status==='Checked-In');if(!active&&roomFor(r.Room_ID).Status==='Occupied')roomFor(r.Room_ID).Status='Available';}
      saveDemo();
    }
    renderAll();toast(`Reservation #${id} updated to ${status}.`);
  }catch(e){toast(e.message,true);}
}
async function markBillPaid(id){
  try{
    if(mode==='live') {await api(`/api/billing/${id}/payment`,{method:'PATCH',body:JSON.stringify({paymentStatus:'Paid'})});billing=await api('/api/billing');}
    else {const b=billing.find(x=>Number(x.Bill_ID)===Number(id));if(!b)throw new Error('Bill not found.');b.Payment_Status='Paid';saveDemo();}
    renderAll();toast('Payment marked as paid.');
  }catch(e){toast(e.message,true);}
}
function renderAll(){renderRooms();renderMetrics();renderTable();fillSelects();}
function setActiveView(view){$$('.nav-link').forEach(a=>a.classList.toggle('active',a.dataset.view===view));if(view==='reservations')document.querySelector('#management').scrollIntoView({behavior:'smooth'});else if(view==='rooms')document.querySelector('#rooms').scrollIntoView({behavior:'smooth'});else if(view==='about')document.querySelector('#about').scrollIntoView({behavior:'smooth'});else window.scrollTo({top:0,behavior:'smooth'});$('#main-nav')?.classList.remove('open');}

$('#searchCheckIn').min=todayISO();$('#searchCheckOut').min=addDays(todayISO(),1);
$('#searchCheckIn').value=todayISO();$('#searchCheckOut').value=addDays(todayISO(),2);
$('#searchCheckIn').addEventListener('change',()=>{const next=addDays($('#searchCheckIn').value||todayISO(),1);$('#searchCheckOut').min=next;if($('#searchCheckOut').value<next)$('#searchCheckOut').value=next;});
$('#searchForm').addEventListener('submit',e=>{e.preventDefault();if($('#searchCheckOut').value<=$('#searchCheckIn').value){$('#searchMessage').textContent='Check-out must be after check-in.';return;}renderRooms();const count=$$('#roomGrid .room-card').length;$('#searchMessage').textContent=`${count} room${count===1?'':'s'} match your search. Choose a room below to reserve it.`;document.querySelector('#rooms').scrollIntoView({behavior:'smooth'});});
$('#viewAllRooms').addEventListener('click',e=>{e.preventDefault();$('#searchType').value='All';$('#searchCheckIn').value='';$('#searchCheckOut').value='';renderRooms();});
$('#exploreRooms').addEventListener('click',()=>document.querySelector('#rooms').scrollIntoView({behavior:'smooth'}));
$('#openBookingTop').addEventListener('click',()=>openBooking());$('#openBookingBottom').addEventListener('click',()=>openBooking());$('#closeBooking').addEventListener('click',closeBooking);
$('#bookingModal').addEventListener('click',e=>{if(e.target===$('#bookingModal'))closeBooking();});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeBooking();});
$('#modalCheckIn').addEventListener('change',()=>{const next=addDays($('#modalCheckIn').value||todayISO(),1);$('#modalCheckOut').min=next;if($('#modalCheckOut').value<next)$('#modalCheckOut').value=next;});
$('#reservationForm').addEventListener('submit',async e=>{
  e.preventDefault();const btn=$('.modal-submit');btn.disabled=true;btn.textContent='Saving reservation…';const msg=$('#formMessage');msg.textContent='';msg.className='form-message';
  try{const reservation=await submitReservation(e.currentTarget);msg.textContent=`Reservation #${reservation.Reservation_ID} is confirmed in the system. We'll see you soon.`;msg.className='form-message success';e.currentTarget.reset();toast(`Reservation #${reservation.Reservation_ID} created.`);await refreshAfterCreate();setTimeout(closeBooking,1400);}
  catch(error){msg.textContent=error.message;msg.className='form-message';}
  finally{btn.disabled=false;btn.innerHTML='Confirm reservation <span>↗</span>';}
});
async function refreshAfterCreate(){
  if(mode==='live'){try{const [r,g,s,b,rs,d]=await Promise.all([api('/api/rooms'),api('/api/guests'),api('/api/staff'),api('/api/billing'),api('/api/reservations'),api('/api/dashboard')]);rooms=r;guests=g;staff=s;billing=b;reservations=rs;renderMetrics(d);}catch(_e){renderMetrics();}}
  else {saveDemo();renderMetrics();}
  renderRooms();renderTable();fillSelects();
}
$$('.tab').forEach(btn=>btn.addEventListener('click',()=>{currentTab=btn.dataset.tab;$$('.tab').forEach(t=>t.classList.toggle('active',t===btn));renderTable();}));
$('#refreshData').addEventListener('click',async()=>{if(mode==='live'){try{const [r,g,s,b,rs]=await Promise.all([api('/api/rooms'),api('/api/guests'),api('/api/staff'),api('/api/billing'),api('/api/reservations')]);rooms=r;guests=g;staff=s;billing=b;reservations=rs;}catch(e){toast(e.message,true);return;}}renderAll();toast('Hotel records refreshed.');});
$('#menuToggle').addEventListener('click',()=>$('.main-nav').classList.toggle('open'));
$$('.nav-link').forEach(a=>a.addEventListener('click',()=>{if(a.dataset.view)setActiveView(a.dataset.view);$('.main-nav').classList.remove('open');}));
$$('.footer-links a').forEach(a=>a.addEventListener('click',e=>{if(a.dataset.view){e.preventDefault();setActiveView(a.dataset.view);}}));
initData();
