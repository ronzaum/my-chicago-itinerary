// Google supplies the basemap. Trip overlays use a small, explicit runtime API.
// Every new attempt obtains authenticated configuration; no key enters preview data.
export async function fetchGoogleConfig({signal}={}) {
  const timeout=new AbortController();
  const cancel=()=>timeout.abort();
  signal?.addEventListener('abort',cancel,{once:true});
  const timer=setTimeout(cancel,12000);
  try {
    if(signal?.aborted)throw Error('Map attempt cancelled');
    const response=await fetch('./map-config.json',{cache:'no-store',signal:timeout.signal});
    if(!response.ok)throw Error('Google Maps configuration unavailable');
    const config=await response.json();
    if(!config.googleMapsKey)throw Error('Google Maps is not configured');
    return config;
  } finally {clearTimeout(timer);signal?.removeEventListener('abort',cancel)}
}
let loadedKey,sequence=0;
export async function loadGoogleRuntime(key,{signal}={}) {
  if(!key)throw Error('Google Maps key is missing');
  if(signal?.aborted)throw Error('Map attempt cancelled');
  if(loadedKey===key&&window.google?.maps?.Map)return makeRuntime(window.google.maps);
  return new Promise((resolve,reject)=>{
    const callback='__chicagoMapsReady'+(++sequence);
    const script=document.createElement('script');
    let settled=false;
    const previousAuth=window.gm_authFailure;
    const finish=error=>{
      if(settled)return;settled=true;
      clearTimeout(timer);script.onerror=null;script.remove();
      signal?.removeEventListener('abort',cancel);
      delete window[callback];
      if(window.gm_authFailure===authFailure)window.gm_authFailure=previousAuth;
      if(error){loadedKey=null;reject(error)}
      else{loadedKey=key;resolve(makeRuntime(window.google.maps))}
    };
    const cancel=()=>finish(Error('Map attempt cancelled'));
    const authFailure=()=>finish(Error('Google Maps authentication failed'));
    const timer=setTimeout(()=>finish(Error('Google Maps timed out')),12000);
    window[callback]=()=>finish(window.google?.maps?.Map?null:Error('Google Maps did not initialize'));
    window.gm_authFailure=authFailure;
    signal?.addEventListener('abort',cancel,{once:true});
    script.onerror=()=>finish(Error('Google Maps script failed'));
    script.src=`https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&loading=async&callback=${callback}&v=weekly`;
    script.async=true;document.head.append(script);
  });
}

const darkStyle = [
  {elementType:'geometry',stylers:[{color:'#1b1b1b'}]},
  {elementType:'labels.text.fill',stylers:[{color:'#d6d6d6'}]},
  {elementType:'labels.text.stroke',stylers:[{color:'#1b1b1b'}]},
  {featureType:'road',elementType:'geometry',stylers:[{color:'#3a3a3a'}]},
  {featureType:'water',elementType:'geometry',stylers:[{color:'#102a40'}]},
  {featureType:'poi.park',elementType:'geometry',stylers:[{color:'#203024'}]}
];

