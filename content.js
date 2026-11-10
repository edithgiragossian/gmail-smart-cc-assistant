(() => {
  'use strict';
  if (window.__smartCcAssistantLoaded) return;
  window.__smartCcAssistantLoaded = true;
  // Fictional demonstration addresses. Replace with your own authorised mappings
  // in a private working copy; do not commit confidential employee directories.
  const DOMAIN = '@example.com';
  const GROUPS = {
    'supervisor.alpha@example.com': ['staff.one', 'staff.two', 'staff.three'],
    'supervisor.beta@example.com': ['staff.four', 'staff.five'],
    'supervisor.gamma@example.com': ['staff.six', 'staff.seven']
  };
  const RULES = new Map(Object.entries(GROUPS).flatMap(([boss, names]) => names.map(n => [n + DOMAIN, boss])));
  const norm = s => String(s || '').trim().toLowerCase();
  const emailRx = /[a-z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-z0-9.-]+\.[a-z]{2,}/ig;
  const lastAction = new WeakMap();
  function composeWindows() {
    const results = new Set();
    document.querySelectorAll('input[name="subjectbox"], [name="subjectbox"]').forEach(subject => {
      const dialog = subject.closest('[role="dialog"]');
      if (dialog) results.add(dialog);
      else {
        let el = subject.parentElement;
        for (let i=0; el && i<9; i++, el=el.parentElement) {
          if (el.querySelector('[role="textbox"][contenteditable="true"]') && el.querySelector('[name="subjectbox"]')) { results.add(el); break; }
        }
      }
    });
    return [...results];
  }
  function recipientArea(compose, type) {
    const input = compose.querySelector(`input[name="${type}"], textarea[name="${type}"]`);
    if (input) return input.closest('tr') || input.closest('[role="listbox"]') || input.parentElement?.parentElement || input.parentElement;
    const labelled = [...compose.querySelectorAll('[aria-label], [data-name]')].find(el => norm(el.getAttribute('aria-label')) === type && el.querySelector('[email], [data-hovercard-id]'));
    return labelled || null;
  }
  function emailsFrom(area) {
    const found = new Set();
    if (!area) return found;
    const nodes = [area, ...area.querySelectorAll('[email], [data-hovercard-id], input, textarea')];
    nodes.forEach(el => {
      for (const v of [el.getAttribute('email'),el.getAttribute('data-hovercard-id'),el.matches('input,textarea') ? el.value : null]) {
        (String(v || '').match(emailRx) || []).forEach(e => found.add(norm(e)));
      }
    });
    return found;
  }
  function toEmails(compose) {
    const area = recipientArea(compose,'to');
    const found = emailsFrom(area);
    // Fallback: recipient chips, excluding identifiable CC and BCC rows.
    if (!found.size) {
      const excluded = new Set([...emailsFrom(recipientArea(compose,'cc')), ...emailsFrom(recipientArea(compose,'bcc'))]);
      compose.querySelectorAll('[email], [data-hovercard-id]').forEach(el => {
        const value = norm(el.getAttribute('email') || el.getAttribute('data-hovercard-id'));
        if (RULES.has(value) && !excluded.has(value)) found.add(value);
      });
    }
    return found;
  }
  function allEmails(compose) {
    const result = new Set();
    compose.querySelectorAll('[email], [data-hovercard-id]').forEach(el => {
      const v = norm(el.getAttribute('email') || el.getAttribute('data-hovercard-id'));
      if (v.includes('@')) result.add(v);
    });
    return result;
  }
  function ccEmails(compose) { return emailsFrom(recipientArea(compose,'cc')); }
  function statusPanel(compose) {
    let panel = compose.querySelector('[data-smart-cc-assistant]');
    if (panel) return panel;
    panel = document.createElement('div');
    panel.dataset.smartCcAssistant = '1';
    panel.style.cssText = 'font:13px Arial,sans-serif;border:1px solid #8bb7a1;border-radius:7px;padding:9px;margin:6px 0;background:#f2faf6;color:#173b2c;position:relative;z-index:1;';
    const subject = compose.querySelector('[name="subjectbox"]');
    const anchor = subject?.closest('tr') || subject?.parentElement;
    if (anchor && anchor.parentElement && anchor.tagName !== 'TR') anchor.after(panel);
    else compose.append(panel);
    return panel;
  }
  function show(panel, message, email) {
    if (panel.dataset.message === message) return;
    panel.dataset.message = message;
    panel.replaceChildren();
    const line = document.createElement('div');
    line.textContent = 'Smart CC Assistant: ' + message;
    panel.append(line);
    if (email) {
      const btn = document.createElement('button');
      btn.type='button';btn.textContent='Copy supervisor address';
      btn.style.cssText='margin-top:6px;padding:5px 8px;cursor:pointer;';
      btn.addEventListener('click', async () => {
        try { await navigator.clipboard.writeText(email); btn.textContent='Copied — paste into CC'; }
        catch { btn.textContent='Copy manually: '+email; }
      });
      panel.append(btn);
    }
  }
  function openCc(compose) {
    let input = compose.querySelector('input[name="cc"]');
    if (input) return input;
    const controls = [...compose.querySelectorAll('span,button,[role="button"]')];
    const cc = controls.find(el => el.children.length === 0 && el.textContent.trim() === 'Cc' && el.getBoundingClientRect().width > 0);
    cc?.click();
    return compose.querySelector('input[name="cc"]');
  }
  function attemptAdd(compose, supervisor) {
    const input = openCc(compose);
    if (!input) return false;
    input.focus();
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')?.set;
    if (!setter) return false;
    setter.call(input, supervisor);
    input.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertText',data:supervisor}));
    input.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',code:'Enter',keyCode:13,which:13,bubbles:true}));
    input.dispatchEvent(new KeyboardEvent('keyup',{key:'Enter',code:'Enter',keyCode:13,which:13,bubbles:true}));
    return true;
  }
  function update(compose) {
    const panel = statusPanel(compose);
    const recipients = [...toEmails(compose)];
    const bosses = [...new Set(recipients.map(e => RULES.get(e)).filter(Boolean))];
    if (!bosses.length) {
      show(panel, recipients.length ? 'No matching staff recipient yet.' : 'Running. Enter a staff email in To and press Enter.');
      return;
    }
    const missing = bosses.filter(e => !allEmails(compose).has(e) && !ccEmails(compose).has(e));
    if (!missing.length) { show(panel, 'Supervisor already present in recipients.'); return; }
    const key = missing.join('|');
    const previous = lastAction.get(compose);
    if (previous === key) {
      show(panel, 'Supervisor detected: '+missing.join(', ')+'. Check CC; if missing, use Copy.', missing[0]);
      return;
    }
    lastAction.set(compose,key);
    try { missing.forEach(e => attemptAdd(compose,e)); }
    catch (err) { console.warn('Smart CC Assistant:',err); }
    setTimeout(() => {
      if (!compose.isConnected) return;
      const notAdded = missing.filter(e => !ccEmails(compose).has(e));
      show(panel, notAdded.length ? 'Supervisor detected, but automatic CC could not be confirmed: '+notAdded.join(', ') : 'Supervisor successfully added to CC.', notAdded[0]);
    },700);
  }
  let timer;
  function scan() { clearTimeout(timer); timer=setTimeout(()=>composeWindows().forEach(update),250); }
  new MutationObserver(scan).observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['email','data-hovercard-id']});
  ['change','focusout','keyup','input'].forEach(event => document.addEventListener(event,scan,true));
  scan();
  console.info('Smart CC Assistant content script loaded');
})();
