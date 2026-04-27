import { useState, useEffect, useCallback } from "react";
import {
  Home, Search, ShoppingCart, User, Star, Clock, MapPin, Plus, Minus,
  ArrowLeft, ChefHat, Package, DollarSign, Users, LogOut, Bell,
  Settings, BarChart2, Navigation, X, Check, PlusCircle, RefreshCw
} from "lucide-react";

const BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const getToken = () => localStorage.getItem('hc_token');
const api = async (method, path, body) => {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Something went wrong');
  return data;
};

const T = {
  primary: "#FF6B35", primaryLight: "#FFF0EB",
  gold: "#F5A623", dark: "#1C100A", bg: "#FFF9F5", card: "#FFFFFF",
  muted: "#9B8A78", border: "#F0E0CF",
  success: "#22C55E", successLight: "#DCFCE7",
  warning: "#F59E0B", warningLight: "#FEF3C7",
  danger: "#EF4444",  dangerLight: "#FEE2E2",
  info: "#3B82F6",    infoLight: "#EFF6FF",
};

const S = {
  container: { maxWidth: 430, margin: "0 auto", background: T.bg, minHeight: "100vh", position: "relative", fontFamily: "'Segoe UI', -apple-system, sans-serif", overflowX: "hidden" },
  screen: { paddingBottom: 80 },
  card: { background: T.card, borderRadius: 20, border: `1px solid ${T.border}`, padding: "16px 18px", marginBottom: 12 },
  input: { width: "100%", padding: "13px 16px", borderRadius: 14, border: `1.5px solid ${T.border}`, fontSize: 15, outline: "none", background: T.card, color: T.dark, boxSizing: "border-box" },
  btn: { background: T.primary, color: "#fff", border: "none", borderRadius: 14, padding: "14px 24px", fontSize: 15, fontWeight: 700, cursor: "pointer", width: "100%", letterSpacing: 0.3 },
  btnOutline: { background: "transparent", color: T.primary, border: `2px solid ${T.primary}`, borderRadius: 14, padding: "13px 24px", fontSize: 15, fontWeight: 700, cursor: "pointer", width: "100%" },
};

const openMaps  = (addr) => { if (!addr) return; window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`, '_blank'); };

// Calculate distance & ETA using OpenStreetMap (free, no API key)
const calcRoute = async (from, to) => {
  try {
    const geo = async (addr) => {
      const r = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(addr)}&format=json&limit=1`);
      const d = await r.json();
      return d[0] ? { lat: parseFloat(d[0].lat), lon: parseFloat(d[0].lon) } : null;
    };
    const [a, b] = await Promise.all([geo(from), geo(to)]);
    if (!a || !b) return null;
    const R = 3958.8;
    const dLat = (b.lat - a.lat) * Math.PI / 180;
    const dLon = (b.lon - a.lon) * Math.PI / 180;
    const x = Math.sin(dLat/2)**2 + Math.cos(a.lat*Math.PI/180)*Math.cos(b.lat*Math.PI/180)*Math.sin(dLon/2)**2;
    const dist = R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1-x));
    return { miles: dist.toFixed(1), eta: Math.round((dist/22)*60) };
  } catch { return null; }
};

// ─── Shared UI ────────────────────────────────────────────────────
const StatusDot = ({ status }) => {
  const map = { pending:[T.warning,"Pending"], accepted:[T.info,"Accepted"], preparing:[T.info,"Preparing"], ready:[T.success,"Ready"], delivering:[T.primary,"Delivering"], delivered:[T.muted,"Delivered"], cancelled:[T.danger,"Cancelled"] };
  const [col, label] = map[status] || [T.muted, status];
  return <span style={{ display:"inline-flex", alignItems:"center", gap:5, background:col+"18", color:col, borderRadius:20, padding:"4px 10px", fontSize:11, fontWeight:700 }}><span style={{ width:6, height:6, borderRadius:"50%", background:col }}/>{label}</span>;
};

const Avatar = ({ name="?", size=40, bg=T.primaryLight }) => (
  <div style={{ width:size, height:size, borderRadius:"50%", background:bg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:size*0.35, fontWeight:700, color:T.primary, flexShrink:0 }}>
    {(name||"?").split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase()}
  </div>
);

const Spinner = () => (
  <div style={{ display:"flex", justifyContent:"center", padding:40 }}>
    <div style={{ width:32, height:32, border:`3px solid ${T.border}`, borderTopColor:T.primary, borderRadius:"50%", animation:"spin 0.8s linear infinite" }}/>
    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
  </div>
);

const TopBar = ({ title, back, action }) => (
  <div style={{ display:"flex", alignItems:"center", padding:"16px 18px 12px", gap:12, position:"sticky", top:0, background:T.bg, zIndex:10, borderBottom:`1px solid ${T.border}` }}>
    {back && <button onClick={back} style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:12, padding:"8px 10px", cursor:"pointer", display:"flex" }}><ArrowLeft size={18} color={T.dark}/></button>}
    <span style={{ flex:1, fontWeight:700, fontSize:18, color:T.dark }}>{title}</span>
    {action && <button onClick={action.fn} style={{ background:T.primaryLight, border:"none", borderRadius:12, padding:"8px 12px", cursor:"pointer", display:"flex", alignItems:"center", gap:6, color:T.primary, fontSize:13, fontWeight:600 }}>{action.icon} {action.label}</button>}
  </div>
);

// Contact buttons: SMS + Call
const ContactBtns = ({ phone, smsLabel="SMS", callLabel="Call" }) => !phone ? null : (
  <div style={{ display:"flex", gap:6, marginTop:6 }}>
    <a href={`sms:${phone}`} style={{ flex:1, background:T.warningLight, color:T.warning, borderRadius:8, padding:"6px 4px", fontSize:11, fontWeight:700, textDecoration:"none", textAlign:"center", display:"block" }}>💬 {smsLabel}</a>
    <a href={`tel:${phone}`} style={{ flex:1, background:T.infoLight, color:T.info, borderRadius:8, padding:"6px 4px", fontSize:11, fontWeight:700, textDecoration:"none", textAlign:"center", display:"block" }}>📞 {callLabel}</a>
  </div>
);

