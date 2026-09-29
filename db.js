(function(){
const C=window.LK_SUPABASE||{};
if(!C.url||!C.anonKey||!window.supabase)return;
const sb=supabase.createClient(C.url,C.anonKey),mail=u=>u+"@latihanku.app";
let ch=null,P=null;
async function setSession(user){
  const {data:p}=await sb.from("profiles").select("*").eq("id",user.id).single();
  if(!p){await sb.auth.signOut();return false}
  if(p.role==="admin"){st.set("sess","admin");adminQ()}
  else{const U=users();U[p.username]={n:p.nama,s:p.sekolah,t:p.tgl_lahir,k:p.kelas,g:p.target,w:p.wa,exp:p.premium_until?+p.premium_until.replace(/-/g,""):0,xp:p.xp,ph:"-"};st.set("users",U);st.set("sess",p.username)}
  return true;
}
window.doLogin=async function(){
  const u=$("#lu").value.trim().toLowerCase(),{data,error}=await sb.auth.signInWithPassword({email:mail(u),password:$("#lp").value});
  if(error||!(await setSession(data.user)))return $("#er").textContent="Nama pengguna atau kata sandi salah.";
  go(me().admin?"adm":"home");render();
};
window.doReg=async function(){
  const g=id=>$("#"+id).value.trim(),e=$("#er"),u=g("ru").toLowerCase(),p=$("#rp").value;
  if(!g("rn")||!u||!g("rs")||!g("rt")||!g("rk"))return e.textContent="Lengkapi data pendaftaran.";
  if(!/^[a-z0-9_]{3,20}$/.test(u)||u==="admin")return e.textContent="Nama pengguna 3–20 karakter: huruf kecil, angka, atau _.";
  if(p.length<6)return e.textContent="Kata sandi minimal 6 karakter.";
  const {data,error}=await sb.auth.signUp({email:mail(u),password:p,options:{data:{username:u,nama:g("rn"),sekolah:g("rs"),tgl_lahir:g("rt"),kelas:g("rk"),target:g("rg"),wa:g("rw")}}});
  if(error)return e.textContent=/registered/i.test(error.message)?"Nama pengguna sudah dipakai.":error.message;
  if(!data.session)return e.textContent="Matikan 'Confirm email' di Supabase → Auth → Providers → Email.";
  await setSession(data.user);go("home");render();
};
window.logout=async function(){await sb.auth.signOut();st.set("sess","");render()};
sb.auth.getSession().then(({data})=>{if(!data.session&&sess()){st.set("sess","");render()}});

async function load(){
  const {data}=await sb.from("posts").select("*,replies(*)").order("created_at",{ascending:false}).limit(100);
  P=data||[];paint();
}
function paint(){
  const el=$("#ps");if(!el)return;
  const cf=st.get("dcat",""),q=(($("#ds")&&$("#ds").value)||"").toLowerCase(),keep={},ac=document.activeElement&&document.activeElement.id;
  el.querySelectorAll("input[id^=r_]").forEach(i=>keep[i.id]=i.value);
  let L=P||[];if(cf)L=L.filter(p=>p.cat===cf);if(q)L=L.filter(p=>p.body.toLowerCase().includes(q));
  const tg=r=>r.is_tutor?`<span class="tag" style="background:var(--y)">Tutor</span>`:"",d=x=>new Date(x).toLocaleString("id-ID",{dateStyle:"short",timeStyle:"short"});
  el.innerHTML=L.length?L.map(p=>`<div class="post"><span class="tag">${esc(p.cat)}</span>${tg(p)}<small> ${esc(p.author_name)} · ${d(p.created_at)}</small><div>${esc(p.body)}</div>${(p.replies||[]).sort((a,b)=>a.created_at<b.created_at?-1:1).map(r=>`<div style="margin:6px 0 0 16px;padding-left:10px;border-left:3px solid ${r.is_tutor?"var(--y)":"var(--l)"}">${tg(r)}<small>${esc(r.author_name)} · ${d(r.created_at)}</small><div>${esc(r.body)}</div></div>`).join("")}<div style="margin-top:6px;display:flex;gap:6px"><input id="r_${p.id}" placeholder="Balas…" style="flex:1"><button class="btn alt" style="padding:6px 12px" onclick="reply('${p.id}')">Balas</button></div></div>`).join(""):"<p>Belum ada diskusi. Mulai dengan pertanyaan pertamamu.</p>";
  for(const k in keep){const i=document.getElementById(k);if(i)i.value=keep[k]}
  if(ac&&ac.startsWith("r_")){const i=document.getElementById(ac);if(i)i.focus()}
}
window.renderPosts=function(){
  if(!ch)ch=sb.channel("forum").on("postgres_changes",{event:"*",schema:"public",table:"posts"},load).on("postgres_changes",{event:"*",schema:"public",table:"replies"},load).subscribe();
  P?paint():load();
};
window.addPost=async function(){const t=$("#pt").value.trim();if(!t)return;const {error}=await sb.from("posts").insert({body:t,cat:$("#pc").value});if(error)return alert(error.message);$("#pt").value="";load()};
window.reply=async function(id){const el=$("#r_"+id),t=el&&el.value.trim();if(!t)return;const {error}=await sb.from("replies").insert({post_id:id,body:t});if(error)return alert(error.message);el.value="";load()};

// ===== Premium via database =====
async function refreshMe(){const {data:{user}}=await sb.auth.getUser();if(user&&!me().admin)await setSession(user)}
addEventListener("hashchange",async()=>{const b=me()&&me().exp;await refreshMe();if(me()&&me().exp!==b)render()});
window.activate=async function(){
  const {error}=await sb.rpc("redeem_code",{p_code:$("#cd").value});
  if(error)return alert(error.message);
  await refreshMe();alert("Premium aktif!");render();
};
const rnd=()=>Array.from(crypto.getRandomValues(new Uint8Array(8)),b=>"ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[b%32]).join("");
window.setPrem=async function(){
  const u=$("#ku").value.trim(),{data,error}=await sb.rpc("admin_set_premium",{p_username:u,p_hari:+$("#kd").value});
  $("#kr").innerHTML=error?`❌ ${esc(error.message)}`:`✅ Premium <b>@${esc(u.toLowerCase())}</b> aktif sampai <b>${fmtD(+data.replace(/-/g,""))}</b>. Siswa cukup membuka ulang halaman.`;
};
window.mkCode=async function(){
  const c="LK-"+rnd(),{error}=await sb.from("kode_premium").insert({code:c,hari:+$("#kd2").value});
  $("#kr2").innerHTML=error?`❌ ${esc(error.message)}`:`<b>${c}</b> (sekali pakai, berlaku untuk akun mana pun)<br><br><button class="btn alt" onclick="navigator.clipboard.writeText('Pembayaran diterima ✅ Masukkan kode ini di menu Premium: ${c}');this.textContent='Tersalin'">Salin pesan untuk pembeli</button>`;
};
V.kode=function(){
  const pl=CFG.plans.map(x=>`<option value="${x.d}">${x.n}</option>`).join("");
  $("#app").innerHTML=`<div class="admin-top"><div><h1>Premium</h1><p>Aktifkan langsung untuk satu pengguna, atau buat kode sekali pakai untuk dikirim ke pembeli.</p></div></div>
  <div class="admin-section"><h3>Aktifkan langsung</h3><div class="admin-form-grid" style="grid-template-columns:1fr 150px auto"><input id="ku" placeholder="Nama pengguna pembeli"><select id="kd">${pl}</select><button class="btn" onclick="setPrem()">Aktifkan</button></div><p id="kr" class="admin-note" style="margin-top:10px">Masa aktif ditambahkan ke sisa premium yang ada.</p></div>
  <div class="admin-section"><h3>Buat kode</h3><div class="admin-form-grid" style="grid-template-columns:150px auto"><select id="kd2">${pl}</select><button class="btn alt" onclick="mkCode()">Buat kode</button></div><div id="kr2" class="admin-note" style="margin-top:10px">Kode muncul di sini.</div></div>`;
};

// ===== Publikasi soal ke GitHub (lewat /api/publish) =====
window.pub=async function(k){
  const {data:{session}}=await sb.auth.getSession();if(!session)return alert("Login dulu.");
  const n=Q.filter(q=>+q.k===k).length;
  if(!confirm(`Publikasikan ${n} soal kelas ${k} ke GitHub? File SMA/kelas-${k}.json akan ditimpa.`))return;
  const r=await fetch("/api/publish",{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+session.access_token},body:JSON.stringify({kelas:k,konten:{kelas:k,pengumuman:st.get("ann",ANN),soal:Q.filter(q=>+q.k===k)}})});
  const j=await r.json().catch(()=>({}));
  alert(r.ok?"Berhasil. Vercel sedang deploy ulang (±1 menit), lalu soal tampil untuk siswa.":"Gagal: "+(j.error||r.status));
};
})();
