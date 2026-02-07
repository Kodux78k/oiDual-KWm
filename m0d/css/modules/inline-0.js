
(() => {
  'use strict';
  if (window.__UNIFIED_TEXT_LIST_BEAUTY__) return;
  window.__UNIFIED_TEXT_LIST_BEAUTY__ = true;

  /* ----------------- small utils ----------------- */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (s = '') => String(s).replace(/[&<>'"]/g, m => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m]));

  /* ----------------- TEXT BEAUTY V3 logic ----------------- */
  const processInline = (root = document) => {
    const targets = $$('p, li, h1, h2, h3, h4, h5, h6', root).filter(n => !n.closest('pre, code, .no-beauty'));
    const rxKV = /(^|\s)([A-Za-zÀ-ÿ0-9_]+):(?=\s|$)/g;
    const rxParen = /\(([^\n)]+)\)/g;
    const rxChip  = /\[\[([^\[\]]+)\]\]|\[([^\[\]]+)\]/g;

    for (const el of targets) {
      if (el.dataset.inlineProcessed === '1') continue;
      el.dataset.inlineProcessed = '1';
      const html = el.innerHTML;
      if (/<pre|<code|contenteditable/i.test(html)) continue;
      let out = html;
      out = out.replace(rxKV, (m, sp, key) => `${sp}<strong class="kv-key">${key}:</strong>`);
      out = out.replace(rxParen, (m, inside) => `<span class="span-paren">(${inside})</span>`);
      out = out.replace(rxChip, (m, dbl, sgl) => {
        const label = (dbl || sgl || '').trim();
        return `<span class="${dbl ? 'chip-btn' : 'chip'}" data-chip="${esc(label)}">${esc(label)}</span>`;
      });
      el.innerHTML = out;
    }
  };

  const processQuestions = (root = document) => {
    const paras = $$('p', root).filter(n => !n.closest('.q-card, pre, code, .no-beauty'));
    for (const p of paras) {
      try {
        const txt = (p.innerText || '').trim();
        if (txt.endsWith('?') && !p.dataset.qProcessed) {
          p.dataset.qProcessed = '1';
          const wrap = document.createElement('div'); wrap.className = 'q-card';
          wrap.innerHTML = `<div class="q-ico">?</div><div class="q-body">${esc(txt)}</div>`;
          p.replaceWith(wrap);
        }
      } catch (err) { /* silent */ }
    }
  };

  const beautifyFlow = (root = document) => {
    const container = root.querySelector('.flow-text') || root;
    $$('p', container).forEach(p => {
      try {
        const t = (p.innerText || '').trim();
        if (/^[^:\n]{3,}:\s*$/.test(t)) p.classList.add('kv-head');
        if (t.length > 600 && t.includes('. ')) {
          const mark = t.indexOf('. ', Math.floor(t.length / 2));
          if (mark > 0) {
            const a = t.slice(0, mark + 1), b = t.slice(mark + 1);
            const p2 = p.cloneNode(); p2.textContent = b.trim();
            p.textContent = a.trim();
            p.insertAdjacentElement('afterend', p2);
          }
        }
      } catch (err) { /* silent */ }
    });
  };

  const enableCopyLists = (root = document) => {
    const lists = $$('.list-card', root);
    for (const card of lists) {
      if (card.dataset.copyAttached === '1') continue;
      card.dataset.copyAttached = '1';
      const badge = document.createElement('div');
      badge.className = 'copy-badge'; badge.textContent = 'copiar';
      card.appendChild(badge);
      card.addEventListener('click', e => {
        if (e.target.closest('a,button,.chip,.chip-btn')) return;
        const txt = Array.from(card.querySelectorAll('li')).map(li => li.innerText.trim()).filter(Boolean).join('\n');
        if (!txt) return;
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(txt).then(() => {
            badge.textContent = 'copiado!';
            setTimeout(() => badge.textContent = 'copiar', 1200);
          }).catch(() => {
            badge.textContent = 'erro'; setTimeout(() => badge.textContent = 'copiar', 1200);
          });
        } else {
          // fallback
          const ta = document.createElement('textarea'); ta.value = txt; document.body.appendChild(ta); ta.select();
          try { document.execCommand('copy'); badge.textContent = 'copiado!'; } catch (err) { badge.textContent = 'erro'; }
          ta.remove(); setTimeout(() => badge.textContent = 'copiar', 1200);
        }
      }, { passive: true });
    }
  };

  const renderRawHTML = (root = document) => {
    // code fence transform
    $$('pre code', root).forEach(code => {
      const cls = (code.className || '').toLowerCase();
      if (cls.includes('language-html-raw') || cls.includes('lang-html-raw')) {
        const raw = code.textContent || '';
        const box = document.createElement('div'); box.className = 'raw-html-card';
        box.innerHTML = `<div class="raw-note">HTML/SVG renderizado a partir de bloco <code>html-raw</code></div>`;
        const slot = document.createElement('div'); slot.className = 'raw-slot';
        slot.innerHTML = raw; box.appendChild(slot);
        const pre = code.closest('pre'); if (pre) pre.replaceWith(box);
      }
    });

    $$('div[data-raw-html]', root).forEach(div => {
      try {
        const raw = div.textContent || '';
        const box = document.createElement('div'); box.className = 'raw-html-card';
        const slot = document.createElement('div'); slot.className = 'raw-slot';
        slot.innerHTML = raw; box.appendChild(slot); div.replaceWith(box);
      } catch (err) { /* silent */ }
    });
  };

  /* ----------------- LIST/ASCII V2 logic ----------------- */
  const wrapLists = (root = document) => {
    const lists = $$('ul,ol', root).filter(el => {
      if (el.closest('nav,menu,.no-beauty,.editor,.toolbar')) return false;
      if (el.classList.contains('ul-neo') || el.classList.contains('ol-neo')) return false;
      return true;
    });
    for (const el of lists) {
      const isOL = el.tagName === 'OL';
      el.classList.add(isOL ? 'ol-neo' : 'ul-neo');
      if (!el.parentElement.classList.contains('list-card')) {
        const wrap = document.createElement('div'); wrap.className = 'list-card';
        el.replaceWith(wrap); wrap.appendChild(el);
      }
    }
  };

  const asciiScore = (t = '') => {
    const box = /[─│┌┐└┘╭╮╰╯═╬╠╣╦╩]+/g, grid = /[-_=+*#\\/|]{3,}/g;
    const L = String(t).split('\n'); let h = 0;
    for (const ln of L) { if (box.test(ln) || grid.test(ln) || ln.trim().startsWith('> ')) h++; }
    return h >= Math.max(2, Math.ceil(L.length * 0.2));
  };

  const enhanceASCII = (root = document) => {
    const cand = new Set([...$$('pre', root), ...$$('code.language-text, code[class*="language-plaintext"]', root)]);
    $$('p', root).forEach(p => { const x = p.innerText || ''; if (x.includes('\n') && asciiScore(x)) cand.add(p); });
    for (const el of cand) {
      if (el.closest('.ascii-card,.no-beauty')) continue;
      const txt = (el.innerText || '').trim(); if (!asciiScore(txt)) continue;
      const fig = document.createElement('figure'); fig.className = 'ascii-card';
      const pre = document.createElement('pre'); pre.textContent = txt; fig.appendChild(pre);
      if (!el.closest('pre')) { const fc = document.createElement('figcaption'); fc.className = 'ascii-cap'; fc.textContent = 'ASCII • renderizado em bloco'; fig.appendChild(fc); }
      el.replaceWith(fig);
    }
  };

  const applyDashCapsuleByAttr = (root = document) => {
    // maintainer hook — we purposely do not force style changes
    // leaves ul.ul-neo as-is unless author adds classes/attrs
  };

  /* ----------------- central run orchestration ----------------- */
  const runAll = (ctx = document) => {
    try {
      // list & ascii may wrap nodes that later require inline processing -> run lists first
      wrapLists(ctx);
      processInline(ctx);
      processQuestions(ctx);
      beautifyFlow(ctx);
      enableCopyLists(ctx);
      renderRawHTML(ctx);
      enhanceASCII(ctx);
      applyDashCapsuleByAttr(ctx);
    } catch (err) {
      // fail-safe: log minimal info to console without breaking host
      if (window.DEBUG_UNIFIED_BEAUTY) console.warn('unified-beauty error', err);
    }
  };

  /* ----------------- single MutationObserver server ----------------- */
  const observeOptions = { childList: true, subtree: true };
  const observer = new MutationObserver(mutations => {
    // collect nodes to process (dedupe roots)
    const roots = new Set();
    for (const m of mutations) {
      if (m.addedNodes && m.addedNodes.length) {
        for (const n of m.addedNodes) {
          if (n.nodeType === 1) roots.add(n);
        }
      }
      // if attributes changed in large apps, re-run whole doc cautiously
      if (m.type === 'attributes') roots.add(document);
    }
    // process each root (small heuristic)
    for (const root of roots) {
      try { runAll(root); } catch (e) { /* swallow */ }
    }
  });

  const startObserver = () => {
    observer.observe(document.body, observeOptions);
    // heuristics: also re-run on window focus (useful for SPA navigations)
    window.addEventListener('focus', () => runAll(document), { passive: true });
  };

  /* ----------------- chip delegation + quick edit toggle ----------------- */
  let EDIT_ON = false;
  const toggleEdit = () => {
    EDIT_ON = !EDIT_ON;
    document.body.toggleAttribute('data-edit', EDIT_ON);
    const host = document.getElementById('CONTENT') || document.querySelector('main, article, .render, .reader, body');
    if (host) host.contentEditable = EDIT_ON ? 'plaintext-only' : 'false';
  };
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'e') { e.preventDefault(); toggleEdit(); }
  });

  document.addEventListener('click', e => {
    const chip = e.target.closest('.chip, .chip-btn');
    if (chip) {
      const label = chip.dataset.chip || chip.textContent.trim();
      const ev = new CustomEvent('chip:click', { detail: { label, source: 'unified-beauty' } });
      document.dispatchEvent(ev);
    }
  }, { passive: true });

  /* ----------------- boot sequence ----------------- */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { runAll(document); startObserver(); });
  } else {
    runAll(document); startObserver();
  }

  // for external tooling: expose a safe API
  window.UNIFIED_BEAUTY = {
    run: runAll,
    observe: startObserver,
    disconnect: () => observer.disconnect()
  };
})();