const BottomNav = ({ role, tab, setTab, cartCount }) => {
  const tabs = {
    customer: [{ id:"home", icon:<Home size={22}/>, label:"Home" }, { id:"search", icon:<Search size={22}/>, label:"Search" }, { id:"orders", icon:<Package size={22}/>, label:"Orders" }, { id:"cart", icon:<ShoppingCart size={22}/>, label:"Cart" }, { id:"profile", icon:<User size={22}/>, label:"Profile" }],
    cook:     [{ id:"dashboard", icon:<BarChart2 size={22}/>, label:"Dashboard" }, { id:"menu", icon:<ChefHat size={22}/>, label:"Menu" }, { id:"orders", icon:<Package size={22}/>, label:"Orders" }, { id:"earnings", icon:<DollarSign size={22}/>, label:"Earnings" }, { id:"profile", icon:<User size={22}/>, label:"Profile" }],
    driver:   [{ id:"home", icon:<Home size={22}/>, label:"Home" }, { id:"active", icon:<Navigation size={22}/>, label:"Active" }, { id:"history", icon:<Clock size={22}/>, label:"History" }, { id:"profile", icon:<User size={22}/>, label:"Profile" }],
    admin:    [{ id:"overview", icon:<BarChart2 size={22}/>, label:"Overview" }, { id:"users", icon:<Users size={22}/>, label:"Users" }, { id:"orders", icon:<Package size={22}/>, label:"Orders" }, { id:"settings", icon:<Settings size={22}/>, label:"Settings" }],
  };
  return (
    <div style={{ position:"fixed", bottom:0, left:"50%", transform:"translateX(-50%)", width:"100%", maxWidth:430, background:T.card, borderTop:`1px solid ${T.border}`, display:"flex", padding:"8px 0 16px", zIndex:100 }}>
      {(tabs[role]||[]).map(t => (
        <button key={t.id} onClick={() => setTab(t.id)} style={{ flex:1, background:"none", border:"none", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:3, padding:"4px 0", position:"relative" }}>
          <span style={{ color:tab===t.id ? T.primary : T.muted }}>{t.icon}</span>
          <span style={{ fontSize:10, fontWeight:600, color:tab===t.id ? T.primary : T.muted }}>{t.label}</span>
          {t.id==="cart" && cartCount>0 && <span style={{ position:"absolute", top:0, right:"calc(50% - 18px)", background:T.primary, color:"#fff", borderRadius:"50%", width:16, height:16, fontSize:9, fontWeight:800, display:"flex", alignItems:"center", justifyContent:"center" }}>{cartCount}</span>}
        </button>
      ))}
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════
   WELCOME
══════════════════════════════════════════════════════════════════ */
const WelcomeScreen = ({ onStart }) => (
  <div style={{ minHeight:"100vh", background:"linear-gradient(160deg, #1C100A 0%, #3D1F0D 50%, #FF6B35 100%)", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"space-between", padding:"60px 30px 50px" }}>
    <div style={{ textAlign:"center" }}>
      <div style={{ fontSize:72, marginBottom:16 }}>🏠</div>
      <div style={{ fontSize:40, fontWeight:900, color:"#fff", letterSpacing:-1.5 }}>HomeCook</div>
      <div style={{ color:T.gold, fontSize:15, fontWeight:600, marginTop:8, letterSpacing:2, textTransform:"uppercase" }}>Homemade, Delivered</div>
    </div>
    <div style={{ textAlign:"center", width:"100%" }}>
      <p style={{ color:"rgba(255,255,255,0.7)", fontSize:16, lineHeight:1.6, marginBottom:40 }}>Authentic homemade meals from<br/>your local community chefs.</p>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12, marginBottom:32 }}>
        {[["🍲","100+","Cuisines"],["⭐","4.8","Avg Rating"],["🚴","30min","Delivery"]].map(([e,v,l]) => (
          <div key={l} style={{ background:"rgba(255,255,255,0.1)", borderRadius:16, padding:"14px 8px" }}>
            <div style={{ fontSize:22 }}>{e}</div>
            <div style={{ color:"#fff", fontWeight:800, fontSize:16 }}>{v}</div>
            <div style={{ color:"rgba(255,255,255,0.6)", fontSize:11, fontWeight:600 }}>{l}</div>
          </div>
        ))}
      </div>
      <button onClick={onStart} style={{ ...S.btn, borderRadius:18, fontSize:16, padding:"16px", boxShadow:"0 8px 30px rgba(255,107,53,0.5)" }}>Get Started</button>
    </div>
  </div>
);

/* ══════════════════════════════════════════════════════════════════
   ROLE SELECT
══════════════════════════════════════════════════════════════════ */
const RoleSelectScreen = ({ onSelect }) => {
  const roles = [
    { id:"customer", emoji:"🛒", label:"Customer",       desc:"Order homemade food from local chefs",  color:"#FF6B35" },
    { id:"cook",     emoji:"👨‍🍳", label:"Home Chef",      desc:"Sell your homemade meals locally",      color:"#F5A623" },
    { id:"driver",   emoji:"🛵", label:"Delivery Driver", desc:"Deliver orders and earn money",         color:"#22C55E" },
    { id:"admin",    emoji:"⚙️", label:"Admin",           desc:"Manage the platform",                   color:"#3B82F6" },
  ];
  return (
    <div style={{ minHeight:"100vh", background:T.bg, padding:"50px 22px 40px" }}>
      <div style={{ textAlign:"center", marginBottom:40 }}>
        <div style={{ fontSize:36, marginBottom:10 }}>👋</div>
        <h1 style={{ fontSize:28, fontWeight:900, color:T.dark, margin:0 }}>Join HomeCook</h1>
        <p style={{ color:T.muted, fontSize:15, marginTop:8 }}>How would you like to use the app?</p>
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
        {roles.map(r => (
          <button key={r.id} onClick={() => onSelect(r.id)} style={{ background:T.card, border:`2px solid ${T.border}`, borderRadius:20, padding:"20px", cursor:"pointer", display:"flex", alignItems:"center", gap:16, textAlign:"left" }}>
            <div style={{ width:56, height:56, borderRadius:18, background:r.color+"18", display:"flex", alignItems:"center", justifyContent:"center", fontSize:28, flexShrink:0 }}>{r.emoji}</div>
            <div><div style={{ fontWeight:800, fontSize:17, color:T.dark }}>{r.label}</div><div style={{ color:T.muted, fontSize:13, marginTop:3 }}>{r.desc}</div></div>
            <div style={{ marginLeft:"auto", color:r.color, fontSize:20 }}>›</div>
          </button>
        ))}
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════
   AUTH
══════════════════════════════════════════════════════════════════ */
const AuthScreen = ({ role, onLogin, onBack }) => {
  const [mode, setMode]       = useState("login");
  const [form, setForm]       = useState({ name:"", email:"", password:"", phone:"" });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  useEffect(() => {
    const demos = { customer:"customer@demo.com", cook:"cook@demo.com", driver:"driver@demo.com", admin:"admin@demo.com" };
    setForm(f => ({ ...f, email: demos[role]||"", password:"password123" }));
  }, [role]);

  const handleSubmit = async () => {
    setError(""); setLoading(true);
    try {
      const data = mode==="login"
        ? await api('POST','/auth/login',{ email:form.email, password:form.password })
        : await api('POST','/auth/register',{ name:form.name, email:form.email, password:form.password, role, phone:form.phone });
      localStorage.setItem('hc_token', data.token);
      onLogin(data.user);
    } catch(e) { setError(e.message); } finally { setLoading(false); }
  };

  const roleEmoji = { customer:"🛒", cook:"👨‍🍳", driver:"🛵", admin:"⚙️" };
  const roleLabel = { customer:"Customer", cook:"Home Chef", driver:"Driver", admin:"Admin" };

  return (
    <div style={{ minHeight:"100vh", background:T.bg }}>
      <div style={{ background:"linear-gradient(135deg, #1C100A, #3D1F0D)", padding:"50px 24px 40px", textAlign:"center" }}>
        <div style={{ fontSize:50 }}>{roleEmoji[role]}</div>
        <h2 style={{ color:"#fff", margin:"10px 0 4px", fontWeight:800, fontSize:24 }}>{mode==="login" ? "Welcome back" : `Join as ${roleLabel[role]}`}</h2>
        <p style={{ color:"rgba(255,255,255,0.6)", fontSize:13, margin:0 }}>{mode==="login" ? "Demo: email pre-filled, password: password123" : "Create your account"}</p>
      </div>
      <div style={{ padding:"24px 22px" }}>
        {error && <div style={{ background:T.dangerLight, color:T.danger, borderRadius:12, padding:"10px 14px", marginBottom:14, fontSize:13 }}>⚠️ {error}</div>}
        {mode==="register" && (<>
          <div style={{ marginBottom:14 }}>
            <label style={{ fontSize:13, fontWeight:600, color:T.muted, display:"block", marginBottom:6 }}>FULL NAME</label>
            <input style={S.input} placeholder="Your full name" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}/>
          </div>
          <div style={{ marginBottom:14 }}>
            <label style={{ fontSize:13, fontWeight:600, color:T.muted, display:"block", marginBottom:6 }}>PHONE NUMBER</label>
            <input style={S.input} type="tel" placeholder="+1 555-0000" value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))}/>
          </div>
        </>)}
        <div style={{ marginBottom:14 }}>
          <label style={{ fontSize:13, fontWeight:600, color:T.muted, display:"block", marginBottom:6 }}>EMAIL</label>
          <input style={S.input} type="email" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))}/>
        </div>
        <div style={{ marginBottom:24 }}>
          <label style={{ fontSize:13, fontWeight:600, color:T.muted, display:"block", marginBottom:6 }}>PASSWORD</label>
          <input style={S.input} type="password" value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))}/>
        </div>
        <button onClick={handleSubmit} disabled={loading} style={{ ...S.btn, opacity:loading?0.7:1, boxShadow:"0 6px 20px rgba(255,107,53,0.35)" }}>
          {loading ? "Please wait..." : mode==="login" ? "Sign In →" : "Create Account →"}
        </button>
        <div style={{ textAlign:"center", marginTop:20, fontSize:14, color:T.muted }}>
          {mode==="login" ? "Don't have an account? " : "Already have an account? "}
          <span style={{ color:T.primary, fontWeight:700, cursor:"pointer" }} onClick={()=>setMode(m=>m==="login"?"register":"login")}>
            {mode==="login" ? "Sign Up" : "Sign In"}
          </span>
        </div>
        <div style={{ textAlign:"center", marginTop:16 }}>
          <span style={{ color:T.muted, fontSize:13, cursor:"pointer" }} onClick={onBack}>← Change role</span>
        </div>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════
   CUSTOMER HOME