export function makeRuntime(g) {
  const ll = value => Array.isArray(value) ? {lat:value[0],lng:value[1]} : value;
  const world = (point, zoom) => {
    const latitude = Math.max(-85, Math.min(85, point.lat)) * Math.PI / 180;
    const scale = 256 * 2 ** zoom;
    return {x:(point.lng + 180) / 360 * scale,
      y:(1 - Math.log(Math.tan(latitude) + 1 / Math.cos(latitude)) / Math.PI) / 2 * scale};
  };

  class HtmlMarker extends g.OverlayView {
    constructor(position, options) { super(); this.position=ll(position); this.options=options; this.callback=null; }
    onAdd() {
      const icon=this.options.icon;
      this.element=document.createElement('button');
      this.element.type='button';
      this.element.className=icon.className;
      this.element.innerHTML=icon.html;
      this.element.title=this.options.title||'';
      this.element.setAttribute('aria-label',this.options.title||'Map place');
      this.element.style.cssText=`position:absolute;width:${icon.iconSize?.[0]||26}px;height:${icon.iconSize?.[1]||26}px;z-index:${this.options.zIndexOffset||0};cursor:pointer`;
      this.element.addEventListener('click',event=>{event.stopPropagation();this.callback?.()});
      this.getPanes().overlayMouseTarget.append(this.element);
    }
    draw() {
      if (!this.element) return;
      const pixel=this.getProjection().fromLatLngToDivPixel(this.position);
      this.element.style.left=`${pixel.x-(this.options.icon.iconAnchor?.[0]||13)}px`;
      this.element.style.top=`${pixel.y-(this.options.icon.iconAnchor?.[1]||13)}px`;
    }
    onRemove() { this.element?.remove(); this.element=null; }
    on(event,callback) { if(event==='click')this.callback=callback; return this; }
    bindTooltip(title) { this.options.title=title;return this; }
    addTo(layer) { layer.add(this);return this; }
  }

  const line = (points,options={}) => {
    const polyline=new g.Polyline({path:points.map(ll),strokeColor:options.color||'#333',
      strokeWeight:options.weight||2,strokeOpacity:options.dashArray?0:(options.opacity??1),clickable:false,...(options.dashArray?{icons:[{icon:{path:'M 0,-1 0,1',strokeColor:options.color||'#333',strokeOpacity:options.opacity??1,strokeWeight:options.weight||2,scale:2},offset:'0',repeat:'10px'}]}:{})});
    polyline.addTo=layer=>{layer.add(polyline);return polyline};
    return polyline;
  };
  return {
    showPlaceCard:showGooglePlaceCard,
    map(element) {
      const native=new g.Map(element,{center:{lat:41.89,lng:-87.631},zoom:13,
        disableDefaultUI:true,clickableIcons:true,gestureHandling:'greedy',mapTypeId:'roadmap'});
      const groups=new Set();let cancelReady,authFailure,tilesListener,reportFailure;
      const failure=new Promise(resolve=>{reportFailure=resolve});
      const previousAuth=window.gm_authFailure;
      const ready=new Promise((resolve,reject)=>{
        let finished=false;
        const complete=error=>{
          if(finished)return;finished=true;clearTimeout(timer);
          tilesListener?.remove();
          if(error){loadedKey=null;reject(error)}else resolve();
        };
        const timer=setTimeout(()=>complete(Error('Google map tiles did not load')),15000);
        tilesListener=g.event.addListenerOnce(native,'tilesloaded',()=>complete());
        authFailure=()=>{loadedKey=null;const error=Error('Google Maps authentication failed');reportFailure(error);complete(error)};
        cancelReady=()=>complete(Error('Map destroyed'));
        window.gm_authFailure=authFailure;
      });
      const wrapper={native,ready,failure,setTheme(theme){native.setOptions({styles:theme==='dark'?darkStyle:[]})},setView(position,zoom){native.setCenter(ll(position));native.setZoom(zoom);return this},
        fitBounds(points,options={}){const bounds=new g.LatLngBounds();for(const point of points)bounds.extend(ll(point));
          native.fitBounds(bounds,{top:options.paddingTopLeft?.[1]||20,left:options.paddingTopLeft?.[0]||20,
            right:options.paddingBottomRight?.[0]||20,bottom:options.paddingBottomRight?.[1]||20});
          if(options.maxZoom)g.event.addListenerOnce(native,'idle',()=>{if(native.getZoom()>options.maxZoom)native.setZoom(options.maxZoom)});return this},
        zoomIn(){native.setZoom((native.getZoom()||13)+1)},zoomOut(){native.setZoom((native.getZoom()||13)-1)},
        getZoom(){return native.getZoom()||13},on(event,callback){
          if(event==='zoomend')native.addListener('zoom_changed',callback);
          if(event==='placeclick')native.addListener('click',event=>forwardPlaceClick(event,callback));
          return this},
        latLngToLayerPoint(value){const center=world(native.getCenter().toJSON(),native.getZoom()||13),point=world(ll(value),native.getZoom()||13);
          const x=point.x-center.x+element.clientWidth/2,y=point.y-center.y+element.clientHeight/2;
          return {x,y,distanceTo(other){return Math.hypot(x-other.x,y-other.y)}}},
        invalidateSize(){g.event.trigger(native,'resize')},
        remove(){reportFailure(null);cancelReady();for(const group of groups)group.clearLayers();g.event.clearInstanceListeners(native);if(window.gm_authFailure===authFailure)window.gm_authFailure=previousAuth;element.replaceChildren()}};
      wrapper.groups=groups;
      return wrapper;
    },
    layerGroup(){return {items:[],map:null,addTo(map){this.map=map;map.groups.add(this);return this},
      add(item){this.items.push(item);item.setMap(this.map.native)},clearLayers(){for(const item of this.items)item.setMap(null);this.items=[]}}},
    divIcon:options=>options,
    marker:(position,options)=>new HtmlMarker(position,options),
    circle:(position,options)=>{
      const circle=new g.Circle({center:ll(position),radius:options.radius,strokeColor:options.color,strokeWeight:options.weight,fillColor:options.fillColor,fillOpacity:options.fillOpacity,clickable:false});
      circle.addTo=layer=>{layer.add(circle);return circle};return circle;
    },
    circleMarker:(position,options)=>new HtmlMarker(position,{icon:{className:'google-station',
      html:`<b style="background:${options.fillColor};border-color:${options.color}"></b>`,iconSize:[9,9],iconAnchor:[4.5,4.5]},title:''}),
    polyline:line,
    geoJSON:(feature,{style})=>{const lines=feature.coordinates.map(coords=>line(coords.map(([lng,lat])=>[lat,lng]),style));
      return {addTo(layer){for(const item of lines)layer.add(item);return this}}},
    latLng:(lat,lng)=>({lat,lng}),latLngBounds:points=>points
  };
}

