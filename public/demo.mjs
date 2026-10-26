const dialog=document.createElement('dialog');dialog.className='demo-dialog';dialog.innerHTML='<div class="demo-ticket-body"><p class="demo-ticket-label">CHICAGO / PUBLIC DEMO</p><h2 id="demo-title">Private booking</h2><p id="demo-copy"></p></div><div class="demo-ticket-action"><button type="button" data-close-demo>Back to exploring <span aria-hidden="true">↗</span></button></div>';dialog.setAttribute('aria-labelledby','demo-title');document.body.append(dialog);
let trigger;
document.addEventListener('click',e=>{
 if(e.target.closest('[data-close-demo]')){dialog.close();return;}
 if(e.target.closest('[data-clear-demo-journal]')){for(const key of Object.keys(localStorage))if(key.startsWith('chicago-public-demo-journal'))localStorage.removeItem(key);for(const key of Object.keys(sessionStorage))if(key.startsWith('chicago-public-demo-journal'))sessionStorage.removeItem(key);location.reload();return;}
 const button=e.target.closest('[data-private-document],[data-demo-about]');if(!button)return;
 trigger=button;document.querySelector('#demo-title').textContent=button.hasAttribute('data-demo-about')?'Explore the Chicago trip':'Ticket stays private.';
 document.querySelector('#demo-copy').textContent=button.hasAttribute('data-demo-about')?'This public copy keeps Friday, Saturday and Sunday from the personal Chicago planner. Accommodation identities, flight details, prices and personal documents are omitted. The journal stores only your own demo entries in this browser.':'In my app, this opens the original in my iCloud folder. Here, the booking details stay with me.';
 dialog.showModal();
});dialog.addEventListener('close',()=>trigger?.focus());
