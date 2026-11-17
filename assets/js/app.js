(() => {
  const client = window.jumbaraSupabase;
  if (!client) return;
  const form = document.getElementById('eventForm');
  const notice = document.getElementById('eventNotice');
  const list = document.getElementById('eventsList');
  const say = (message, error=false) => { notice.textContent=message; notice.className='notice show'+(error?' error':''); };
  const statusLabel = {PERSIAPAN:'Persiapan',PENDAFTARAN:'Pendaftaran',BERLANGSUNG:'Berlangsung',PENILAIAN:'Penilaian',SELESAI:'Selesai',ARSIP_FINAL:'Arsip final'};
  const levelLabel = {MU:'Mula',MA:'Madya',WI:'Wira'};
  const escapeHtml = value => String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const formatDate = value => new Date(value+'T00:00:00').toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'});
  const loadEvents = async () => {
    const {data, error}=await client.from('jumbara_events').select('id,name,event_year,status,starts_on,ends_on,jumbara_event_levels(id,level_code,is_enabled,quota_contingents,quota_participants_per_contingent)').order('event_year',{ascending:false});
    if(error){list.innerHTML='<div class="empty-state">Data kegiatan tidak dapat dimuat: '+escapeHtml(error.message)+'</div>';return;}
    document.getElementById('totalEvents').textContent=data.length;
    document.getElementById('prepEvents').textContent=data.filter(x=>x.status==='PERSIAPAN').length;
    document.getElementById('activeEvents').textContent=data.filter(x=>['PENDAFTARAN','BERLANGSUNG','PENILAIAN'].includes(x.status)).length;
    document.getElementById('archivedEvents').textContent=data.filter(x=>x.status==='ARSIP_FINAL').length;
    if(!data.length){list.innerHTML='<div class="empty-state"><b>Belum ada edisi Jumbara.</b><br>Buat edisi pertama untuk mulai mengatur jenjang dan pendaftaran.</div>';return;}
    list.innerHTML=data.map(event=>{
      const levels=(event.jumbara_event_levels||[]).filter(x=>x.is_enabled).map(x=>'<span class="level-chip">'+escapeHtml(x.level_code)+' · '+levelLabel[x.level_code]+'</span>').join('');
      const dates=event.starts_on?formatDate(event.starts_on)+' – '+(event.ends_on?formatDate(event.ends_on):'Belum ditentukan'):'Tanggal belum ditentukan';
      const quotaRows=(event.jumbara_event_levels||[]).filter(x=>x.is_enabled).map(x=>'<div class="quota-row"><b>'+escapeHtml(x.level_code)+' · '+levelLabel[x.level_code]+'</b><label>Kuota kontingen<input type="number" min="0" step="1" name="contingents_'+x.id+'" value="'+(x.quota_contingents??'')+'" placeholder="Tidak dibatasi"></label><label>Peserta per kontingen<input type="number" min="0" step="1" name="participants_'+x.id+'" value="'+(x.quota_participants_per_contingent??'')+'" placeholder="Tidak dibatasi"></label></div>').join('');
      return '<article class="event-card"><div class="event-card-main"><div class="event-year">'+event.event_year+'</div><div class="event-info"><h3>'+escapeHtml(event.name)+'</h3><p>'+dates+'</p><div class="level-chips">'+(levels||'<span class="muted">Jenjang belum diatur</span>')+'</div><button class="text-button quota-toggle" type="button" data-event="'+event.id+'">Atur kuota pendaftaran</button><form class="quota-form" data-event="'+event.id+'" hidden>'+quotaRows+'<div class="quota-actions"><button class="primary-button" type="submit">Simpan kuota</button><button class="text-button quota-cancel" type="button">Batal</button></div></form></div></div><span class="status-chip status-'+event.status.toLowerCase()+'">'+(statusLabel[event.status]||event.status)+'</span></article>';
    }).join('');
    list.querySelectorAll('.quota-toggle').forEach(button=>button.addEventListener('click',()=>{const target=list.querySelector('.quota-form[data-event="'+button.dataset.event+'"]');target.hidden=!target.hidden;}));
    list.querySelectorAll('.quota-cancel').forEach(button=>button.addEventListener('click',()=>{button.closest('form').hidden=true;}));
    list.querySelectorAll('.quota-form').forEach(quotaForm=>quotaForm.addEventListener('submit',saveQuota));
  };
  const saveQuota = async event => {
    event.preventDefault();const quotaForm=event.currentTarget;const button=quotaForm.querySelector('button[type=submit]');button.disabled=true;
    try{
      const updates=[];
      for(const row of quotaForm.querySelectorAll('.quota-row')){
        const inputs=row.querySelectorAll('input');
        const id=inputs[0].name.replace('contingents_','');
        const parse=el=>el.value.trim()===''?null:Number(el.value);
        const contingent=parse(inputs[0]),participant=parse(inputs[1]);
        if((contingent!==null&&(!Number.isInteger(contingent)||contingent<0))||(participant!==null&&(!Number.isInteger(participant)||participant<0)))throw new Error('Kuota harus berupa bilangan bulat nol atau lebih.');
        updates.push({id,quota_contingents:contingent,quota_participants_per_contingent:participant});
      }
      for(const update of updates){const {error}=await client.from('jumbara_event_levels').update({quota_contingents:update.quota_contingents,quota_participants_per_contingent:update.quota_participants_per_contingent}).eq('id',update.id);if(error)throw error;}
      say('Kuota pendaftaran berhasil disimpan.');await loadEvents();
    }catch(error){say(error.message||'Gagal menyimpan kuota.',true);}
    finally{button.disabled=false;}
  };
  document.getElementById('showEventForm').addEventListener('click',()=>{form.hidden=false;form.scrollIntoView({behavior:'smooth',block:'center'});});
  document.getElementById('hideEventForm').addEventListener('click',()=>{form.hidden=true;});
  form.addEventListener('submit',async e=>{
    e.preventDefault();const button=document.getElementById('saveEventButton');button.disabled=true;
    try{
      const {data:{user}}=await client.auth.getUser();if(!user)throw new Error('Sesi login berakhir. Silakan masuk kembali.');
      const fd=new FormData(form);const levels=fd.getAll('levels');if(!levels.length)throw new Error('Pilih minimal satu jenjang.');
      const payload={name:String(fd.get('name')).trim(),event_year:Number(fd.get('event_year')),status:'PERSIAPAN',starts_on:fd.get('starts_on')||null,ends_on:fd.get('ends_on')||null,created_by:user.id};
      if(payload.ends_on&&payload.starts_on&&payload.ends_on<payload.starts_on)throw new Error('Tanggal selesai tidak boleh sebelum tanggal mulai.');
      const {data:event,error}=await client.from('jumbara_events').insert(payload).select('id').single();if(error)throw error;
      const rows=levels.map(level_code=>({event_id:event.id,level_code,is_enabled:true}));
      const {error:levelError}=await client.from('jumbara_event_levels').insert(rows);
      if(levelError){await client.from('jumbara_events').delete().eq('id',event.id);throw new Error('Pengaturan jenjang gagal. Edisi dibatalkan: '+levelError.message);}
      say('Edisi Jumbara berhasil dibuat.');form.reset();form.hidden=true;await loadEvents();
    }catch(error){say(error.message||'Gagal menyimpan edisi.',true);}
    finally{button.disabled=false;}
  });

  const registryNotice=document.getElementById('registryNotice');
  const registrySay=(message,error=false)=>{registryNotice.textContent=message;registryNotice.className='notice show'+(error?' error':'');};
  const schoolForm=document.getElementById('schoolForm');
  const contingentForm=document.getElementById('contingentForm');
  const eventSelect=document.getElementById('contingentEvent');
  const levelSelect=document.getElementById('contingentLevel');
  const schoolSelect=document.getElementById('contingentSchool');
  const loadRegistry=async()=>{
    const [{data:schools,error:schoolError},{data:events,error:eventError},{data:contingents,error:contingentError}]=await Promise.all([
      client.from('schools').select('id,name,npsn,district').order('name'),
      client.from('jumbara_events').select('id,name,event_year,status,jumbara_event_levels(id,level_code,is_enabled)').order('event_year',{ascending:false}),
      client.from('contingents').select('id,contingent_code,name,status,schools(name),jumbara_events(name,event_year),jumbara_event_levels(level_code)').order('created_at',{ascending:false})
    ]);
    if(schoolError||eventError||contingentError){registrySay((schoolError||eventError||contingentError).message,true);return;}
    schoolSelect.innerHTML='<option value="">Pilih sekolah</option>'+schools.map(s=>'<option value="'+s.id+'">'+escapeHtml(s.name)+(s.npsn?' · '+escapeHtml(s.npsn):'')+'</option>').join('');
    eventSelect.innerHTML='<option value="">Pilih edisi</option>'+events.filter(e=>['PERSIAPAN','PENDAFTARAN'].includes(e.status)).map(e=>'<option value="'+e.id+'">'+escapeHtml(e.name)+' · '+e.event_year+'</option>').join('');
    document.getElementById('schoolsList').innerHTML=schools.length?schools.map(s=>'<div class="simple-item"><b>'+escapeHtml(s.name)+'</b><small>'+(s.npsn?'NPSN '+escapeHtml(s.npsn):'NPSN belum diisi')+(s.district?' · '+escapeHtml(s.district):'')+'</small></div>').join(''):'<p class="muted">Belum ada data sekolah.</p>';
    document.getElementById('contingentsList').innerHTML=contingents.length?contingents.map(c=>'<div class="simple-item"><b>'+escapeHtml(c.contingent_code)+' · '+escapeHtml(c.name)+'</b><small>'+escapeHtml(c.schools?.name||'')+' · '+escapeHtml(c.jumbara_event_levels?.level_code||'')+' · '+escapeHtml(c.jumbara_events?.name||'')+'</small></div>').join(''):'<p class="muted">Belum ada kontingen.</p>';
    eventSelect.dataset.events=JSON.stringify(events);
  };
  eventSelect.addEventListener('change',()=>{
    const events=JSON.parse(eventSelect.dataset.events||'[]');
    const selected=events.find(e=>e.id===eventSelect.value);
    const levels=(selected?.jumbara_event_levels||[]).filter(l=>l.is_enabled);
    levelSelect.innerHTML='<option value="">Pilih jenjang</option>'+levels.map(l=>'<option value="'+l.id+'">'+l.level_code+' · '+levelLabel[l.level_code]+'</option>').join('');
  });
  schoolForm.addEventListener('submit',async e=>{
    e.preventDefault();const button=schoolForm.querySelector('button[type=submit]');button.disabled=true;
    try{
      const fd=new FormData(schoolForm);const {data:{user}}=await client.auth.getUser();
      const payload={name:String(fd.get('name')).trim(),npsn:String(fd.get('npsn')).trim()||null,address:String(fd.get('address')).trim()||null,district:String(fd.get('district')).trim()||null,contact_name:String(fd.get('contact_name')).trim()||null,contact_phone:String(fd.get('contact_phone')).trim()||null,created_by:user.id};
      const {data:school,error}=await client.from('schools').insert(payload).select('id').single();if(error)throw error;
      const {error:memberError}=await client.from('school_members').insert({school_id:school.id,user_id:user.id,member_role:'operator_sekolah'});
      if(memberError)throw memberError;
      registrySay('Data sekolah berhasil disimpan dan akun saat ini ditautkan sebagai operator sekolah.');schoolForm.reset();await loadRegistry();
    }catch(error){registrySay(error.message||'Gagal menyimpan sekolah.',true);}
    finally{button.disabled=false;}
  });
  contingentForm.addEventListener('submit',async e=>{
    e.preventDefault();const button=contingentForm.querySelector('button[type=submit]');button.disabled=true;
    try{
      const fd=new FormData(contingentForm);const {data:{user}}=await client.auth.getUser();
      const {error}=await client.from('contingents').insert({event_id:fd.get('event_id'),event_level_id:fd.get('event_level_id'),school_id:fd.get('school_id'),name:String(fd.get('name')).trim(),created_by:user.id});
      if(error)throw error;
      registrySay('Kontingen berhasil didaftarkan. Kode kontingen dibuat otomatis.');contingentForm.reset();levelSelect.innerHTML='<option value="">Pilih edisi dahulu</option>';await loadRegistry();
    }catch(error){registrySay(error.message||'Gagal mendaftarkan kontingen.',true);}
    finally{button.disabled=false;}
  });
  client.auth.getSession().then(({data})=>{if(data.session){loadEvents();loadRegistry();}});
})();