// Stop Google's competing native popup only when our panel handles a POI.
export function forwardPlaceClick(event,select) {
  if(!event.placeId)return;
  event.stop();
  select({placeId:event.placeId,location:event.latLng?.toJSON()});
}

// Compare Google's returned listing identity with the previously reviewed link.
// A similarly named venue or a different branch must never be silently selected.
export function listingIdentity(value) {
  try {
    const url=new URL(value);
    const cid=url.searchParams.get('cid');
    if(cid&&/^\d+$/.test(cid))return BigInt(cid).toString();
    // !5s may identify the containing building; !1s identifies this listing.
    const pair=decodeURIComponent(value).match(/!1s0x[\da-f]+:(0x[\da-f]+)(?:!|$)/i);
    return pair?BigInt(pair[1]).toString():null;
  } catch { return null; }
}
const resolvedPlaces=new Map();
export function resolveGooglePlaceId(record,place,Place) {
  if(record.google?.placeId)return Promise.resolve(record.google.placeId);
  const identity=record.google?.listingCid||listingIdentity(record.google?.listingUrl);
  if(!identity)return Promise.reject(Error('No verified Google listing identity'));
  if(!resolvedPlaces.has(identity)) {
    const request=Place.searchByText({
      textQuery:`${record.google.matchedName||place.name}, ${record.google.matchedAddress||place.address||'Chicago'}`,
      fields:['id','googleMapsURI'],maxResultCount:5,language:'en',region:'us'
    }).then(async({places})=>{
      let match=places.find(result=>listingIdentity(result.googleMapsURI)===identity);
      // Text search can return a parent building instead of the saved tenant.
      // One bounded lookup can find that exact listing without accepting an alias.
      if(!match&&Place.searchNearby&&Number.isFinite(record.location?.lat)&&Number.isFinite(record.location?.lng)) {
        const nearby=await Place.searchNearby({fields:['id','googleMapsURI'],maxResultCount:20,
          locationRestriction:{center:{lat:record.location.lat,lng:record.location.lng},radius:150}});
        places=nearby.places;
        match=places.find(result=>listingIdentity(result.googleMapsURI)===identity);
      }
      if(!match)throw Object.assign(Error('Google listing match not confirmed'),{stage:'resolution',code:'listing-mismatch'});
      return match.id;
    }).catch(error=>{resolvedPlaces.delete(identity);throw error});
    resolvedPlaces.set(identity,request);
  }
  return resolvedPlaces.get(identity);
}

// Bound both resolution and component loading, and remove event listeners on abort.
function placeStage(run,{signal,stage,timeout=12000}) {
 return new Promise((resolve,reject)=>{
   let settled=false;
   const finish=(error,value)=>{if(settled)return;settled=true;clearTimeout(timer);signal?.removeEventListener('abort',cancel);error?reject(error):resolve(value)};
   const cancel=()=>finish(Object.assign(Error('Place selection changed'),{stage,code:'cancelled'}));
   const timer=setTimeout(()=>finish(Object.assign(Error('Google place details timed out'),{stage,code:'timeout'})),timeout);
   signal?.addEventListener('abort',cancel,{once:true});
   if(signal?.aborted){cancel();return}
   Promise.resolve().then(run).then(value=>finish(null,value),error=>finish(Object.assign(Error('Google place details unavailable'),{stage,code:error.code==='listing-mismatch'?'listing-mismatch':'unavailable'})));
 });
}
export async function showGooglePlaceCard(host,record,place,{compact=false,signal}={}) {
  const library=await placeStage(()=>google.maps.importLibrary('places'),{signal,stage:'library'});
  const id=await placeStage(()=>resolveGooglePlaceId(record,place,library.Place),{signal,stage:'resolution'});
  if(signal?.aborted||!host.isConnected)throw Object.assign(Error('Place selection changed'),{stage:'component',code:'cancelled'});
  const card=document.createElement(compact?'gmp-place-details-compact':'gmp-place-details');
  const request=document.createElement('gmp-place-details-place-request');request.setAttribute('place',id);
  const content=document.createElement(compact?'gmp-place-content-config':'gmp-place-all-content');
  if(compact){card.setAttribute('orientation','horizontal');for(const name of ['rating','type','opening-hours'])content.append(document.createElement('gmp-place-'+name));}
  card.append(request,content);
  let onLoad,onError;
  try {
    await placeStage(()=>new Promise((resolve,reject)=>{
      onLoad=()=>resolve();onError=()=>reject(Error('Component error'));
      card.addEventListener('gmp-load',onLoad,{once:true});card.addEventListener('gmp-error',onError,{once:true});host.append(card);
    }),{signal,stage:'component'});
  } catch(error){card.remove();throw error}
  finally {card.removeEventListener('gmp-load',onLoad);card.removeEventListener('gmp-error',onError);}
}
