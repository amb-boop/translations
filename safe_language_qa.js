'use strict';
// Conservative signals. A clean result is NOT proof of correct translation.
const fold = x => String(x||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const SHARED = new Set(['body','bandeau','push-up','balconnet','corbeille','shorty','tanga','modal','bikini','top','pyjama']);
const FR = /\b(?:cette|avec|sans|pour|dans|soutien.gorge|dentelle|bretelles|confectionn\w*|quotidien|matiere|manches|maillot de bain|sous les vetements|est dote|offre un confort|en coton|en dentelle)\b/gu;
function check(text,fr,locale){
  const t=String(text||'').trim(), src=String(fr||'').trim();
  if(!t)return {status:'Blocked',rule:'MISSING',reason:'No proposed text'};
  if(src && fold(t)===fold(src)) {
    const toks=fold(t).split(/[^a-z0-9-]+/).filter(Boolean);
    return toks.every(x=>SHARED.has(x)) ? {status:'Warning',rule:'SHARED',reason:'Shared term; manual confirmation'} : {status:'Blocked',rule:'UNCHANGED_FR',reason:'Text is identical to French source'};
  }
  const normalized=fold(t);
  const hits=[...normalized.matchAll(FR)].map(x=>x[0]).filter(x=>!SHARED.has(x));
  if(hits.length>=2)return {status:'Blocked',rule:'FR_HYBRID',reason:'French fragments: '+[...new Set(hits)].join(', ')};
  if(locale==='pl_PL' && /[řěů]/iu.test(t))return {status:'Blocked',rule:'CZECH_IN_PL',reason:'Czech-specific letters in Polish'};
  if(locale==='cz_CZ' && /[łąęśźżćń]/iu.test(t))return {status:'Blocked',rule:'POLISH_IN_CZ',reason:'Polish-specific letters in Czech'};
  if(hits.length)return {status:'Warning',rule:'FR_SUSPECT',reason:'Potential French fragment: '+hits[0]};
  return {status:'Not checked',rule:'MANUAL_REVIEW',reason:'No obvious issue; human review required'};
}
module.exports={check};
