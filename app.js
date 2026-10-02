"use strict";
(() => {
  const config = window.GMAIL_APP_CONFIG;
  const $ = (id) => document.getElementById(id);
  const els = {
    loginBtn: $("loginBtn"), logoutBtn: $("logoutBtn"), userPill: $("userPill"),
    authStatus: $("authStatus"), authBadge: $("authBadge"),
    accountList: $("accountList"), accountCount: $("accountCount"), addAccountBtn: $("addAccountBtn"),
    inboxSubtitle: $("inboxSubtitle"), refreshBtn: $("refreshBtn"), searchInput: $("searchInput"),
    messageList: $("messageList"), messageCount: $("messageCount"),
    messageDetail: $("messageDetail"), notice: $("notice")
  };
  const state = { client:null, admin:false, user:null, accounts:[], activeAccount:null, messages:[], activeMessage:null, busy:false };
  let noticeTimer;

  function notice(message) {
    els.notice.textContent = message;
    els.notice.hidden = false;
    clearTimeout(noticeTimer);
    noticeTimer = setTimeout(() => { els.notice.hidden = true; }, 6500);
  }
  function errorMessage(error) {
    return error?.message || String(error || "Có lỗi không xác định.");
  }
  function resetMessages(text="Chưa có dữ liệu thư.") {
    state.messages=[];state.activeMessage=null;
    els.messageList.replaceChildren(makeEmpty(text));
    els.messageCount.textContent="0 thư";
    els.messageDetail.replaceChildren(makeEmpty("Chọn một thư trong danh sách để xem thông tin đã tải."));
  }
  function makeEmpty(text) { const node=document.createElement("div");node.className="empty";node.textContent=text;return node; }
  function setAuth(phase,message) {
    els.authStatus.textContent=message;
    els.authBadge.className="badge"+(phase==="ok"?" good":phase==="error"?" bad":"");
    els.authBadge.textContent=phase==="ok"?"Quản trị":phase==="error"?"Hạn chế":"Chưa đăng nhập";
    els.loginBtn.hidden=!!state.user;els.loginBtn.disabled=phase==="loading" || !state.client;
    els.logoutBtn.hidden=!state.user;els.userPill.hidden=!state.user;
    els.userPill.textContent=state.user?.email || "";
    els.addAccountBtn.disabled=!state.admin;
    els.refreshBtn.disabled=!state.admin||!state.activeAccount||state.busy;
    els.searchInput.disabled=!state.admin||!state.activeAccount;
  }
  function renderAccounts() {
    els.accountList.replaceChildren();
    els.accountCount.textContent=String(state.accounts.length);
    if (!state.accounts.length) {els.accountList.append(makeEmpty(state.admin?"Chưa có tài khoản Gmail.":"Đăng nhập để xem tài khoản."));return;}
    for(const account of state.accounts){
      const btn=document.createElement("button");btn.type="button";
      btn.className="account"+(state.activeAccount?.id===account.id?" selected":"");
      btn.disabled=!state.admin;
      const title=document.createElement("strong");title.textContent=account.email;
      const sub=document.createElement("small");sub.textContent=state.activeAccount?.id===account.id?"Đang chọn":"Nhấn để xem hộp thư";
      btn.append(title,sub);btn.addEventListener("click",()=>selectAccount(account.id));els.accountList.append(btn);
    }
  }
  async function invoke(name,body={}) {
    const {data,error}=await state.client.functions.invoke(name,{method:"POST",body});
    if(error){
      let extra="";
      try {if(error.context instanceof Response){const payload=await error.context.clone().json();extra=payload?.error?`: ${String(payload.error)}`:"";}} catch { /* ignore */ }
      throw new Error(errorMessage(error)+extra);
    }
    return data;
  }
  async function loadAccounts(){
    // Endpoint bổ sung chỉ trả metadata, không trả token. Nếu chưa triển khai,
    // phiên bản này vẫn hoạt động với tài khoản đã kiểm thử trong config.js.
    try {
      const data=await invoke("gmail-accounts");
      if(data?.success && Array.isArray(data.accounts)){
        state.accounts=data.accounts.filter(a=>a && typeof a.id==="string" && typeof a.email==="string");
      } else {throw new Error("Invalid account response");}
    }catch(error){
      state.accounts=Array.isArray(config.initialAccounts)?config.initialAccounts.filter(a=>a?.id&&a?.email):[];
      console.info("Đang dùng danh sách tài khoản ban đầu; gmail-accounts chưa sẵn sàng.");
    }
    if(state.accounts.length && !state.accounts.some(a=>a.id===state.activeAccount?.id))state.activeAccount=state.accounts[0];
    renderAccounts();
    if(state.activeAccount) await loadMessages(); else resetMessages("Chưa có tài khoản Gmail.");
  }
  async function selectAccount(id) {
    if(!state.admin)return;
    const account=state.accounts.find(a=>a.id===id);if(!account)return;
    state.activeAccount=account;renderAccounts();await loadMessages();
  }
  function renderMessages(){
    const query=els.searchInput.value.toLocaleLowerCase("vi").trim();
    const list=state.messages.filter(m=>[m.from,m.subject,m.snippet].some(v=>String(v||"").toLocaleLowerCase("vi").includes(query)));
    els.messageCount.textContent=`${list.length}/${state.messages.length} thư`;
    els.messageList.replaceChildren();
    if(!list.length){els.messageList.append(makeEmpty(query?"Không có thư phù hợp.":"Hộp thư chưa có thư được tải."));return;}
    for(const m of list){
      const btn=document.createElement("button");btn.type="button";btn.className="message"+(m.id===state.activeMessage?.id?" selected":"");
      const top=document.createElement("div");top.className="message-top";
      const sender=document.createElement("strong");sender.textContent=m.from||"(Không có người gửi)";
      const time=document.createElement("time");time.textContent=m.date||"";
      top.append(sender,time);
      const subject=document.createElement("div");subject.className="message-subject";subject.textContent=m.subject||"(Không có tiêu đề)";
      const snippet=document.createElement("div");snippet.className="snippet";snippet.textContent=m.snippet||"";
      btn.append(top,subject,snippet);btn.addEventListener("click",()=>{state.activeMessage=m;renderMessages();renderDetail();});
      els.messageList.append(btn);
    }
  }
  function renderDetail(){
    els.messageDetail.replaceChildren();const m=state.activeMessage;
    if(!m){els.messageDetail.append(makeEmpty("Chọn một thư trong danh sách."));return;}
    for(const [label,value] of [["Người gửi",m.from],["Tiêu đề",m.subject],["Ngày",m.date]]){
      const p=document.createElement("p");p.className="detail-row";
      const b=document.createElement("b");b.textContent=label+": ";p.append(b,document.createTextNode(value||"—"));els.messageDetail.append(p);
    }
    const p=document.createElement("p");p.className="detail-snippet";p.textContent=m.snippet||"Không có đoạn xem trước.";els.messageDetail.append(p);
  }
  async function loadMessages(){
    if(!state.admin||!state.activeAccount||state.busy)return;
    state.busy=true;els.refreshBtn.disabled=true;els.inboxSubtitle.textContent=`Đang tải: ${state.activeAccount.email}`;
    els.messageList.replaceChildren(makeEmpty("Đang tải 10 email gần nhất…"));
    try{
      const data=await invoke("gmail-list-messages",{account_id:state.activeAccount.id});
      if(!data?.success||!Array.isArray(data.messages))throw new Error("Dữ liệu thư không hợp lệ.");
      state.messages=data.messages;state.activeMessage=null;
      els.inboxSubtitle.textContent=`Hộp thư đến: ${data.email||state.activeAccount.email}`;
      renderMessages();renderDetail();
    }catch(error){resetMessages("Không tải được hộp thư. Kiểm tra kết nối hoặc thử lại.");els.inboxSubtitle.textContent=state.activeAccount.email;notice(`Không đọc được Gmail: ${errorMessage(error)}`);}
    finally{state.busy=false;els.refreshBtn.disabled=!state.admin;}
  }
  async function checkSession(){
    if(!state.client)return;
    const {data,error}=await state.client.auth.getSession();
    state.user=error?null:data?.session?.user||null;state.admin=false;
    if(!state.user){state.accounts=[];state.activeAccount=null;els.inboxSubtitle.textContent="Chọn một tài khoản Gmail để xem thư.";renderAccounts();resetMessages();setAuth("guest","Trạng thái: Chưa đăng nhập");return;}
    setAuth("loading","Đang kiểm tra quyền quản trị…");
    try{const result=await invoke("gmail-ai-health");if(!result?.success||result?.user_id!==state.user.id)throw new Error("Tài khoản không có quyền quản trị.");state.admin=true;setAuth("ok",`Đã đăng nhập: ${state.user.email} (Quản trị viên)`);await loadAccounts();}
    catch(error){state.admin=false;state.accounts=[];state.activeAccount=null;renderAccounts();resetMessages("Chỉ quản trị viên mới được xem Gmail.");setAuth("error",`Không xác minh được quyền quản trị: ${errorMessage(error)}`);}
  }
  async function login(){
    if(!state.client)return;els.loginBtn.disabled=true;els.authStatus.textContent="Đang chuyển đến Google…";
    const {error}=await state.client.auth.signInWithOAuth({provider:"google",options:{redirectTo:window.location.origin+window.location.pathname}});
    if(error){notice("Không thể đăng nhập: "+error.message);els.loginBtn.disabled=false;setAuth("guest","Trạng thái: Chưa đăng nhập");}
  }
  async function logout(){
    els.logoutBtn.disabled=true;try{const {error}=await state.client.auth.signOut();if(error)throw error;await checkSession();}
    catch(error){notice("Không thể đăng xuất: "+errorMessage(error));}
    finally{els.logoutBtn.disabled=false;}
  }
  async function addAccount(){
    if(!state.admin)return;
    // Mở tab đồng bộ ngay khi nhấn để tránh bị trình duyệt chặn do await.
    const tab=window.open("about:blank","_blank");
    if(tab){tab.opener=null;tab.document.title="Đang kết nối Gmail";tab.document.body.textContent="Đang chuẩn bị trang cấp quyền Google…";}
    els.addAccountBtn.disabled=true;
    try{
      const data=await invoke("gmail-oauth-start");
      if(!data?.success||!data?.authorization_url)throw new Error("Không tạo được đường dẫn kết nối.");
      // Không in URL (có state) hoặc token vào Console.
      if(tab){tab.location.replace(data.authorization_url);}
      else{window.location.assign(data.authorization_url);}
      notice("Hoàn tất cấp quyền Google. Sau đó quay lại ứng dụng và tải lại trang để cập nhật danh sách.");
    }catch(error){if(tab&&!tab.closed)tab.close();notice("Không thể kết nối Gmail: "+errorMessage(error));}
    finally{els.addAccountBtn.disabled=false;}
  }
  async function init(){
    if(!config||!config.supabaseUrl||!config.publishableKey||config.publishableKey.includes("DAN_SUPABASE_")){
      setAuth("error","Chưa cấu hình Publishable key trong config.js.");return;
    }
    if(!window.supabase?.createClient){setAuth("error","Không tải được thư viện Supabase. Kiểm tra kết nối mạng.");return;}
    state.client=window.supabase.createClient(config.supabaseUrl,config.publishableKey,{auth:{flowType:"pkce",detectSessionInUrl:true,autoRefreshToken:true,persistSession:true}});
    // Sự kiện SIGNED_IN có thể xảy ra khi quay về từ OAuth.
    state.client.auth.onAuthStateChange((event)=>{
      if(event==="SIGNED_IN"||event==="SIGNED_OUT")setTimeout(()=>{void checkSession();},0);
    });
    els.loginBtn.addEventListener("click",login);els.logoutBtn.addEventListener("click",logout);
    els.addAccountBtn.addEventListener("click",addAccount);els.refreshBtn.addEventListener("click",loadMessages);
    els.searchInput.addEventListener("input",renderMessages);
    await checkSession();
  }
  void init();
})();
