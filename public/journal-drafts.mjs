// Only unsent text lives here. Submitted notes remain in the private server database.
// Namespace drafts by verified owner and stable entry ID so tabs cannot overwrite each other.
const PREFIX='chicago-public-demo-journal-unsent-v1:';
export class JournalDrafts {
 constructor(storage,owner){if(!owner)throw Error('Verify your account before recovering drafts.');this.storage=storage;this.prefix=PREFIX+owner+':';}
 save(record){if(!record.id||!record.text)return;this.storage.setItem(this.prefix+record.id,JSON.stringify({...record,updatedAt:new Date().toISOString()}));}
 list(){const rows=[];for(let i=0;i<this.storage.length;i++){const key=this.storage.key(i);if(!key?.startsWith(this.prefix))continue;try{const row=JSON.parse(this.storage.getItem(key));if(typeof row?.text==='string'&&row.text&&row.id&&key===this.prefix+row.id)rows.push(row);}catch{}}
 return rows.sort((a,b)=>(b.updatedAt||'').localeCompare(a.updatedAt||''));}
 accepted(id,receipt){
  // A receipt-only tombstone prevents a known successful send from reopening as a draft.
  this.storage.setItem(this.prefix+id,JSON.stringify({id,receipt}));
  this.storage.removeItem(this.prefix+id);
 }
 remove(id){if(id)this.storage.removeItem(this.prefix+id);}
}
export function clearJournalDrafts(storage){for(let i=storage.length-1;i>=0;i--){const key=storage.key(i);if(key?.startsWith(PREFIX))storage.removeItem(key);}}
