
const $ = s => document.querySelector(s);
const app = $("#app");

const state = {
  q: "", guests: 1, currency: "USD", dark: false,
  filters: { verified:false, instant:false, under5:false, sort:"best", price:100, d1:"", d2:"" },
  saved: JSON.parse(localStorage.getItem("saved")||"[]"),
  geo: null
};
$("#cur").textContent = state.currency;

// Simple coords for origins (IATA-like)
const CITY = {
  DXB:{lat:25.253, lon:55.365}, AUH:{lat:24.454, lon:54.377},
  RUH:{lat:24.958, lon:46.698}, JED:{lat:21.543, lon:39.173},
  IST:{lat:41.008, lon:28.978}, CAI:{lat:30.044, lon:31.235}
};

// Demo dataset
const DATA = [
  { id:1, from:"DXB", to:"JED", title:"DXB → JED (5kg)", price:45, rating:4.8, reviews:132, verified:true, instant:true, kg:5, imgs:["icons/logo.png","icons/icon-512.png"] },
  { id:2, from:"AUH", to:"CAI", title:"AUH → CAI (3kg, eve flight)", price:32, rating:4.5, reviews:77, verified:true, instant:false, kg:3, imgs:["icons/logo.png","icons/icon-192.png"] },
  { id:3, from:"RUH", to:"DXB", title:"RUH → DXB (8kg)", price:60, rating:4.9, reviews:210, verified:false, instant:true, kg:8, imgs:["icons/logo.png","icons/icon-512.png"] },
  { id:4, from:"JED", to:"IST", title:"JED → IST (4kg, tomorrow)", price:38, rating:4.4, reviews:51, verified:true, instant:true, kg:4, imgs:["icons/logo.png","icons/icon-192.png"] }
];

function route(v){ history.replaceState({}, "", "#"+v); render(v); }
window.addEventListener("hashchange",()=>render());
window.addEventListener("load",()=>render());

function haversine(lat1, lon1, lat2, lon2){
  const R = 6371;
  const dLat = (lat2-lat1)*Math.PI/180;
  const dLon = (lon2-lon1)*Math.PI/180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return 2*R*Math.asin(Math.sqrt(a));
}

function userDistanceFrom(item){
  if(!state.geo) return null;
  const c = CITY[item.from];
  if(!c) return null;
  return Math.round(haversine(state.geo.lat, state.geo.lon, c.lat, c.lon));
}

function card(item){
  const saved = state.saved.includes(item.id);
  const dist = userDistanceFrom(item);
  return `
  <div class="card">
    <img src="${item.imgs[0]}" alt="image">
    <div class="p">
      <div class="row" style="align-items:center;justify-content:space-between">
        <div style="font-weight:700">${item.title}</div>
        <div class="rating">★ ${item.rating}</div>
      </div>
      <div class="badges">
        ${item.verified?'<span class="badge">Verified</span>':''}
        ${item.instant?'<span class="badge">Instant</span>':''}
        <span class="badge">${item.kg}kg</span>
        <span class="badge">${item.reviews} reviews</span>
        ${dist?`<span class="badge">${dist} km away</span>`:""}
      </div>
      <div class="row" style="margin-top:8px">
        <div class="price">$ ${item.price} <span style="font-weight:400;color:#666">/ trip</span></div>
        <div class="actions" style="justify-content:flex-end">
          <button class="btn gray" onclick="toggleSave(${item.id})">${saved?'Saved':'Save'}</button>
          <button class="btn" onclick="openDetail(${item.id})">View</button>
        </div>
      </div>
    </div>
  </div>`;
}

function queryAndFilter(){
  let arr = DATA.slice();
  if(state.q) arr = arr.filter(x=>x.title.toLowerCase().includes(state.q.toLowerCase()));
  const f = state.filters;
  if(f.verified) arr = arr.filter(x=>x.verified);
  if(f.instant) arr = arr.filter(x=>x.instant);
  if(f.under5) arr = arr.filter(x=>x.kg<=5);
  arr = arr.filter(x=>x.price <= f.price);
  if(f.sort==="price") arr.sort((a,b)=>a.price-b.price);
  if(f.sort==="rating") arr.sort((a,b)=>b.rating-a.rating);
  if(f.sort==="distance" && state.geo){
    arr.sort((a,b)=>(userDistanceFrom(a)||1e9)-(userDistanceFrom(b)||1e9));
  }
  return arr;
}

function viewSearch(){
  app.innerHTML = '<div class="card skeleton" style="height:80px"></div>';
  setTimeout(()=>{
    const results = queryAndFilter();
    app.innerHTML = `
      <div class="card" style="padding:10px">
        <div class="row">
          <input id="loc" placeholder="City / Airport" value="${state.q}">
          <button class="btn" onclick="doSearch()">Search</button>
        </div>
        <div style="margin-top:8px">Guests: <b id="g">${state.guests}</b></div>
      </div>
      ${results.map(card).join('')}
    `;
  }, 250);
}

function openDetail(id){ route("detail?id="+id); }

