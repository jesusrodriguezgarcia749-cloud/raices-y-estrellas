/* Raíces y Estrellas: filtros de la biblioteca y lecturas de la semana. */
(function(){
  var MESES=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  var NOM={1:'Primer grado',2:'Segundo grado',3:'Tercer grado'};
  function f(iso){var p=iso.split('-');return new Date(+p[0],+p[1]-1,+p[2]);}
  function rango(s){var a=f(s.inicio),b=f(s.fin);
    return a.getMonth()===b.getMonth()? a.getDate()+' al '+b.getDate()+' de '+MESES[b.getMonth()]
      : a.getDate()+' de '+MESES[a.getMonth()]+' al '+b.getDate()+' de '+MESES[b.getMonth()];}
  function esc(t){return String(t).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}

  // Semana vigente: desde el sábado previo hasta el viernes; si no hay aplicación, la próxima.
  var hoy=new Date(); hoy.setHours(0,0,0,0);
  var actual=null, proxima=null;
  if(typeof SEMANAS!=='undefined'){
    SEMANAS.forEach(function(s){
      var ini=f(s.inicio), fin=f(s.fin), desde=f(s.inicio); desde.setDate(desde.getDate()-2);
      if(hoy>=desde && hoy<=fin) actual=s;
      if(!proxima && desde>hoy) proxima=s;
    });
  }
  var sem=actual||proxima;
  var cajaF=document.getElementById('semana-fecha'), cajaT=document.getElementById('semana-tarjetas');
  if(cajaF){
    if(!sem){ cajaF.textContent='El ciclo de lecturas 2026-2027 concluyó. Las 90 lecturas siguen disponibles para consulta.'; }
    else{
      cajaF.textContent=(actual?'Semana ':'Próxima semana de lectura: semana ')+sem.sem+' de 30, del '+rango(sem)+'.';
      var html='';
      LECTURAS.filter(function(l){return l.semana===sem.sem;}).forEach(function(l){
        html+='<a class="tarjeta g'+l.grado+'" href="lecturas/'+l.slug+'.html"><div class="t-grado">'+NOM[l.grado]+'</div><div class="t-tit">'+esc(l.titulo)+'</div><div class="t-asig">Califica: '+esc(l.asignatura)+'</div></a>';
      });
      cajaT.innerHTML=html;
      document.querySelectorAll('.item').forEach(function(li){ if(li.dataset.inicio===sem.inicio && actual) li.classList.add('actual'); });
    }
  }

  // Filtros
  var botones=document.querySelectorAll('.pestanas button'), bandas=document.querySelectorAll('.banda'), input=document.getElementById('buscar'), sinRes=document.getElementById('sin-res');
  var grado='0';
  function norm(t){return t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');}
  function aplicar(){
    var q=norm(input?input.value.trim():''), total=0;
    bandas.forEach(function(b){
      var visibleB=(grado==='0'||b.dataset.grado===grado), n=0;
      b.querySelectorAll('.item').forEach(function(li){
        var ok=!q||norm(li.dataset.busca).indexOf(q)>-1; li.hidden=!ok; if(ok) n++;
      });
      b.querySelectorAll('.tri').forEach(function(t){t.hidden=!!q;});
      b.hidden=!visibleB||n===0; if(!b.hidden) total+=n;
    });
    if(sinRes) sinRes.hidden=total>0;
  }
  botones.forEach(function(btn){btn.addEventListener('click',function(){
    grado=btn.dataset.g; botones.forEach(function(x){x.setAttribute('aria-pressed',x===btn?'true':'false');}); aplicar();
  });});
  if(input) input.addEventListener('input',aplicar);
})();