══════════════════════════════════════════════════════════════════ */
const CustomerHome = ({ addToCart, onFoodSelect }) => {
  const [dishes, setDishes]   = useState([]);
  const [cats, setCats]       = useState(["All"]);
  const [cat, setCat]         = useState("All");
  const [search, setSearch]   = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [d, c] = await Promise.all([
        api('GET',`/dishes?${new URLSearchParams({...(cat!=="All"?{category:cat}:{}),...(search?{search}:{})})}`),
        api('GET','/dishes/categories')
      ]);
      setDishes(d); setCats(c);
    } catch(e) { setError(e.message); } finally { setLoading(false); }
  }, [cat, search]);

  useEffect(() => { load(); }, [load]);

  return (
    <div style={{ ...S.screen, background:T.bg }}>
      <div style={{ padding:"20px 18px 0", background:T.card, borderBottom:`1px solid ${T.border}` }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14 }}>
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:6, color:T.muted, fontSize:13, marginBottom:3 }}><MapPin size={13} color={T.primary}/> Raleigh, NC</div>
            <h2 style={{ margin:0, fontSize:22, fontWeight:900, color:T.dark }}>What's cooking <span style={{ color:T.primary }}>nearby?</span></h2>
          </div>
          <Bell size={22} color={T.dark}/>
        </div>
        <div style={{ position:"relative", marginBottom:16 }}>
          <Search size={16} style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)", color:T.muted }}/>
          <input style={{ ...S.input, paddingLeft:40, background:T.bg }} placeholder="Search dishes, cuisines, chefs..." value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>
      </div>
      <div style={{ padding:"0 0 0 18px", overflowX:"auto", whiteSpace:"nowrap", margin:"12px 0 4px", paddingBottom:8 }}>
        {cats.map(c => (
          <button key={c} onClick={()=>setCat(c)} style={{ display:"inline-block", marginRight:8, padding:"8px 16px", borderRadius:20, border:`1.5px solid ${cat===c?T.primary:T.border}`, background:cat===c?T.primary:T.card, color:cat===c?"#fff":T.muted, fontSize:13, fontWeight:600, cursor:"pointer" }}>{c}</button>
        ))}
      </div>
      <div style={{ padding:"8px 18px 0" }}>
        {loading ? <Spinner/> : error ? <div style={{ color:T.danger, padding:20, textAlign:"center", fontSize:13 }}>⚠️ {error}</div> : (
          <>
            <div style={{ fontWeight:700, fontSize:17, color:T.dark, marginBottom:12 }}>{dishes.length} dishes</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
              {dishes.map(food => (
                <div key={food._id} style={{ background:T.card, borderRadius:18, border:`1px solid ${T.border}`, overflow:"hidden", cursor:"pointer" }} onClick={()=>onFoodSelect(food)}>
                  <div style={{ background:`linear-gradient(135deg,${T.primaryLight},#fff)`, height:100, display:"flex", alignItems:"center", justifyContent:"center", fontSize:52 }}>{food.emoji||"🍲"}</div>
                  <div style={{ padding:"10px 12px 12px" }}>
                    <div style={{ fontWeight:700, fontSize:13, color:T.dark, marginBottom:2 }}>{food.name}</div>
                    <div style={{ fontSize:11, color:T.muted, marginBottom:6 }}>by {food.cook_name}</div>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                      <span style={{ fontWeight:800, fontSize:15, color:T.primary }}>${food.price}</span>
                      <div style={{ display:"flex", alignItems:"center", gap:3 }}>
                        <Star size={11} fill={T.gold} color={T.gold}/>
                        <span style={{ fontSize:11, fontWeight:700, color:T.muted }}>{food.avg_rating||"New"}</span>
                      </div>
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:4, marginTop:6 }}>
                      <Clock size={10} color={T.muted}/><span style={{ fontSize:10, color:T.muted }}>{food.prep_time}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

/* ── Food Detail ─────────────────────────────────────────────────── */
const FoodDetail = ({ food, onBack, addToCart }) => {
  const [qty, setQty] = useState(1);
  return (
    <div style={{ background:T.bg, minHeight:"100vh" }}>
      <div style={{ position:"relative" }}>
        <div style={{ background:`linear-gradient(135deg,${T.primaryLight},#FFF8F0)`, height:220, display:"flex", alignItems:"center", justifyContent:"center", fontSize:110 }}>{food.emoji||"🍲"}</div>
        <button onClick={onBack} style={{ position:"absolute", top:16, left:16, background:"rgba(255,255,255,0.9)", border:"none", borderRadius:12, padding:"8px 10px", cursor:"pointer", display:"flex" }}><ArrowLeft size={18} color={T.dark}/></button>
      </div>
      <div style={{ padding:"20px 20px 100px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
          <h2 style={{ margin:0, fontSize:24, fontWeight:900, color:T.dark, flex:1 }}>{food.name}</h2>
          <span style={{ fontWeight:900, fontSize:24, color:T.primary }}>${food.price}</span>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:16 }}>
          <span style={{ color:T.gold }}>{"★".repeat(Math.floor(food.avg_rating||0))}</span>
          <span style={{ fontSize:12, color:T.muted }}>({food.review_count||0} reviews)</span>
          <Clock size={12} color={T.muted}/><span style={{ fontSize:12, color:T.muted }}>{food.prep_time}</span>
        </div>
        <div style={{ background:T.card, borderRadius:14, padding:"12px 14px", marginBottom:16, border:`1px solid ${T.border}`, display:"flex", alignItems:"center", gap:10 }}>
          <Avatar name={food.cook_name||"Chef"} size={36}/>
          <div><div style={{ fontWeight:700, fontSize:14, color:T.dark }}>{food.cook_name}</div><div style={{ fontSize:12, color:T.muted }}>Home Chef</div></div>
        </div>
        <p style={{ color:T.muted, fontSize:14, lineHeight:1.6, marginBottom:16 }}>{food.description}</p>
        {food.ingredients?.length > 0 && (
          <div style={{ marginBottom:16 }}>
            <h4 style={{ margin:"0 0 10px", fontSize:15, fontWeight:700, color:T.dark }}>Ingredients</h4>
            <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
              {food.ingredients.map(ing=><span key={ing} style={{ background:T.bg, border:`1px solid ${T.border}`, borderRadius:20, padding:"5px 12px", fontSize:12, color:T.muted }}>{ing}</span>)}
            </div>
          </div>
        )}
        <div style={{ position:"fixed", bottom:0, left:"50%", transform:"translateX(-50%)", width:"100%", maxWidth:430, background:T.card, borderTop:`1px solid ${T.border}`, padding:"14px 20px 24px", display:"flex", gap:12, alignItems:"center" }}>
          <div style={{ display:"flex", alignItems:"center", gap:12, background:T.bg, borderRadius:14, padding:"8px 14px", border:`1px solid ${T.border}` }}>
            <button onClick={()=>setQty(q=>Math.max(1,q-1))} style={{ background:"none", border:"none", cursor:"pointer", color:T.primary, display:"flex" }}><Minus size={18}/></button>
            <span style={{ fontWeight:800, fontSize:16, minWidth:20, textAlign:"center", color:T.dark }}>{qty}</span>
            <button onClick={()=>setQty(q=>q+1)} style={{ background:"none", border:"none", cursor:"pointer", color:T.primary, display:"flex" }}><Plus size={18}/></button>
          </div>
          <button onClick={()=>{ for(let i=0;i<qty;i++) addToCart(food); onBack(); }} style={{ ...S.btn, flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:8, borderRadius:14, boxShadow:"0 6px 20px rgba(255,107,53,0.35)" }}>
            <ShoppingCart size={16}/> Add • ${(food.price*qty).toFixed(2)}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ── Cart ────────────────────────────────────────────────────────── */
const CartScreen = ({ cart, addToCart, removeFromCart, user, onOrderPlaced }) => {
  const [promo, setPromo]     = useState("");
  const [address, setAddress] = useState(user?.address||"");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const total=cart.reduce((s,i)=>s+i.price*i.qty,0), delivery=2.99, tax=total*0.08;

  const placeOrder = async () => {
    if (!address) return setError("Please enter your delivery address");
    setLoading(true); setError("");
    try {
      const data = await api('POST','/orders',{ items:cart.map(i=>({dish_id:i._id,quantity:i.qty})), address, promo_code:promo||undefined, payment_method:'cash' });
      onOrderPlaced(data.order);
    } catch(e){ setError(e.message); } finally{ setLoading(false); }
  };

  if (!cart.length) return (
    <div style={{ ...S.screen, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:"70vh", padding:40, textAlign:"center" }}>
      <div style={{ fontSize:80, marginBottom:16 }}>🛒</div>
      <h3 style={{ color:T.dark, fontWeight:800, fontSize:22, margin:"0 0 8px" }}>Your cart is empty</h3>
      <p style={{ color:T.muted }}>Browse nearby chefs and add some homemade goodness!</p>
    </div>
  );

  return (
    <div style={S.screen}>
      <TopBar title="My Cart"/>
      <div style={{ padding:"16px 18px" }}>
        {error && <div style={{ background:T.dangerLight, color:T.danger, borderRadius:12, padding:"10px 14px", marginBottom:14, fontSize:13 }}>⚠️ {error}</div>}
        {cart.map(item=>(
          <div key={item._id} style={{ ...S.card, display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ fontSize:38 }}>{item.emoji||"🍲"}</div>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:700, fontSize:14, color:T.dark }}>{item.name}</div>
              <div style={{ fontSize:12, color:T.muted }}>by {item.cook_name}</div>
              <div style={{ fontWeight:800, fontSize:15, color:T.primary, marginTop:2 }}>${(item.price*item.qty).toFixed(2)}</div>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:8, background:T.bg, borderRadius:12, padding:"6px 10px", border:`1px solid ${T.border}` }}>
              <button onClick={()=>removeFromCart(item._id)} style={{ background:"none", border:"none", cursor:"pointer", color:T.primary, display:"flex" }}><Minus size={14}/></button>
              <span style={{ fontWeight:800, fontSize:14, color:T.dark, minWidth:16, textAlign:"center" }}>{item.qty}</span>
              <button onClick={()=>addToCart(item)} style={{ background:"none", border:"none", cursor:"pointer", color:T.primary, display:"flex" }}><Plus size={14}/></button>
            </div>
          </div>
        ))}
        <div style={S.card}>
          <h4 style={{ margin:"0 0 8px", fontSize:14, fontWeight:700, color:T.dark }}>Delivery Address</h4>
          <input style={S.input} placeholder="Enter your full address" value={address} onChange={e=>setAddress(e.target.value)}/>
          {address && <span onClick={()=>openMaps(address)} style={{ cursor:"pointer", color:T.info, fontSize:12, textDecoration:"underline", display:"block", marginTop:8 }}>📍 View on Google Maps</span>}
        </div>
        <div style={S.card}>
          <h4 style={{ margin:"0 0 8px", fontSize:14, fontWeight:700, color:T.dark }}>Promo Code</h4>
          <div style={{ display:"flex", gap:8 }}>
            <input style={{ ...S.input, flex:1 }} placeholder="HOMECOOKED or WELCOME5" value={promo} onChange={e=>setPromo(e.target.value)}/>
            <button style={{ background:T.primary, color:"#fff", border:"none", borderRadius:12, padding:"10px 16px", fontSize:13, fontWeight:700, cursor:"pointer" }}>Apply</button>
          </div>
        </div>
        <div style={S.card}>
          <h4 style={{ margin:"0 0 12px", fontSize:15, fontWeight:700, color:T.dark }}>Order Summary</h4>
          {[["Subtotal",`$${total.toFixed(2)}`],["Delivery","$2.99"],[`Tax (8%)`,`$${tax.toFixed(2)}`]].map(([l,v])=>(
            <div key={l} style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
              <span style={{ fontSize:14, color:T.muted }}>{l}</span>
              <span style={{ fontSize:14, fontWeight:600, color:T.dark }}>{v}</span>
            </div>
          ))}
          <div style={{ borderTop:`1px solid ${T.border}`, paddingTop:10, display:"flex", justifyContent:"space-between" }}>
            <span style={{ fontSize:16, fontWeight:800, color:T.dark }}>Total</span>
            <span style={{ fontSize:16, fontWeight:900, color:T.primary }}>${(total+delivery+tax).toFixed(2)}</span>
          </div>
        </div>
        <button onClick={placeOrder} disabled={loading} style={{ ...S.btn, borderRadius:16, padding:"16px", fontSize:16, boxShadow:"0 8px 24px rgba(255,107,53,0.35)", marginTop:8, opacity:loading?0.7:1 }}>
          {loading ? "Placing order..." : `Place Order • $${(total+delivery+tax).toFixed(2)} →`}
        </button>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════
   ORDERS SCREEN — Privacy per role
══════════════════════════════════════════════════════════════════ */
const OrdersScreen = ({ role }) => {
  const [orders, setOrders]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");
  const steps   = ["Placed","Accepted","Preparing","Out for delivery","Delivered"];
  const stepMap = { pending:0, accepted:1, preparing:2, delivering:3, delivered:4 };

  const load = useCallback(async () => {
    setLoading(true);
    try { setOrders(await api('GET','/orders')); }
    catch(e){ setError(e.message); } finally{ setLoading(false); }
  }, []);

  useEffect(()=>{ load(); },[load]);

  const updateStatus = async (id, status) => {
    try { await api('PATCH',`/orders/${id}/status`,{status}); load(); }
    catch(e){ alert(e.message); }
  };

  return (
    <div style={S.screen}>
      <TopBar title={role==="customer" ? "My Orders" : "Incoming Orders"} action={{ fn:load, icon:<RefreshCw size={14}/>, label:"Refresh" }}/>
      <div style={{ padding:"16px 18px" }}>
        {loading ? <Spinner/> : null}
        {error ? <div style={{ color:T.danger, padding:20, textAlign:"center", fontSize:13 }}>⚠️ {error}</div> : null}
        {!loading && !orders.length && (
          <div style={{ textAlign:"center", padding:"60px 20px" }}>
            <div style={{ fontSize:60 }}>📦</div>
            <p style={{ color:T.muted, marginTop:12 }}>No orders yet.</p>
          </div>
        )}
        {orders.map(order=>(
          <div key={order._id} style={{ ...S.card, marginBottom:16 }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10 }}>
              <div style={{ flex:1, marginRight:8 }}>
                <div style={{ fontWeight:800, fontSize:14, color:T.dark }}>Order #{order._id.slice(-6).toUpperCase()}</div>
                <div style={{ fontSize:12, color:T.muted, marginTop:2 }}>{order.items?.map(i=>`${i.dish_name} ×${i.quantity}`).join(", ")}</div>

                {/* ── CUSTOMER: Cook name + Driver name/phone ── */}
                {role==="customer" && (
                  <div style={{ marginTop:8 }}>
                    {order.cook_name && <div style={{ fontSize:12, color:T.muted, marginBottom:6 }}>👨‍🍳 Chef: <b style={{ color:T.dark }}>{order.cook_name}</b></div>}
                    {order.address && <span onClick={()=>openMaps(order.address)} style={{ cursor:"pointer", color:T.info, fontSize:11, textDecoration:"underline", display:"block", marginBottom:6 }}>📍 {order.address}</span>}
                    {order.driver_name && (
                      <div style={{ background:T.successLight, borderRadius:12, padding:"8px 10px" }}>
                        <div style={{ fontSize:12, color:T.success, fontWeight:700, marginBottom:4 }}>🛵 Driver: {order.driver_name}</div>
                        <ContactBtns phone={order.driver_phone} smsLabel="SMS Driver" callLabel="Call Driver"/>
                      </div>
                    )}
                  </div>
                )}

                {/* ── COOK: Customer name + address only (no phone) ── */}
                {role==="cook" && (
                  <div style={{ marginTop:8 }}>
                    {order.customer_name && (
                      <div style={{ background:T.primaryLight, borderRadius:12, padding:"8px 10px", marginBottom:6 }}>
                        <div style={{ fontSize:12, color:T.primary, fontWeight:700 }}>🛒 Customer: {order.customer_name}</div>
                        {order.address && <span onClick={()=>openMaps(order.address)} style={{ cursor:"pointer", color:T.info, fontSize:11, textDecoration:"underline", display:"block", marginTop:3 }}>📍 {order.address}</span>}
                      </div>
                    )}
                    {order.driver_name && (
                      <div style={{ background:T.successLight, borderRadius:12, padding:"8px 10px" }}>
                        <div style={{ fontSize:12, color:T.success, fontWeight:700 }}>🛵 Driver: {order.driver_name}</div>
                      </div>
                    )}
                  </div>
                )}

                {/* ── DRIVER in orders list ── */}
                {role==="driver" && order.address && (
                  <span onClick={()=>openMaps(order.address)} style={{ cursor:"pointer", color:T.info, fontSize:11, textDecoration:"underline", display:"block", marginTop:4 }}>📍 {order.address}</span>
                )}
              </div>
              <StatusDot status={order.status}/>
            </div>

            {role==="customer" && order.status==="delivering" && (
              <div style={{ background:T.successLight, borderRadius:12, padding:"8px 14px", marginBottom:10 }}>
                <div style={{ fontSize:12, color:T.success, fontWeight:700 }}>🛵 On the way!</div>
              </div>
            )}

            {role==="customer" && order.status!=="delivered" && order.status!=="cancelled" && (
              <div style={{ marginBottom:10 }}>
                {steps.map((step,i)=>(
                  <div key={step} style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <div style={{ display:"flex", flexDirection:"column", alignItems:"center" }}>
                      <div style={{ width:20, height:20, borderRadius:"50%", background:i<=(stepMap[order.status]||0)?T.primary:T.border, display:"flex", alignItems:"center", justifyContent:"center" }}>
                        {i<=(stepMap[order.status]||0) && <Check size={11} color="#fff"/>}
                      </div>
                      {i<steps.length-1 && <div style={{ width:2, height:16, background:i<(stepMap[order.status]||0)?T.primary:T.border }}/>}
                    </div>
                    <span style={{ fontSize:12, color:i<=(stepMap[order.status]||0)?T.dark:T.muted }}>{step}</span>
                  </div>
                ))}
              </div>
            )}

            {role==="cook" && (
              <div style={{ display:"flex", gap:8, marginTop:8 }}>
                {order.status==="pending" && <>
                  <button onClick={()=>updateStatus(order._id,"cancelled")} style={{ background:T.dangerLight, border:"none", borderRadius:10, padding:"7px 14px", color:T.danger, fontSize:12, fontWeight:700, cursor:"pointer", flex:1 }}><X size={12}/> Reject</button>
                  <button onClick={()=>updateStatus(order._id,"accepted")} style={{ background:T.primaryLight, border:"none", borderRadius:10, padding:"7px 14px", color:T.primary, fontSize:12, fontWeight:700, cursor:"pointer", flex:2 }}><Check size={12}/> Accept</button>
                </>}
                {order.status==="accepted"  && <button onClick={()=>updateStatus(order._id,"preparing")} style={{ background:T.infoLight, border:"none", borderRadius:10, padding:"8px 16px", color:T.info, fontSize:12, fontWeight:700, cursor:"pointer", width:"100%" }}>Start Preparing</button>}
                {order.status==="preparing" && <button onClick={()=>updateStatus(order._id,"ready")} style={{ background:T.successLight, border:"none", borderRadius:10, padding:"8px 16px", color:T.success, fontSize:12, fontWeight:700, cursor:"pointer", width:"100%" }}>Mark Ready ✓</button>}
              </div>
            )}
            {role==="driver" && order.status==="ready" && !order.driver_id && (
              <button onClick={()=>updateStatus(order._id,"delivering")} style={{ ...S.btn, marginTop:8, padding:"10px", fontSize:13, borderRadius:12 }}>Accept Delivery</button>
            )}
            {role==="driver" && order.status==="delivering" && order.driver_id && (
              <button onClick={()=>updateStatus(order._id,"delivered")} style={{ background:T.success, color:"#fff", border:"none", borderRadius:12, padding:"10px", fontSize:13, fontWeight:700, cursor:"pointer", width:"100%", marginTop:8 }}>✓ Mark Delivered</button>
            )}
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", paddingTop:10, borderTop:`1px solid ${T.border}`, marginTop:8 }}>
              <span style={{ fontSize:14, fontWeight:800, color:T.primary }}>${order.total?.toFixed(2)}</span>
              <span style={{ fontSize:11, color:T.muted }}>{new Date(order.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ── Cook Dashboard ──────────────────────────────────────────────── */
const CookDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(()=>{ api('GET','/users/cook/stats').then(setStats).catch(console.error).finally(()=>setLoading(false)); },[]);
  return (
    <div style={S.screen}>
      <div style={{ padding:"20px 18px", background:"linear-gradient(135deg, #1C100A, #3D1F0D)" }}>
        <h2 style={{ color:"#fff", margin:"0 0 16px", fontWeight:900, fontSize:22 }}>Chef Dashboard 👨‍🍳</h2>
        {loading ? <Spinner/> : stats && (
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
            {[[`$${stats.today?.earnings||0}`,"Today"],[stats.today?.orders||0,"Orders"],[`${stats.rating?.avg||0}★`,"Rating"]].map(([v,l])=>(
              <div key={l} style={{ background:"rgba(255,255,255,0.1)", borderRadius:14, padding:"12px 10px", textAlign:"center" }}>
                <div style={{ color:"#fff", fontWeight:900, fontSize:18 }}>{v}</div>
                <div style={{ color:"rgba(255,255,255,0.6)", fontSize:11, fontWeight:600 }}>{l}</div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div style={{ padding:"16px 18px" }}>
        <h3 style={{ margin:"0 0 12px", fontWeight:800, fontSize:17, color:T.dark }}>Manage Orders</h3>
        <OrdersScreen role="cook"/>
      </div>
    </div>
  );
};

/* ── Cook Menu ───────────────────────────────────────────────────── */
const CookMenu = ({ user }) => {
  const [dishes, setDishes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name:"", price:"", category:"North African", description:"", emoji:"🍲", ingredients:"", prep_time:"30 min" });
  const [saving, setSaving] = useState(false);

  const load = () => { setLoading(true); api('GET',`/dishes?cook_id=${user?._id||user?.id}`).then(setDishes).catch(console.error).finally(()=>setLoading(false)); };
  useEffect(load, []); // eslint-disable-line

  const saveDish = async () => {
    setSaving(true);
    try {
      await api('POST','/dishes',{ ...form, price:parseFloat(form.price), ingredients:form.ingredients.split(',').map(s=>s.trim()) });
      setAdding(false); setForm({ name:"", price:"", category:"North African", description:"", emoji:"🍲", ingredients:"", prep_time:"30 min" }); load();
    } catch(e){ alert(e.message); } finally{ setSaving(false); }
  };

  return (
    <div style={S.screen}>
      <TopBar title="My Menu" action={{ fn:()=>setAdding(true), icon:<PlusCircle size={16}/>, label:"Add Dish" }}/>
      {adding && (
        <div style={{ padding:"16px 18px", background:T.infoLight, borderBottom:`1px solid ${T.border}` }}>
          <h4 style={{ margin:"0 0 14px", fontWeight:700, color:T.dark }}>Add New Dish</h4>
          {[["Dish Name","name","e.g. Harira Soup"],["Price ($)","price","e.g. 9.99"],["Emoji","emoji","🍲"],["Prep Time","prep_time","30 min"],["Ingredients (comma separated)","ingredients","Lamb, Onion, Spices"],["Description","description","Describe your dish..."]].map(([l,k,ph])=>(
            <div key={k} style={{ marginBottom:10 }}>
              <label style={{ fontSize:12, color:T.muted, fontWeight:600, display:"block", marginBottom:4 }}>{l}</label>
              <input style={S.input} placeholder={ph} value={form[k]} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))}/>
            </div>
          ))}
          <div style={{ marginBottom:10 }}>
            <label style={{ fontSize:12, color:T.muted, fontWeight:600, display:"block", marginBottom:4 }}>CATEGORY</label>
            <select style={{ ...S.input }} value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))}>
              {["North African","Indian","Italian","Chinese","Caribbean","Mexican","Sweets","Other"].map(c=><option key={c}>{c}</option>)}
            </select>
          </div>
          <div style={{ display:"flex", gap:10 }}>
            <button onClick={()=>setAdding(false)} style={{ ...S.btnOutline, flex:1, padding:"11px", fontSize:13, borderRadius:12 }}>Cancel</button>
            <button onClick={saveDish} disabled={saving} style={{ ...S.btn, flex:2, padding:"11px", fontSize:13, borderRadius:12, opacity:saving?0.7:1 }}>{saving?"Saving...":"Save Dish"}</button>
          </div>
        </div>
      )}
      <div style={{ padding:"16px 18px" }}>
        {loading ? <Spinner/> : dishes.map(dish=>(
          <div key={dish._id} style={{ ...S.card, display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ fontSize:36 }}>{dish.emoji||"🍲"}</div>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:700, fontSize:14, color:T.dark }}>{dish.name}</div>
              <div style={{ fontSize:12, color:T.muted }}>{dish.category} • ${dish.price}</div>
            </div>
            <button onClick={()=>{ api('PUT',`/dishes/${dish._id}`,{is_available:!dish.is_available}).then(load); }} style={{ background:dish.is_available?T.successLight:T.dangerLight, border:"none", borderRadius:10, padding:"6px 12px", cursor:"pointer", fontSize:11, fontWeight:700, color:dish.is_available?T.success:T.danger }}>
              {dish.is_available ? "Active" : "Paused"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ── Admin Overview ──────────────────────────────────────────────── */
const AdminOverview = () => {
  const [stats, setStats] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(()=>{
    Promise.all([api('GET','/users/admin/stats'),api('GET','/orders')])
      .then(([s,o])=>{ setStats(s); setOrders(o.slice(0,5)); })
      .catch(console.error).finally(()=>setLoading(false));
  },[]);
  return (
    <div style={S.screen}>
      <div style={{ padding:"20px 18px", background:"linear-gradient(135deg, #0F1D4A, #1A3799)" }}>
        <h2 style={{ color:"#fff", margin:"0 0 16px", fontWeight:900, fontSize:22 }}>HomeCook HQ ⚙️</h2>
        {loading ? <Spinner/> : stats && (
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            {[["👥",stats.total_users,"Users"],["👨‍🍳",stats.total_cooks,"Chefs"],["🛵",stats.total_drivers,"Drivers"],["📦",stats.total_orders,"Orders"]].map(([e,v,l])=>(
              <div key={l} style={{ background:"rgba(255,255,255,0.1)", borderRadius:14, padding:"14px 12px" }}>
                <div style={{ fontSize:22 }}>{e}</div>
                <div style={{ color:"#fff", fontWeight:900, fontSize:20, marginTop:4 }}>{v}</div>
                <div style={{ color:"rgba(255,255,255,0.6)", fontSize:11, fontWeight:600 }}>{l}</div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div style={{ padding:"16px 18px" }}>
        {stats && (
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:16 }}>
            <div style={{ background:T.successLight, borderRadius:14, padding:"16px" }}>
              <div style={{ fontSize:11, color:T.success, fontWeight:700, marginBottom:4 }}>TOTAL REVENUE</div>
              <div style={{ fontSize:22, fontWeight:900, color:"#166534" }}>${stats.total_revenue?.toFixed(2)||"0.00"}</div>
            </div>
            <div style={{ background:T.warningLight, borderRadius:14, padding:"16px" }}>
              <div style={{ fontSize:11, color:T.warning, fontWeight:700, marginBottom:4 }}>PENDING COOKS</div>
              <div style={{ fontSize:22, fontWeight:900, color:"#92400E" }}>{stats.pending_cooks||0}</div>
            </div>
          </div>
        )}
        <h3 style={{ margin:"0 0 12px", fontWeight:800, fontSize:17, color:T.dark }}>Recent Orders</h3>
        {orders.map(order=>(
          <div key={order._id} style={{ ...S.card, display:"flex", alignItems:"center", gap:12, marginBottom:8 }}>
            <Avatar name={order.customer_name||"?"} size={38} bg={T.infoLight}/>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:700, fontSize:13, color:T.dark }}>#{order._id.slice(-6).toUpperCase()}</div>
              <div style={{ fontSize:11, color:T.muted }}>{order.customer_name} → {order.cook_name}</div>
            </div>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontWeight:800, color:T.primary, fontSize:13 }}>${order.total?.toFixed(2)}</div>
              <StatusDot status={order.status}/>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════
   DRIVER HOME — Clean organized layout
══════════════════════════════════════════════════════════════════ */
const DriverHome = () => {
  const [stats, setStats]     = useState(null);
  const [online, setOnline]   = useState(true);
  const [loading, setLoading] = useState(true);
  const [route, setRoute]     = useState(null);
  const [routeLoading, setRouteLoading] = useState(false);

  const load = () => { api('GET','/users/driver/stats').then(setStats).catch(console.error).finally(()=>setLoading(false)); };
  useEffect(load, []);

  useEffect(() => {
    if (stats?.active_delivery?.cook_address && stats?.active_delivery?.address) {
      setRouteLoading(true);
      calcRoute(stats.active_delivery.cook_address, stats.active_delivery.address)
        .then(r => { setRoute(r); setRouteLoading(false); });
    }
  }, [stats?.active_delivery?._id]); // eslint-disable-line

  const acceptJob     = async (id) => { try { await api('PATCH',`/orders/${id}/status`,{status:'delivering'}); load(); } catch(e){ alert(e.message); } };
  const markDelivered = async (id) => { try { await api('PATCH',`/orders/${id}/status`,{status:'delivered'});  load(); } catch(e){ alert(e.message); } };

  const d = stats?.active_delivery;

  return (
    <div style={S.screen}>
      {/* Header */}
      <div style={{ padding:"20px 18px", background:"linear-gradient(135deg, #0F2E1C, #1E6B38)" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
          <h2 style={{ color:"#fff", margin:0, fontWeight:900, fontSize:22 }}>Driver Dashboard 🛵</h2>
          <button onClick={()=>setOnline(o=>!o)} style={{ background:online?T.success:T.danger, border:"none", borderRadius:20, padding:"8px 16px", color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer" }}>
            {online?"● Online":"○ Offline"}
          </button>
        </div>
        {!loading && stats && (
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            {[[`$${stats.today?.earnings||0}`,"Today's Earnings"],[stats.today?.deliveries||0,"Deliveries Today"]].map(([v,l])=>(
              <div key={l} style={{ background:"rgba(255,255,255,0.1)", borderRadius:14, padding:"12px 10px", textAlign:"center" }}>
                <div style={{ color:"#fff", fontWeight:900, fontSize:20 }}>{v}</div>
                <div style={{ color:"rgba(255,255,255,0.6)", fontSize:11, fontWeight:600 }}>{l}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ padding:"16px 18px" }}>
        {loading ? <Spinner/> : (<>

          {/* ══════════════════════════════════════════════
              ACTIVE DELIVERY — Clean Uber-like layout
          ══════════════════════════════════════════════ */}
          {d && (
            <div style={{ ...S.card, border:`2px solid ${T.primary}`, marginBottom:16 }}>
              <div style={{ fontSize:12, color:T.primary, fontWeight:800, marginBottom:14, display:"flex", alignItems:"center", gap:6 }}>
                <span style={{ width:8, height:8, borderRadius:"50%", background:T.danger, display:"inline-block" }}/>
                ACTIVE DELIVERY
              </div>

              {/* ─── COOK (Pickup) ─── */}
              <div style={{ background:T.warningLight, borderRadius:14, padding:"12px 14px", marginBottom:10 }}>
                <div style={{ fontSize:10, fontWeight:800, color:"#92400E", letterSpacing:1, marginBottom:8 }}>🍳 PICKUP — CHEF</div>
                <div style={{ fontSize:15, fontWeight:700, color:T.dark, marginBottom:4 }}>
                  {d.cook_name || "Chef"}
                </div>
                <span onClick={()=>openMaps(d.cook_address)} style={{ cursor:"pointer", color:T.warning, fontSize:13, textDecoration:"underline", display:"block", marginBottom:8 }}>
                  📍 {d.cook_address || "Address not set"}
                </span>
                {d.cook_phone && (
                  <>
                    <div style={{ fontSize:12, color:"#92400E", marginBottom:6 }}>📞 {d.cook_phone}</div>
                    <ContactBtns phone={d.cook_phone} smsLabel="SMS Chef" callLabel="Call Chef"/>
                  </>
                )}
              </div>

              {/* ─── CUSTOMER (Dropoff) ─── */}
              <div style={{ background:T.infoLight, borderRadius:14, padding:"12px 14px", marginBottom:12 }}>
                <div style={{ fontSize:10, fontWeight:800, color:"#1e40af", letterSpacing:1, marginBottom:8 }}>📍 DROPOFF — CUSTOMER</div>
                <div style={{ fontSize:15, fontWeight:700, color:T.dark, marginBottom:4 }}>
                  {d.customer_name || "Customer"}
                </div>
                <span onClick={()=>openMaps(d.address)} style={{ cursor:"pointer", color:T.info, fontSize:13, textDecoration:"underline", display:"block", marginBottom:8 }}>
                  📍 {d.address}
                </span>
                {d.customer_phone && (
                  <>
                    <div style={{ fontSize:12, color:"#1e40af", marginBottom:6 }}>📞 {d.customer_phone}</div>
                    <ContactBtns phone={d.customer_phone} smsLabel="SMS Customer" callLabel="Call Customer"/>
                  </>
                )}
              </div>

              {/* ─── ETA + Distance ─── */}
              {routeLoading && (
                <div style={{ background:T.infoLight, borderRadius:12, padding:"10px", marginBottom:10, textAlign:"center", fontSize:12, color:T.info }}>
                  📡 Calculating route...
                </div>
              )}
              {route && (
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:12 }}>
                  <div style={{ background:T.successLight, borderRadius:12, padding:"12px", textAlign:"center" }}>
                    <div style={{ fontSize:24, fontWeight:900, color:T.success }}>{route.eta} min</div>
                    <div style={{ fontSize:11, color:"#166534", fontWeight:600 }}>Estimated ETA</div>
                  </div>
                  <div style={{ background:T.infoLight, borderRadius:12, padding:"12px", textAlign:"center" }}>
                    <div style={{ fontSize:24, fontWeight:900, color:T.info }}>{route.miles} mi</div>
                    <div style={{ fontSize:11, color:"#1e40af", fontWeight:600 }}>Distance</div>
                  </div>
                </div>
              )}

              {/* ─── Mark Delivered ─── */}
              <button onClick={()=>markDelivered(d._id)} style={{ background:T.successLight, border:"none", borderRadius:12, padding:"12px", color:T.success, fontSize:14, fontWeight:700, cursor:"pointer", width:"100%" }}>
                ✓ Mark Delivered
              </button>
            </div>
          )}

          {/* ══════════════════════════════════════════════
              AVAILABLE JOBS
          ══════════════════════════════════════════════ */}
          <h3 style={{ margin:"0 0 12px", fontWeight:800, fontSize:17, color:T.dark }}>
            {online ? `Available Jobs (${stats?.available_jobs?.length||0})` : "Go online to see jobs"}
          </h3>

          {online && stats?.available_jobs?.map(job=>(
            <div key={job._id} style={S.card}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:12 }}>
                <span style={{ fontWeight:800, color:T.dark, fontSize:14 }}>#{job._id.slice(-6).toUpperCase()}</span>
                <span style={{ fontWeight:900, color:T.success, fontSize:16 }}>+${(job.delivery_fee*0.85).toFixed(2)}</span>
              </div>

              {/* Pickup */}
              <div style={{ background:T.warningLight, borderRadius:12, padding:"10px 12px", marginBottom:8 }}>
                <div style={{ fontSize:10, fontWeight:800, color:"#92400E", letterSpacing:1, marginBottom:4 }}>🍳 PICKUP</div>
                <span onClick={()=>openMaps(job.cook_address)} style={{ cursor:"pointer", color:T.warning, fontSize:12, textDecoration:"underline" }}>
                  📍 {job.cook_address || "Not set"}
                </span>
              </div>

              {/* Dropoff */}
              <div style={{ background:T.infoLight, borderRadius:12, padding:"10px 12px", marginBottom:10 }}>
                <div style={{ fontSize:10, fontWeight:800, color:"#1e40af", letterSpacing:1, marginBottom:4 }}>📍 DROPOFF</div>
                <span onClick={()=>openMaps(job.address)} style={{ cursor:"pointer", color:T.info, fontSize:12, textDecoration:"underline" }}>
                  📍 {job.address}
                </span>
              </div>

              <button onClick={()=>acceptJob(job._id)} style={{ ...S.btn, padding:"10px", fontSize:13, borderRadius:12 }}>
                Accept Delivery
              </button>
            </div>
          ))}

        </>)}
      </div>
    </div>
  );
};

/* ── Profile ─────────────────────────────────────────────────────── */
const ProfileScreen = ({ user, onLogout }) => (
  <div style={S.screen}>
    <TopBar title="Profile"/>
    <div style={{ padding:"20px 18px" }}>
      <div style={{ ...S.card, display:"flex", alignItems:"center", gap:16, marginBottom:20 }}>
        <Avatar name={user?.name||"?"} size={60}/>
        <div style={{ flex:1 }}>
          <div style={{ fontWeight:800, fontSize:18, color:T.dark }}>{user?.name||"User"}</div>
          <div style={{ fontSize:13, color:T.muted }}>{user?.email}</div>
          {user?.phone && <div style={{ fontSize:13, color:T.muted }}>📞 {user.phone}</div>}
          <span style={{ background:T.primaryLight, color:T.primary, borderRadius:20, padding:"3px 10px", fontSize:11, fontWeight:700, marginTop:4, display:"inline-block" }}>{user?.role}</span>
        </div>
      </div>
      {[["🏠","My Addresses"],["💳","Payment Methods"],["🔔","Notifications"],["❓","Help & Support"]].map(([e,l])=>(
        <div key={l} style={{ ...S.card, display:"flex", alignItems:"center", gap:14, cursor:"pointer", marginBottom:8 }}>
          <span style={{ fontSize:20 }}>{e}</span>
          <span style={{ flex:1, fontWeight:600, fontSize:14, color:T.dark }}>{l}</span>
          <span style={{ color:T.border, fontSize:18 }}>›</span>
        </div>
      ))}
      <button onClick={onLogout} style={{ ...S.btnOutline, display:"flex", alignItems:"center", justifyContent:"center", gap:8, marginTop:20, borderRadius:14 }}>
        <LogOut size={16}/> Sign Out
      </button>
    </div>
  </div>
);

/* ══════════════════════════════════════════════════════════════════
   MAIN APP
══════════════════════════════════════════════════════════════════ */
export default function App() {
  const [screen, setScreen]   = useState("welcome");
  const [role, setRole]       = useState(null);
  const [user, setUser]       = useState(null);
  const [tab, setTab]         = useState("home");
  const [cart, setCart]       = useState([]);
  const [selectedFood, setSelectedFood] = useState(null);
  const cartCount = cart.reduce((s,i)=>s+i.qty,0);

  useEffect(()=>{
    const token = localStorage.getItem('hc_token');
    if (token) {
      api('GET','/auth/me').then(u=>{
        setUser(u); setRole(u.role);
        setTab({customer:"home",cook:"dashboard",driver:"home",admin:"overview"}[u.role]);
        setScreen("app");
      }).catch(()=>localStorage.removeItem('hc_token'));
    }
  },[]);

  const addToCart = (food) => setCart(prev=>{
    const ex=prev.find(i=>i._id===food._id);
    if(ex) return prev.map(i=>i._id===food._id?{...i,qty:i.qty+1}:i);
    return [...prev,{...food,qty:1}];
  });
  const removeFromCart = (id) => setCart(prev=>{
    const ex=prev.find(i=>i._id===id);
    if(!ex) return prev;
    if(ex.qty===1) return prev.filter(i=>i._id!==id);
    return prev.map(i=>i._id===id?{...i,qty:i.qty-1}:i);
  });

  const handleLogin  = (u) => { setUser(u); setRole(u.role); setTab({customer:"home",cook:"dashboard",driver:"home",admin:"overview"}[u.role]); setScreen("app"); };
  const handleLogout = ()  => { localStorage.removeItem('hc_token'); setScreen("welcome"); setRole(null); setUser(null); setCart([]); setSelectedFood(null); };
  const handleOrderPlaced = () => { setCart([]); setTab("orders"); };

  if (screen==="welcome")    return <div style={S.container}><WelcomeScreen onStart={()=>setScreen("roleSelect")}/></div>;
  if (screen==="roleSelect") return <div style={S.container}><RoleSelectScreen onSelect={r=>{setRole(r);setScreen("auth");}}/></div>;
  if (screen==="auth")       return <div style={S.container}><AuthScreen role={role} onLogin={handleLogin} onBack={()=>setScreen("roleSelect")}/></div>;
  if (selectedFood)          return <div style={S.container}><FoodDetail food={selectedFood} addToCart={addToCart} onBack={()=>setSelectedFood(null)}/></div>;

  const renderTab = () => {
    if (role==="customer") {
      if (tab==="home")      return <CustomerHome addToCart={addToCart} onFoodSelect={setSelectedFood}/>;
      if (tab==="search")    return <CustomerHome addToCart={addToCart} onFoodSelect={setSelectedFood}/>;
      if (tab==="orders")    return <OrdersScreen role="customer"/>;
      if (tab==="cart")      return <CartScreen cart={cart} addToCart={addToCart} removeFromCart={removeFromCart} user={user} onOrderPlaced={handleOrderPlaced}/>;
      if (tab==="profile")   return <ProfileScreen user={user} onLogout={handleLogout}/>;
    }
    if (role==="cook") {
      if (tab==="dashboard") return <CookDashboard/>;
      if (tab==="menu")      return <CookMenu user={user}/>;
      if (tab==="orders")    return <OrdersScreen role="cook"/>;
      if (tab==="earnings")  return <div style={S.screen}><TopBar title="Earnings"/><div style={{padding:"16px 18px"}}><p style={{color:T.muted}}>Earnings coming soon...</p></div></div>;
      if (tab==="profile")   return <ProfileScreen user={user} onLogout={handleLogout}/>;
    }
    if (role==="driver") {
      if (tab==="home")      return <DriverHome/>;
      if (tab==="active")    return <OrdersScreen role="driver"/>;
      if (tab==="history")   return <OrdersScreen role="driver"/>;
      if (tab==="profile")   return <ProfileScreen user={user} onLogout={handleLogout}/>;
    }
    if (role==="admin") {
      if (tab==="overview")  return <AdminOverview/>;
      if (tab==="users")     return <div style={S.screen}><TopBar title="Users"/><div style={{padding:"16px 18px"}}><p style={{color:T.muted}}>User management coming soon...</p></div></div>;
      if (tab==="orders")    return <OrdersScreen role="admin"/>;
      if (tab==="settings")  return <ProfileScreen user={user} onLogout={handleLogout}/>;
    }
  };

  return (
    <div style={S.container}>
      {renderTab()}
      <BottomNav role={role} tab={tab} setTab={setTab} cartCount={cartCount}/>
    </div>
  );
}
