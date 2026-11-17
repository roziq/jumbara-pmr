(() => {
  const client = window.jumbaraSupabase;
  if (!client) return;
  const form = document.getElementById('eventForm');
  const notice = document.getElementById('eventNotice');
  const list = document.getElementById('eventsList');
  const say = (message, error=false) => { notice.textContent=message; notice.className='notice show'+(error?' error':''); };
  const statusLabel = {PERSIAPAN:'Persiapan',PENDAFTARAN:'Pendaftaran',BERLANGSUNG:'Berlangsung',PENILAIAN:'Penilaian',SELESAI:'Selesai',ARSIP_FINAL:'Arsip final'};
  const levelLabel = {MU:'Mula',MA:'Madya',WI:'Wira'};
  const loadEvents = async () => {
    const {data, error}=await client.from('jumbara_events').select('id,name,event_year,status,starts_on,ends_on,jumbara_event_levels(level_code,is_enabled)').order('event_year',{ascending:false});
    if(error){list.innerHTML='<div class="empty-state">Data kegiatan tidak dapat dimuat: '+escapeHtml(error.message)+'</div>';return;}
    document.getElementById('totalEvents').textContent=data.length;
    document.getElementById('prepEvents').textContent=data.filter(x=>x.status==='PERSIAPAN').length;
    document.getElementById('activeEvents').textContent=data.filter(x=>['PENDAFTARAN','BERLANGSUNG','PENILAIAN'].includes(x.status)).length;
    document.getElementById('archivedEvents').textContent=data.filter(x=>x.status==='ARSIP_FINAL').length;
    if(!data.length){list.innerHTML='<div class="empty-state"><b>Belum ada edisi Jumbara.</b><br>Buat edisi pertama untuk mulai mengatur jenjang dan pendaftaran.</div>';return;}
    list.innerHTML=data.map(event=>{
      const levels=(event.jumbara_event_levels||[]).filter(x=>x.is_enabled).map(x=>'<span class="level-chip">'+escapeHtml(x.level_code)+' · '+levelLabel[x.level_code]+'</span>').join('');
      const dates=event.starts_on?formatDate(event.starts_on)+' – '+(event.ends_on?formatDate(event.ends_on):'Belum ditentukan'):'Tanggal belum ditentukan';
      return '<article class="event-card"><div class="event-card-main"><div class="event-year">'+event.event_year+'</div><div><h3>'+escapeHtml(event.name)+'</h3><p>'+dates+'</p><div class="level-chips">'+(levels||'<span class="muted">Jenjang belum diatur</span>')+'</div></div></div><span class="status-chip status-'+event.status.toLowerCase()+'">'+(statusLabel[event.status]||event.status)+'</span></article>';
    }).join('');
  };
  const escapeHtml = value => String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const formatDate = value => new Date(value+'T00:00:00').toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'});
  document.getElementById('showEventForm').addEventListener('click',()=>{form.hidden=false;form.scrollIntoView({behavior:'smooth',block:'center'});});
  document.getElementById('hideEventForm').addEventListener('click',()=>{form.hidden=true;});
  form.addEventListener('submit',async e=>{
    e.preventDefault();
    const button=document.getElementById('saveEventButton');button.disabled=true;
    try{
      const {data:{user}}=await client.auth.getUser();
      if(!user) throw new Error('Sesi login berakhir. Silakan masuk kembali.');
      const fd=new FormData(form);const levels=fd.getAll('levels');
      if(!levels.length) throw new Error('Pilih minimal satu jenjang.');
      const payload={name:String(fd.get('name')).trim(),event_year:Number(fd.get('event_year')),status:'PERSIAPAN',starts_on:fd.get('starts_on')||null,ends_on:fd.get('ends_on')||null,created_by:user.id};
      if(payload.ends_on&&payload.starts_on&&payload.ends_on<payload.starts_on) throw new Error('Tanggal selesai tidak boleh sebelum tanggal mulai.');
      const {data:event,error}=await client.from('jumbara_events').insert(payload).select('id').single();
      if(error) throw error;
      const rows=levels.map(level_code=>({event_id:event.id,level_code,is_enabled:true}));
      const {error:levelError}=await client.from('jumbara_event_levels').insert(rows);
      if(levelError) throw new Error('Edisi tersimpan, tetapi pengaturan jenjang gagal: '+levelError.message);
      say('Edisi Jumbara berhasil dibuat.');
      form.reset();form.hidden=true;await loadEvents();
    }catch(error){say(error.message||'Gagal menyimpan edisi.',true);}
    finally{button.disabled=false;}
  });
  loadEvents();
})();