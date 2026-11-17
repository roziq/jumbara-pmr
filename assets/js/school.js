(() => {
 const client=window.supabase?.createClient(window.JUMBARA_SUPABASE_CONFIG.url,window.JUMBARA_SUPABASE_CONFIG.publishableKey);if(!client)return;
 const $=id=>document.getElementById(id),notice=$('schoolNotice'),setup=$('schoolSetupPanel'),workspace=$('schoolWorkspace');
 const say=(m,e=false)=>{notice.textContent=m;notice.className='school-message'+(e?' error':'');};
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let user,school,events=[];
 const logout=async()=>{await client.auth.signOut();location.replace('login.html');};$('logoutButton').addEventListener('click',logout);
 const load=async()=>{
  const {data:members,error}=await client.from('school_members').select('school_id,schools(id,npsn,name,school_level,district,address)').eq('user_id',user.id);
  if(error)throw error;
  school=members?.[0]?.schools||null;
  if(!school){setup.hidden=false;workspace.hidden=true;return;}
  setup.hidden=true;workspace.hidden=false;$('schoolNameHeading').textContent=school.name;$('schoolMeta').textContent='NPSN '+(school.npsn||'—')+' · '+(school.school_level||'Jenjang belum diisi')+' · '+(school.district||'');
  await loadWorkspace();
 };
 const loadWorkspace=async()=>{
  const [ev,co]=await Promise.all([
   client.from('jumbara_events').select('id,name,event_year,status,jumbara_event_levels(id,level_code,is_enabled)').in('status',['PERSIAPAN','PENDAFTARAN']).order('event_year',{ascending:false}),
   client.from('contingents').select('id,contingent_code,name,status,event_id,event_level_id,jumbara_events(name,event_year),jumbara_event_levels(level_code)').eq('school_id',school.id).order('created_at',{ascending:false})
  ]);
  if(ev.error)throw ev.error;if(co.error)throw co.error;events=ev.data||[];
  $('eventSelect').innerHTML='<option value="">Pilih edisi</option>'+events.map(e=>'<option value="'+e.id+'">'+esc(e.name)+' · '+e.event_year+'</option>').join('');
  const contingents=co.data||[];
  $('participantContingent').innerHTML='<option value="">Pilih kontingen</option>'+contingents.map(c=>'<option value="'+c.id+'">'+esc(c.contingent_code)+' · '+esc(c.name)+'</option>').join('');
  $('contingentList').innerHTML=contingents.length?'<table class="school-table"><thead><tr><th>Kode</th><th>Kontingen</th><th>Jenjang</th><th>Edisi</th></tr></thead><tbody>'+contingents.map(c=>'<tr><td><b>'+esc(c.contingent_code)+'</b></td><td>'+esc(c.name)+'</td><td>'+esc(c.jumbara_event_levels?.level_code||'')+'</td><td>'+esc(c.jumbara_events?.name||'')+'</td></tr>').join('')+'</tbody></table>':'<div class="school-empty">Belum ada kontingen. Daftarkan kontingen terlebih dahulu.</div>';
  const ids=contingents.map(c=>c.id);let participants=[];
  if(ids.length){const p=await client.from('participants').select('id,participant_code,full_name,nisn,gender,class_name,contingent_id').in('contingent_id',ids).order('created_at',{ascending:false});if(p.error)throw p.error;participants=p.data||[];}
  const byId=new Map(contingents.map(c=>[c.id,c]));
  $('participantList').innerHTML=participants.length?'<table class="school-table"><thead><tr><th>Kode</th><th>Nama peserta</th><th>NISN</th><th>Kontingen</th><th>Kelas</th></tr></thead><tbody>'+participants.map(p=>'<tr><td><b>'+esc(p.participant_code)+'</b></td><td>'+esc(p.full_name)+'</td><td>'+esc(p.nisn||'—')+'</td><td>'+esc(byId.get(p.contingent_id)?.contingent_code||'')+'</td><td>'+esc(p.class_name||'—')+'</td></tr>').join('')+'</tbody></table>':'<div class="school-empty">Belum ada peserta yang ditambahkan.</div>';
 };
 $('schoolSetupForm').addEventListener('submit',async e=>{
  e.preventDefault();const b=e.currentTarget.querySelector('button');b.disabled=true;
  try{const fd=new FormData(e.currentTarget),payload={npsn:String(fd.get('npsn')).trim(),name:String(fd.get('name')).trim(),school_level:String(fd.get('school_level')),district:String(fd.get('district')).trim(),address:String(fd.get('address')).trim(),created_by:user.id};
   const {data:s,error}=await client.from('schools').insert(payload).select('id').single();if(error)throw error;
   const {error:m}=await client.from('school_members').insert({school_id:s.id,user_id:user.id,member_role:'operator_sekolah'});if(m)throw m;
   say('Data sekolah tersimpan. Sekarang sekolah dapat mendaftarkan kontingen dan peserta.');await load();
  }catch(err){say(err.message||'Gagal menyimpan sekolah.',true);}finally{b.disabled=false;}
 });
 $('eventSelect').addEventListener('change',()=>{
  const ev=events.find(x=>x.id===$('eventSelect').value),levels=(ev?.jumbara_event_levels||[]).filter(x=>x.is_enabled);
  $('levelSelect').innerHTML='<option value="">Pilih jenjang PMR</option>'+levels.map(l=>'<option value="'+l.id+'">'+l.level_code+' · '+({MU:'Mula',MA:'Madya',WI:'Wira'}[l.level_code]||'')+'</option>').join('');
 });
 $('contingentForm').addEventListener('submit',async e=>{
  e.preventDefault();const b=e.currentTarget.querySelector('button');b.disabled=true;
  try{const fd=new FormData(e.currentTarget),ev=events.find(x=>x.id===fd.get('event_id'));const level=(ev?.jumbara_event_levels||[]).find(x=>x.id===fd.get('event_level_id'));if(!level?.is_enabled)throw new Error('Jenjang tidak tersedia pada edisi ini.');
   const {error}=await client.from('contingents').insert({event_id:fd.get('event_id'),event_level_id:fd.get('event_level_id'),school_id:school.id,name:String(fd.get('name')).trim(),created_by:user.id});if(error)throw error;
   say('Kontingen berhasil didaftarkan. Kode kontingen dibuat otomatis.');e.currentTarget.reset();$('levelSelect').innerHTML='<option value="">Pilih edisi dahulu</option>';await loadWorkspace();
  }catch(err){say(err.message||'Gagal mendaftarkan kontingen.',true);}finally{b.disabled=false;}
 });
 $('participantForm').addEventListener('submit',async e=>{
  e.preventDefault();const b=e.currentTarget.querySelector('button');b.disabled=true;
  try{const fd=new FormData(e.currentTarget),nisn=String(fd.get('nisn')).trim();if(nisn&&!/^\d{10}$/.test(nisn))throw new Error('NISN harus 10 digit atau dikosongkan.');
   const {error}=await client.from('participants').insert({contingent_id:fd.get('contingent_id'),full_name:String(fd.get('full_name')).trim(),nisn:nisn||null,gender:fd.get('gender')||null,class_name:String(fd.get('class_name')).trim()||null,created_by:user.id});if(error)throw error;
   say('Peserta berhasil ditambahkan. Kode peserta dibuat otomatis.');e.currentTarget.reset();await loadWorkspace();
  }catch(err){say(err.message||'Gagal menyimpan peserta.',true);}finally{b.disabled=false;}
 });
 client.auth.getSession().then(async({data})=>{
  if(!data.session){location.replace('login.html');return;}user=data.session.user;$('schoolEmail').textContent=user.email;
  const {data:roles,error}=await client.from('user_roles').select('role_id').eq('user_id',user.id);if(error){say(error.message,true);return;}
  if(!(roles||[]).some(r=>r.role_id==='operator_kontingen')){if((roles||[]).some(r=>r.role_id==='admin_markas')){location.replace('index.html');return;}say('Akun ini belum memiliki hak Operator Kontingen.',true);return;}
  try{await load();}catch(err){say(err.message||'Data sekolah gagal dimuat.',true);}
 });
})();