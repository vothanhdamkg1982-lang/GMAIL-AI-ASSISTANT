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
    messageDetail: $("messageDetail"), detailPanel: $("detailPanel"), backInboxBtn: $("backInboxBtn"), notice: $("notice")
  };
  const state = { client:null, admin:false, user:null, accounts:[], activeAccount:null, messages:[], activeMessage:null, busy:false, detailSeq:0 };
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
    state.detailSeq++; els.messageDetail.replaceChildren(makeEmpty("Chọn một thư để đọc nội dung."));
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
      notice("Chưa tải được danh sách tài khoản tự động; đang dùng tài khoản đã cấu hình ban đầu.");
    }
    if(state.accounts.length && !state.accounts.some(a=>a.id===state.activeAccount?.id))state.activeAccount=state.accounts[0];
    renderAccounts();
    if(state.activeAccount) await loadMessages(); else resetMessages("Chưa có tài khoản Gmail.");
  }
  async function selectAccount(id) {
    if(!state.admin)return;
    const account=state.accounts.find(a=>a.id===id);if(!account)return;
    state.detailSeq++;state.activeAccount=account;renderAccounts();await loadMessages();
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
      btn.append(top,subject,snippet);btn.addEventListener("click",()=>{state.activeMessage=m;renderMessages();void renderDetail();els.detailPanel.scrollIntoView({behavior:"smooth",block:"start"});});
      els.messageList.append(btn);
    }
  }
  // Hiển thị thư dưới dạng node/textContent; HTML chỉ đặt trong iframe sandbox.
  async function renderDetail(){
    const seq=++state.detailSeq; const m=state.activeMessage; const account=state.activeAccount;
    els.messageDetail.replaceChildren();
    if(!m || !account){els.messageDetail.append(makeEmpty("Chọn một thư trong danh sách."));return;}
    els.messageDetail.append(makeEmpty("Đang tải nội dung thư và tệp đính kèm…"));
    try{
      const detail=await invoke("gmail-message-detail",{action:"detail",account_id:account.id,message_id:m.id});
      if(seq!==state.detailSeq || state.activeAccount?.id!==account.id)return;
      if(!detail?.success || !detail.message)throw new Error("Không lấy được nội dung thư.");
      const d=detail.message; els.messageDetail.replaceChildren();
      const subject=document.createElement("h3");subject.className="detail-subject";subject.textContent=fixText(d.subject||m.subject||"(Không có tiêu đề)");els.messageDetail.append(subject);
      const sender=document.createElement("p");sender.className="detail-row detail-meta";const strong=document.createElement("b");strong.textContent="Người gửi: ";sender.append(strong,document.createTextNode(fixText(d.from||"—")));els.messageDetail.append(sender);
      const meta=document.createElement("p");meta.className="detail-row detail-meta";meta.textContent="Ngày: "+(d.date||"—");els.messageDetail.append(meta);
      if(d.to){const rec=document.createElement("details");rec.className="recipient-details";const summary=document.createElement("summary");const count=(d.to.match(/@/g)||[]).length;summary.textContent=`Người nhận${count?` (khoảng ${count})`:""} · Xem tất cả`;const contents=document.createElement("p");contents.textContent=fixText(d.to);rec.append(summary,contents);els.messageDetail.append(rec);}
      const summaryBox=document.createElement("section");summaryBox.className="ai-summary";const heading=document.createElement("h3");heading.textContent="✦ Báo cáo tóm tắt thông minh";summaryBox.append(heading);
      const helper=document.createElement("p");helper.className="ai-disclosure";helper.textContent="Chỉ phân tích khi bạn yêu cầu. Dữ liệu email và các tệp được chọn sẽ được gửi đến Gemini API sau khi bạn xác nhận. Các tệp vượt giới hạn hoặc không đọc được sẽ được báo rõ.";summaryBox.append(helper);
      const toolbar=document.createElement("div");toolbar.className="ai-tools";const checkboxLabel=document.createElement("label");const checkbox=document.createElement("input");checkbox.type="checkbox";checkbox.checked=true;checkboxLabel.append(checkbox,document.createTextNode(" Phân tích cả tệp đính kèm (tối đa 3 tệp, 3 MB/tệp)"));
      const summarize=document.createElement("button");summarize.type="button";summarize.className="btn btn-primary";summarize.textContent="✦ Tóm tắt email và tài liệu";
      const output=document.createElement("div");output.className="ai-report";output.setAttribute("aria-live","polite");
      toolbar.append(checkboxLabel,summarize);summaryBox.append(toolbar,output);els.messageDetail.append(summaryBox);
      summarize.addEventListener("click",async()=>{
        const include=checkbox.checked;const consent=include?"Gửi nội dung email và tối đa 3 tệp đính kèm được hỗ trợ đến Gemini API để tóm tắt?":"Chỉ gửi nội dung email đến Gemini API để tóm tắt?";
        if(!window.confirm(consent))return;
        summarize.disabled=true;summarize.textContent="Đang phân tích…";output.className="ai-report ai-loading";output.textContent="Đang đọc tài liệu và tạo báo cáo. Vui lòng chờ…";
        try{const result=await invoke("gmail-ai-summary",{account_id:account.id,message_id:m.id,include_attachments:include});if(!result?.success||typeof result.report!=="string")throw Error("Dữ liệu AI không hợp lệ");if(seq!==state.detailSeq)return;
          output.className="ai-report";output.textContent=result.report+(result.cached?"\n\n[Đã sử dụng kết quả được lưu, không gọi lại AI.]":"");
          if(Array.isArray(result.warnings)&&result.warnings.length){const warns=document.createElement("p");warns.className="ai-warning";warns.textContent="Lưu ý: "+result.warnings.join(" | ");output.append(warns);}
        }catch(error){if(seq===state.detailSeq){output.className="ai-report ai-warning";output.textContent="Chưa thể tóm tắt: "+errorMessage(error);}}
        finally{summarize.disabled=false;summarize.textContent="✦ Tóm tắt email và tài liệu";}
      });
      const attachments=Array.isArray(d.attachments)?d.attachments:[];
      if(attachments.length){const h=document.createElement("h3");h.className="detail-label";h.textContent=`Tệp đính kèm (${attachments.length})`;els.messageDetail.append(h);const box=document.createElement("div");box.className="attachment-list";
        for(const attachment of attachments){const item=document.createElement("div");item.className="attachment";const label=document.createElement("span");label.className="attachment-name";label.textContent=fixText(attachment.filename||"Tệp đính kèm")+" · "+formatBytes(attachment.size);
          const button=document.createElement("button");button.className="btn btn-outline";button.type="button";button.textContent="Tải xuống";button.disabled=!attachment.attachment_id&&!attachment.inline_data;button.addEventListener("click",()=>void downloadAttachment(account.id,m.id,attachment,button));item.append(label,button);box.append(item);
        }els.messageDetail.append(box);
      }
      const original=document.createElement("details");original.className="hidden-original";const originalTitle=document.createElement("summary");originalTitle.textContent="Xem nội dung email gốc";original.append(originalTitle);
      if(d.text){const p=document.createElement("div");p.className="message-body";p.textContent=fixText(d.text);original.append(p);}
      else if(d.html){const iframe=document.createElement("iframe");iframe.className="mail-frame";iframe.title="Nội dung HTML của email";iframe.setAttribute("sandbox","");iframe.setAttribute("referrerpolicy","no-referrer");iframe.srcdoc='<!doctype html><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\'; img-src data:; font-src data:; base-uri \'none\'; form-action \'none\'">'+d.html;original.append(iframe);}
      else original.append(makeEmpty("Email không có nội dung văn bản."));els.messageDetail.append(original);
    }catch(error){if(seq===state.detailSeq){els.messageDetail.replaceChildren();const p=document.createElement("div");p.className="detail-error";p.textContent="Không đọc được nội dung thư: "+errorMessage(error);els.messageDetail.append(p);}}
  }
  function formatBytes(size){const n=Number(size)||0;return n>=1048576?(n/1048576).toFixed(1)+" MB":n>=1024?(n/1024).toFixed(1)+" KB":n+" B";}
  function fixText(value){
    const text=String(value||"");
    // Chữa dạng mojibake UTF-8 thường gặp, chỉ khi xuất hiện dấu hiệu rõ rệt.
    if(!/[ÃÂ][\u0080-\u00bf\u00a0-\u00ff]|\u00c3[\u0080-\u00ff]/.test(text))return text;
    try{const bytes=Uint8Array.from(Array.from(text,c=>c.charCodeAt(0)));const fixed=new TextDecoder("utf-8",{fatal:true}).decode(bytes);return fixed.includes("�")?text:fixed;}catch{return text;}
  }
  function decodeB64Url(value){const s=value.replace(/-/g,"+").replace(/_/g,"/");const binary=atob(s);return Uint8Array.from(binary,c=>c.charCodeAt(0));}
  async function downloadAttachment(accountId,messageId,a,button){
    button.disabled=true;button.textContent="Đang tải…";
    try{const result=await invoke("gmail-message-detail",{action:"attachment",account_id:accountId,message_id:messageId,attachment_id:a.attachment_id||null,part_id:a.part_id});
      if(!result?.success || typeof result.data!=="string")throw new Error("Không tải được tệp.");
      const bytes=decodeB64Url(result.data);const blob=new Blob([bytes],{type:result.mime_type||"application/octet-stream"});
      const url=URL.createObjectURL(blob);const link=document.createElement("a");link.href=url;link.download=String(a.filename||"attachment").replace(/[\/\\]/g,"_");document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
    }catch(error){notice("Lỗi tải tệp: "+errorMessage(error));}finally{button.disabled=false;button.textContent="Tải xuống";}
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
      renderMessages();els.messageDetail.replaceChildren(makeEmpty("Chọn một thư để đọc nội dung."));
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
    els.searchInput.addEventListener("input",renderMessages);els.backInboxBtn.addEventListener("click",()=>els.messageList.scrollIntoView({behavior:"smooth",block:"start"}));
    await checkSession();
  }
  void init();
})();
