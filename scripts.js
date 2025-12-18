// scripts.js: moved from inline <script> and extended

document.addEventListener('DOMContentLoaded', function() {
    // IntersectionObserver pour déclencher animations quand les catégories apparaissent
    const produits = document.querySelectorAll('.categorie-produit');

    function revealEntries(entries, observer) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.animationPlayState = 'running';
                observer.unobserve(entry.target);
            }
        });
    }

    if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver(revealEntries, { threshold: 0.1 });
        produits.forEach(produit => {
            produit.style.animationPlayState = 'paused';
            observer.observe(produit);
        });
    } else {
        // Fallback: animer directement
        produits.forEach(produit => produit.style.animationPlayState = 'running');
    }

    // Ajouter des images placeholders pour chaque catégorie (améliore l'UX)
    const categories = document.querySelectorAll('.categorie-produit');
    categories.forEach(cat => {
        const titre = cat.querySelector('.titre-categorie')?.textContent?.trim() || 'Produit';
        // simple SVG placeholder en data URI
        const svg = encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><rect width='100%' height='100%' fill='%23E8D9C5'/><text x='50%' y='50%' font-size='14' text-anchor='middle' fill='%238B4513' font-family='Arial' dy='.3em'>${titre}</text></svg>`);
        const img = document.createElement('img');
        img.className = 'product-img';
        img.alt = titre;
        img.loading = 'lazy';
        img.decoding = 'async';
        img.width = 48;
        img.height = 48;
        img.src = `data:image/svg+xml,${svg}`;
        // insert before the title
        cat.insertBefore(img, cat.firstChild);
    });

    // Configuration: si tu as un endpoint (Google Apps Script Web App), place l'URL ici pour enregistrer automatiquement
    const ORDER_ENDPOINT = ''; // ex: 'https://script.google.com/macros/s/XXX/exec'

    // Modal references
    const modal = document.getElementById('order-modal');
    const modalOverlay = modal?.querySelector('.modal-overlay');
    const modalClose = modal?.querySelector('.modal-close');
    const modalProduct = document.getElementById('modal-product');
    const modalPrice = document.getElementById('modal-price');
    const modalQuantity = document.getElementById('modal-quantity');
    const modalNote = document.getElementById('modal-note');
    const modalPhone = document.getElementById('modal-phone');
    const modalPreview = document.getElementById('modal-preview');
    const btnSendWA = document.getElementById('modal-send-wa');
    const btnCopy = document.getElementById('modal-copy');
    const btnSave = document.getElementById('modal-save');
    const viewOrdersBtn = document.getElementById('view-orders');
    const ordersList = document.getElementById('orders-list');
    const ordersUl = document.getElementById('orders-ul');
    const ordersClear = document.getElementById('orders-clear');

    // Local storage helpers
    function loadOrders() {
        try { return JSON.parse(localStorage.getItem('kerul_orders') || '[]'); } catch (e) { return []; }
    }
    function saveOrders(arr) { localStorage.setItem('kerul_orders', JSON.stringify(arr)); }

    function buildMessage(order) {
        const parts = [];
        parts.push(`Bonjour, je souhaite commander : ${order.product} - ${order.price}.`);
        parts.push(`Quantité : ${order.quantity}.`);
        if (order.note) parts.push(`Note : ${order.note}.`);
        if (order.phone) parts.push(`Téléphone : ${order.phone}.`);
        parts.push('Merci.');
        return parts.join(' ');
    }

    const FOCUSABLE_SELECTORS = 'a[href], area[href], input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])';

    function getFocusable(container) {
        if (!container) return [];
        return Array.from(container.querySelectorAll(FOCUSABLE_SELECTORS)).filter(el => el.offsetParent !== null);
    }

    function openModalFor(item) {
        const nom = item.querySelector('.nom-produit')?.innerText?.trim() || 'Produit';
        const prix = item.querySelector('.prix-produit')?.innerText?.trim() || '';
        modalProduct.value = nom;
        modalPrice.value = prix;
        modalQuantity.value = '1';
        modalNote.value = '';
        modalPhone.value = '';
        ordersList.hidden = true;
        modalPreview.textContent = '';

        // remember the last focused element to restore focus when closing
        modal._previouslyFocused = document.activeElement;

        // show modal
        modal.removeAttribute('hidden');
        document.body.classList.add('modal-open');
        // hide main content to screen readers while modal open
        const main = document.getElementById('main-content');
        if (main) main.setAttribute('aria-hidden', 'true');

        // focus the first focusable element inside modal
        setTimeout(() => {
            const focusables = getFocusable(modal);
            if (focusables.length) focusables[0].focus();
        }, 10);

        // attach keydown handler to trap focus and handle Escape
        modal._keydownHandler = function(e) {
            if (e.key === 'Escape') {
                e.preventDefault();
                closeModal();
                return;
            }
            if (e.key === 'Tab') {
                const focusables = getFocusable(modal);
                if (!focusables.length) return;
                const first = focusables[0];
                const last = focusables[focusables.length - 1];
                if (e.shiftKey) {
                    if (document.activeElement === first) {
                        e.preventDefault();
                        last.focus();
                    }
                } else {
                    if (document.activeElement === last) {
                        e.preventDefault();
                        first.focus();
                    }
                }
            }
        };
        modal.addEventListener('keydown', modal._keydownHandler);
    }

    function closeModal() {
        modal.setAttribute('hidden', '');
        document.body.classList.remove('modal-open');
        const main = document.getElementById('main-content');
        if (main) main.removeAttribute('aria-hidden');

        // remove keydown handler
        if (modal._keydownHandler) {
            modal.removeEventListener('keydown', modal._keydownHandler);
            delete modal._keydownHandler;
        }

        // restore focus
        try {
            if (modal._previouslyFocused && typeof modal._previouslyFocused.focus === 'function') modal._previouslyFocused.focus();
        } catch (e) {}
    }

    function showPreview() {
        const order = { product: modalProduct.value, price: modalPrice.value, quantity: modalQuantity.value, note: modalNote.value, phone: modalPhone.value };
        modalPreview.textContent = buildMessage(order);
    }

    async function sendWhatsAppOrder(order) {
        const message = buildMessage(order);
        const encoded = encodeURIComponent(message);
        const phoneDigits = (order.phone && order.phone.replace(/\D/g, '')) || '221779715026';
        const appUrl = `whatsapp://send?phone=${phoneDigits}&text=${encoded}`;
        const webUrl = `https://api.whatsapp.com/send?phone=${phoneDigits}&text=${encoded}`;

        // tenter d'ouvrir l'app puis fallback web
        try {
            window.location.href = appUrl;
            setTimeout(() => window.open(webUrl, '_blank'), 700);
        } catch (e) {
            window.open(webUrl, '_blank');
        }

        // copier en dernier recours
        setTimeout(() => {
            if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(message).then(() => {
                    alert('Message copié dans le presse-papiers. Ouvrez WhatsApp et collez-le pour envoyer.');
                }).catch(() => {});
            }
        }, 1500);
    }

    async function saveOrder(order) {
        const arr = loadOrders();
        arr.unshift({ ...order, time: new Date().toISOString() });
        saveOrders(arr);

        // optional: post to endpoint if configured
        if (ORDER_ENDPOINT) {
            try {
                await fetch(ORDER_ENDPOINT, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(order)
                });
            } catch (e) { console.warn('Envoi au endpoint échoué', e); }
        }

        showToast('Commande enregistrée localement.');
    }

    function renderOrders() {
        const arr = loadOrders();
        ordersUl.innerHTML = '';
        if (!arr.length) ordersUl.innerHTML = '<li>Aucune commande</li>';
        arr.forEach(o => {
            const li = document.createElement('li');
            li.textContent = `${new Date(o.time).toLocaleString()} — ${o.product} ×${o.quantity} — ${o.price} ${o.note ? ' — ' + o.note : ''}`;
            ordersUl.appendChild(li);
        });
    }

    // attach commander buttons to open modal
    const produitItems = document.querySelectorAll('.produit-item');
    produitItems.forEach(item => {
        const btn = document.createElement('button');
        btn.className = 'btn-commander';
        btn.type = 'button';
        btn.textContent = 'Commander';
        btn.setAttribute('aria-label', `Commander ${item.querySelector('.nom-produit')?.innerText?.trim() || ''}`);
        btn.addEventListener('click', () => openModalFor(item));
        item.appendChild(btn);
    });

    // modal event listeners
    if (modal) {
        modalOverlay?.addEventListener('click', closeModal);
        modalClose?.addEventListener('click', closeModal);
        modal.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

        modalQuantity?.addEventListener('input', showPreview);
        modalNote?.addEventListener('input', showPreview);
        modalPhone?.addEventListener('input', showPreview);

        btnSendWA?.addEventListener('click', async () => {
            const order = { product: modalProduct.value, price: modalPrice.value, quantity: modalQuantity.value, note: modalNote.value, phone: modalPhone.value };
            await sendWhatsAppOrder(order);
        });

        btnCopy?.addEventListener('click', async () => {
            const order = { product: modalProduct.value, price: modalPrice.value, quantity: modalQuantity.value, note: modalNote.value, phone: modalPhone.value };
            const message = buildMessage(order);
            try {
                await navigator.clipboard.writeText(message);
                showToast('Message copié dans le presse-papiers.');
            } catch (e) { showToast('Impossible de copier automatiquement. Sélectionnez et copiez manuellement.'); }
        });

        btnSave?.addEventListener('click', async () => {
            const order = { product: modalProduct.value, price: modalPrice.value, quantity: modalQuantity.value, note: modalNote.value, phone: modalPhone.value };
            await saveOrder(order);
            renderOrders();
        });

        viewOrdersBtn?.addEventListener('click', () => {
            ordersList.hidden = false;
            renderOrders();
            modal.removeAttribute('hidden');
        });

        ordersClear?.addEventListener('click', () => { if (confirm('Effacer tout l\'historique ?')) { saveOrders([]); renderOrders(); } });
    }

    // Amélioration : hover/transition pour les numéros (géré aussi par CSS)
    const liensTelephone = document.querySelectorAll('.numeros-telephone a');
    liensTelephone.forEach(lien => {
        lien.addEventListener('mouseover', function() {
            this.style.transform = 'scale(1.05)';
            this.style.transition = 'transform 0.3s ease';
        });

        lien.addEventListener('mouseout', function() {
            this.style.transform = 'scale(1)';
        });
    });

    // Gestion du skip link: focus main quand cliqué
    const skip = document.querySelector('.skip-link');
    if (skip) {
        skip.addEventListener('click', function(e) {
            const main = document.getElementById('main-content');
            if (main) {
                main.focus({ preventScroll: true });
            }
        });
    }

    // Background audio: initialize and manage autoplay fallback
    const audioEl = document.getElementById('bg-audio');
    const audioToggle = document.getElementById('audio-toggle');
    const AUDIO_KEY = 'kerul_audio_pref'; // { muted: bool, volume: number }

    function loadAudioPrefs() {
        try { return JSON.parse(localStorage.getItem(AUDIO_KEY) || '{}'); } catch (e) { return {}; }
    }
    function saveAudioPrefs(p) { localStorage.setItem(AUDIO_KEY, JSON.stringify(p)); }

    async function tryPlayAudio() {
        if (!audioEl) return;
        const prefs = loadAudioPrefs();
        audioEl.volume = (typeof prefs.volume === 'number') ? prefs.volume : 0.08; // faible volume
        audioEl.muted = !!prefs.muted;
        try {
            await audioEl.play();
            showToast(audioEl.muted ? 'Audio en sourdine' : 'Musique activée (volume faible)');
            updateAudioToggle();
            return true;
        } catch (err) {
            // autoplay bloqué
            updateAudioToggle();
            return false;
        }
    }

    function updateAudioToggle() {
        if (!audioToggle) return;
        const muted = audioEl?.muted ?? true;
        audioToggle.setAttribute('aria-pressed', muted ? 'true' : 'false');
        audioToggle.textContent = muted ? '🔇' : '🔈';
    }

    function enablePlaybackOnInteraction() {
        const start = async () => {
            await tryPlayAudio();
            window.removeEventListener('click', start, true);
            window.removeEventListener('touchstart', start, true);
        };
        window.addEventListener('click', start, true);
        window.addEventListener('touchstart', start, true);
    }

    if (audioEl) {
        // apply saved prefs
        const prefs = loadAudioPrefs();
        if (typeof prefs.volume === 'number') audioEl.volume = prefs.volume; else audioEl.volume = 0.08;
        audioEl.muted = !!prefs.muted;

        // try to autoplay (may fail)
        tryPlayAudio().then(ok => { if (!ok) enablePlaybackOnInteraction(); });

        // toggle handler
        audioToggle?.addEventListener('click', () => {
            if (!audioEl) return;
            audioEl.muted = !audioEl.muted;
            saveAudioPrefs({ muted: audioEl.muted, volume: audioEl.volume });
            updateAudioToggle();
            showToast(audioEl.muted ? 'Musique désactivée' : 'Musique activée');
            if (!audioEl.muted) tryPlayAudio();
        });

        // keep visualizer in sync with audio events
        audioEl.addEventListener('play', updateAudioVisualizer);
        audioEl.addEventListener('pause', updateAudioVisualizer);
        audioEl.addEventListener('volumechange', updateAudioVisualizer);
    }

    // --- Logo loader and QR intro animation ---
    const siteLogoImg = document.getElementById('site-logo-img');
    const qrLogoImg = document.getElementById('qr-logo-img');
    const qrOverlay = document.getElementById('qr-logo-overlay');
    const qrInner = document.querySelector('.qr-logo-inner');
    const skipQrBtn = document.getElementById('skip-qr');
    const qrText = document.getElementById('qr-logo-text');

    const LOGO_CANDIDATES = ['logo.svg','logo.png','logo.webp','logo.jpg','logo.jpeg','logo.gif'];

    function tryLoadLogo(list, index=0) {
        if (index >= list.length) { console.info('Aucun logo trouvé'); return Promise.resolve(null); }
        const path = list[index];
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve(path);
            img.onerror = () => resolve(tryLoadLogo(list, index+1));
            img.src = path;
        });
    }

    async function initLogo() {
        const found = await tryLoadLogo(LOGO_CANDIDATES);
        if (found) {
            if (siteLogoImg) { siteLogoImg.src = found; siteLogoImg.style.display = 'block'; }
            if (qrLogoImg) { qrLogoImg.src = found; qrLogoImg.style.display = 'block'; }
            if (qrText) qrText.style.display = 'none';
        } else {
            // show text instead if no logo file
            if (qrText) qrText.style.display = 'block';
            if (qrLogoImg) qrLogoImg.style.display = 'none';
        }
    }

    function urlHasQrParam() {
        const s = window.location.search || '';
        const h = window.location.hash || '';
        return /(?:\?|&)(?:source|utm_source|from)=?qr/.test(s) || /(^|#)qr(=|$)/.test(h) || /[?&]qr=1/.test(s);
    }

    function showQrIntro() {
        if (!qrOverlay) return;
        // only show once per session
        if (sessionStorage.getItem('qr_intro_shown')) return;
        sessionStorage.setItem('qr_intro_shown','1');

        qrOverlay.removeAttribute('hidden');
        qrInner.classList.add('playing');
        // lock scroll
        document.body.classList.add('modal-open');
        // auto hide after 7s
        qrOverlay._hideTimeout = setTimeout(() => { hideQrIntro(); }, 7000);
    }

    function hideQrIntro() {
        if (!qrOverlay) return;
        qrInner.classList.remove('playing');
        qrOverlay.setAttribute('hidden','');
        document.body.classList.remove('modal-open');
        if (qrOverlay._hideTimeout) { clearTimeout(qrOverlay._hideTimeout); delete qrOverlay._hideTimeout; }
    }

    skipQrBtn?.addEventListener('click', () => { hideQrIntro(); });
    document.querySelector('.qr-logo-backdrop')?.addEventListener('click', () => { hideQrIntro(); });

    // Initialize logo and check QR param on load
    initLogo().then(() => {
        // add pulse to primary call-to-actions (first few)
        const primaryCTAs = document.querySelectorAll('.btn-commander');
        primaryCTAs.forEach((b,i) => { if (i===0) b.classList.add('pulse'); });

        if (urlHasQrParam()) showQrIntro();
    });

});