function viewDetail(id){
  const x = DATA.find(d=>d.id===id);
  if(!x) return app.innerHTML = "<div class='card'>Not found</div>";
  const saved = state.saved.includes(x.id);
  const dist = userDistanceFrom(x);
  const imgs = x.imgs.map((u,i)=>`<img class="${i===0?'active':''}" src="${u}">`).join('');
  const dots = x.imgs.map((_,i)=>`<div class="dot" data-i="${i}"></div>`).join('');
  app.innerHTML = `
    <div class="card">
      <div class="carousel" id="car">
        <img src="${x.imgs[0]}">
      </div>
      <div class="p">
        <div class="row" style="justify-content:space-between">
          <div style="font-weight:700">${x.title}</div>
          <div class="rating">★ ${x.rating} (${x.reviews} reviews)</div>
        </div>
        <div class="badges">
          ${x.verified?'<span class="badge">Verified</span>':''}
          ${x.instant?'<span class="badge">Instant</span>':''}
          <span class="badge">${x.kg}kg</span>
          ${dist?`<span class="badge">${dist} km away</span>`:""}
        </div>
        <p class="muted">Amenities: In-app chat, ID verification, dispute support.</p>
        <div class="row">
          <button class="btn gray" onclick="toggleSave(${x.id})">${saved?'Saved':'Save'}</button>
          <button class="btn" onclick="startBooking(${x.id})">Request ($${x.price})</button>
        </div>
      </div>
    </div>
    <div class="card"><div class="p">
      <b>Reviews</b>
      <div class="badge">Clean process</div>
      <div class="badge">Friendly</div>
      <div class="badge">On time</div>
      <div class="badge">Great communication</div>
    </div></div>
  `;
}

function toggleSave(id){
  const i = state.saved.indexOf(id);
  if(i>-1) state.saved.splice(i,1); else state.saved.push(id);
  localStorage.setItem("saved", JSON.stringify(state.saved));
  render();
}

function startBooking(id){
  alert("Booking step 1 (demo). Continue with dates & payment.");
}

function viewSaved(){
  const items = DATA.filter(d=>state.saved.includes(d.id));
  app.innerHTML = items.length? items.map(card).join("") : "<div class='card' style='padding:12px'>No saved items yet.</div>";
}

function viewMap(){
  const q = encodeURIComponent(state.q||"airport");
  app.innerHTML = `
    <div class="card" style="padding:12px">
      <b>Map preview</b>
      <p class="muted">Open in Maps for "${state.q||'airports'}"</p>
      <a class="btn" href="https://www.google.com/maps/search/${q}" target="_blank">Open Maps</a>
    </div>`;
}

function viewProfile(){
  app.innerHTML = `
    <div class="card" style="padding:12px">
      <b>Profile</b>
      <div class="row" style="margin-top:8px">
        <button class="btn gray" onclick="toggleDark()">Toggle theme</button>
        <button class="btn gray" onclick="toggleCurrency()">Currency: ${state.currency}</button>
      </div>
      <div class="muted" style="margin-top:8px">Demo profile. Add auth later.</div>
    </div>`;
}

function doSearch(){
  state.q = $("#loc").value.trim();
  render();
}

function setGuests(delta){
  state.guests = Math.max(1, state.guests + delta);
  const g = $("#g"); if(g) g.textContent = state.guests;
}

function toggleCurrency(){
  state.currency = state.currency==="USD" ? "SAR" : "USD";
  $("#cur").textContent = state.currency;
  render();
}

function toggleDark(){
  state.dark = !state.dark;
  document.body.style.background = state.dark ? "#111" : "var(--bg)";
  document.body.style.color = state.dark ? "#eee" : "var(--ink)";
  render();
}

function openFilters(){ document.getElementById("sheet").classList.add("show"); }
function closeFilters(e){ if(e.target.id==="sheet") document.getElementById("sheet").classList.remove("show"); }
function applyFilters(){
  state.filters.verified = document.getElementById("f_verified").checked;
  state.filters.instant = document.getElementById("f_instant").checked;
  state.filters.under5 = document.getElementById("f_under5").checked;
  state.filters.sort = document.getElementById("sort").value;
  state.filters.price = parseInt(document.getElementById("price").value,10);
  state.filters.d1 = document.getElementById("d1").value;
  state.filters.d2 = document.getElementById("d2").value;
  document.getElementById("sheet").classList.remove("show");
  render();
}

function openDates(){
  // Already in filter sheet; open it directly for convenience
  openFilters();
}

// Geolocation
function askLocation(){
  if(!navigator.geolocation){ alert("Geolocation not supported"); return; }
  navigator.geolocation.getCurrentPosition((pos)=>{
    state.geo = { lat: pos.coords.latitude, lon: pos.coords.longitude };
    alert("Location set for distance sorting.");
    render();
  }, (err)=>{
    alert("Could not get location: "+err.message);
  }, { enableHighAccuracy:false, timeout:8000, maximumAge:60000 });
}
