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

  // Calendario de responsables
  var cuerpoR=document.getElementById('resp-cuerpo');
  if(cuerpoR && typeof SEMANAS!=='undefined'){
    var GR={1:'1.er grado',2:'2.º grado',3:'3.er grado'}, TRI=['','Trimestre I','Trimestre II','Trimestre III'];
    var pintarR=function(t){
      var h='', ultimoT=0;
      SEMANAS.forEach(function(s){
        if(t!=='0' && String(s.trimestre)!==t) return;
        if(t==='0' && s.trimestre!==ultimoT){ ultimoT=s.trimestre; h+='<tr class="trim"><td colspan="4">'+TRI[s.trimestre]+'</td></tr>'; }
        var es=sem&&actual&&s.sem===sem.sem;
        h+='<tr'+(es?' class="actual" id="resp-actual"':'')+'><th scope="row">Semana '+s.sem+'<span>'+rango(s)+'</span></th>';
        [1,2,3].forEach(function(g){
          var l=LECTURAS.filter(function(x){return x.grado===g&&x.semana===s.sem;})[0];
          h+='<td data-g="'+GR[g]+'">'+(l?'<a href="lecturas/'+l.slug+'.html">'+esc(l.titulo)+'</a><span class="cal">Aplica: Integración Curricular · Califica: <b>'+esc(l.asignatura)+'</b></span>':'—')+'</td>';
        });
        h+='</tr>';
      });
      cuerpoR.innerHTML=h;
    };
    var botR=document.querySelectorAll('.resp-pest button');
    botR.forEach(function(b){b.addEventListener('click',function(){botR.forEach(function(x){x.setAttribute('aria-pressed',x===b?'true':'false');});pintarR(b.dataset.t);});});
    pintarR('0');
  }

  // Filtros
  var botones=document.querySelectorAll('.filtros .pestanas button'), bandas=document.querySelectorAll('.banda'), input=document.getElementById('buscar'), sinRes=document.getElementById('sin-res');
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
