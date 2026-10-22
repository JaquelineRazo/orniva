// ORNIVA — hero video (NOVI builds a website, looping) and reveal-on-scroll.
(function () {
	var video = document.querySelector('[data-novi-hero]');
	if (!video) { return; }
	var replay = document.querySelector('[data-replay]');
	var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	var saveData = navigator.connection && navigator.connection.saveData;
	var endPoster = video.getAttribute('data-poster-end');

	// Reduced motion or data saver: show the finished scene, no video.
	if (reduced || saveData) {
		video.setAttribute('poster', endPoster);
		return;
	}

	// Pick the lighter file on small screens; load after the page content.
	var src = window.matchMedia('(max-width: 767px)').matches
		? video.getAttribute('data-src-mobile')
		: video.getAttribute('data-src-desktop');

	function start() {
		video.src = src;
		var play = video.play();
		if (play && play.catch) {
			// Autoplay blocked: keep the finished scene and offer a play button.
			play.catch(function () {
				video.setAttribute('poster', endPoster);
				replay.hidden = false;
			});
		}
	}

	// The hero loops. The button only appears if the browser blocks
	// autoplay, and starts the loop on tap.
	replay.addEventListener('click', function () {
		replay.hidden = true;
		if (!video.src) { video.src = src; }
		video.play();
	});

	if (document.readyState === 'complete') { start(); }
	else { window.addEventListener('load', start); }
})();

(function () {
	var items = document.querySelectorAll('.reveal');
	if (!('IntersectionObserver' in window)) {
		items.forEach(function (el) { el.classList.add('is-in'); });
		return;
	}
	var io = new IntersectionObserver(function (entries) {
		entries.forEach(function (entry) {
			if (entry.isIntersecting) { entry.target.classList.add('is-in'); io.unobserve(entry.target); }
		});
	}, { rootMargin: '0px 0px -10% 0px' });
	items.forEach(function (el) { io.observe(el); });
})();

// Problem section: cards ride an ellipse. The active pain sits at the right
// apex and the orbit loops to the next one on its own; picking a pain jumps
// there and the loop carries on. Reduced motion swaps cards without the ride.
(function () {
	var root = document.querySelector('[data-orbit]');
	if (!root) { return; }
	var stage = root.querySelector('[data-orbit-stage]');
	var cards = [].slice.call(stage.children);
	var items = [].slice.call(root.querySelectorAll('[data-orbit-item]'));
	var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	var N = cards.length;
	var STEP = N / items.length;          // slots between two pains
	var SLOT = Math.PI * 2 / N;
	var DWELL = 5200;
	var TWEEN = 1100;
	var pos = 0, from = 0, to = 0, tweenStart = 0, tweening = false;
	var active = 0, elapsed = 0, last = 0, raf = 0;
	var inView = false, geo;

	function measure() {
		var w = stage.clientWidth, h = stage.clientHeight;
		var k = w < 520 ? 0.7 : (w < 760 ? 0.86 : 1.12);
		var rx = w * 0.78;
		// Keep the top and bottom cards inside the stage.
		geo = { k: k, rx: rx, ry: h / 2 - 150 * k * 0.56, cx: w - 240 * k * 0.6 - rx, cy: h / 2 };
	}

	function render() {
		cards.forEach(function (card, i) {
			var a = ((i - pos) * SLOT) % (Math.PI * 2);
			if (a > Math.PI) { a -= Math.PI * 2; }
			if (a < -Math.PI) { a += Math.PI * 2; }
			var c = Math.cos(a);
			var s = (0.48 + 0.52 * Math.pow((1 + c) / 2, 1.6)) * geo.k;
			var x = geo.cx + geo.rx * c - 120;
			var y = geo.cy + geo.ry * Math.sin(a) - 150;
			var abs = Math.abs(a);
			var o = abs < 1.75 ? 1 : Math.max(0, 1 - (abs - 1.75) / 0.45);
			card.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px) scale(' + s.toFixed(3) + ')';
			card.style.opacity = o.toFixed(2);
			card.style.zIndex = Math.round(s * 100);
			card.style.visibility = o > 0 ? 'visible' : 'hidden';
		});
	}

	function ease(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

	function select(n) {
		var L = items.length;
		var delta = ((n - active) % L + L) % L;
		if (delta > L / 2) { delta -= L; }
		active = (n + L) % L;
		elapsed = 0;
		from = pos;
		to += delta * STEP;
		items.forEach(function (item, i) {
			var on = i === active;
			item.classList.toggle('is-active', on);
			item.style.setProperty('--p', 0);
			var btn = item.querySelector('button');
			if (on) { btn.setAttribute('aria-current', 'true'); } else { btn.removeAttribute('aria-current'); }
		});
		cards.forEach(function (card, i) { card.classList.toggle('is-active', i === active * STEP); });
		if (reduced) { pos = to; render(); run(); return; }
		tweening = true;
		tweenStart = performance.now();
		run();
	}

	function tick(now) {
		raf = 0;
		var dt = Math.max(0, Math.min(now - last, 100));
		last = now;
		if (tweening) {
			var t = Math.min((now - tweenStart) / TWEEN, 1);
			pos = from + (to - from) * ease(t);
			render();
			if (t === 1) { tweening = false; }
		} else {
			elapsed += dt;
			items[active].style.setProperty('--p', Math.min(elapsed / DWELL, 1).toFixed(3));
			if (elapsed >= DWELL) { select(active + 1); }
		}
		if (inView) { run(); }
	}

	function run() {
		if (!raf) { last = performance.now(); raf = requestAnimationFrame(tick); }
	}

	items.forEach(function (item, i) {
		item.querySelector('button').addEventListener('click', function () { select(i); });
	});
	cards.forEach(function (card, i) {
		if (i % STEP === 0) { card.addEventListener('click', function () { select(i / STEP); }); }
	});

	measure();
	render();
	cards[0].classList.add('is-active');
	if (window.ResizeObserver) { new ResizeObserver(function () { measure(); render(); }).observe(stage); }
	else { window.addEventListener('resize', function () { measure(); render(); }); }

	if ('IntersectionObserver' in window) {
		new IntersectionObserver(function (entries) {
			inView = entries[0].isIntersecting;
			if (inView) { run(); }
		}, { threshold: 0.35 }).observe(stage);
	} else { inView = true; run(); }
})();

// What we do: services orbit the goal. The active one lights up and beams to
// the sun; the list loops through them like the problem section.
(function () {
	var root = document.querySelector('[data-solar]');
	if (!root) { return; }
	var bodies = [].slice.call(root.querySelectorAll('[data-solar-body]'));
	var items = [].slice.call(root.querySelectorAll('[data-solar-item]'));
	var DWELL = 5200;
	var active = 0, elapsed = 0, last = 0, raf = 0, inView = false;

	function select(n) {
		active = (n + items.length) % items.length;
		elapsed = 0;
		items.forEach(function (item, i) {
			var on = i === active;
			item.classList.toggle('is-active', on);
			item.style.setProperty('--p', 0);
			var btn = item.querySelector('button');
			if (on) { btn.setAttribute('aria-current', 'true'); } else { btn.removeAttribute('aria-current'); }
		});
		bodies.forEach(function (body, i) { body.classList.toggle('is-active', i === active); });
	}

	function tick(now) {
		raf = 0;
		elapsed += Math.max(0, Math.min(now - last, 100));
		last = now;
		items[active].style.setProperty('--p', Math.min(elapsed / DWELL, 1).toFixed(3));
		if (elapsed >= DWELL) { select(active + 1); }
		if (inView) { run(); }
	}

	function run() {
		if (!raf) { last = performance.now(); raf = requestAnimationFrame(tick); }
	}

	items.forEach(function (item, i) {
		item.querySelector('button').addEventListener('click', function () { select(i); });
	});
	bodies.forEach(function (body, i) {
		body.addEventListener('click', function () { select(i); });
	});

	select(0);
	if ('IntersectionObserver' in window) {
		new IntersectionObserver(function (entries) {
			inView = entries[0].isIntersecting;
			if (inView) { run(); }
		}, { threshold: 0.35 }).observe(root);
	} else { inView = true; run(); }
})();

// Small looping videos (NOVI idle) play only while on screen.
(function () {
	var vids = document.querySelectorAll('video[data-autoplay-inview]');
	if (!vids.length || window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) { return; }
	var io = new IntersectionObserver(function (entries) {
		entries.forEach(function (entry) {
			var v = entry.target;
			if (entry.isIntersecting) { v.preload = 'auto'; var p = v.play(); if (p && p.catch) { p.catch(function () {}); } }
			else { v.pause(); }
		});
	}, { threshold: 0.35 });
	vids.forEach(function (v) { io.observe(v); });
})();

// Data diagram: contact counter counts up once when it appears (illustrative).
(function () {
	var el = document.querySelector('[data-count]');
	if (!el || !('IntersectionObserver' in window)) { if (el) { el.textContent = Number(el.getAttribute('data-count')).toLocaleString('en-US'); } return; }
	var target = Number(el.getAttribute('data-count'));
	var io = new IntersectionObserver(function (entries) {
		if (!entries[0].isIntersecting) { return; }
		io.disconnect();
		var start = performance.now();
		(function tick(now) {
			var t = Math.min((now - start) / 1400, 1);
			el.textContent = Math.round(target * (1 - Math.pow(1 - t, 3))).toLocaleString('en-US');
			if (t < 1) { requestAnimationFrame(tick); }
		})(start);
	});
	io.observe(el);
})();

// Contact form: package preset, first-touch source, background submit.
(function () {
	var form = document.getElementById('contact-form');
	if (!form) { return; }
	var select = form.querySelector('select[name="package"]');
	var status = form.querySelector('.form-status');
	var button = form.querySelector('button[type="submit"]');

	document.querySelectorAll('[data-package]').forEach(function (link) {
		link.addEventListener('click', function () { select.value = link.getAttribute('data-package'); });
	});

	var params = new URLSearchParams(location.search);
	var source = params.get('utm_source') || params.get('ref');
	try {
		if (source && !sessionStorage.getItem('orniva_source')) { sessionStorage.setItem('orniva_source', source); }
		source = sessionStorage.getItem('orniva_source') || source;
	} catch (e) {}
	form.querySelector('input[name="source"]').value = source || (document.referrer && document.referrer.indexOf(location.host) === -1 ? 'referral' : 'direct');

	function fail(message) {
		form.classList.remove('is-sending');
		button.disabled = false;
		button.textContent = 'Send message';
		status.classList.add('is-error');
		status.innerHTML = message;
	}

	form.addEventListener('submit', function (e) {
		e.preventDefault();
		var missing = false;
		form.querySelectorAll('[required]').forEach(function (field) {
			var bad = !field.value.trim() || (field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(field.value.trim()));
			field.closest('.field').classList.toggle('is-invalid', bad);
			if (bad) { missing = true; }
		});
		if (missing) { fail('Please add your name, a valid work email and a short message.'); return; }

		var data = {};
		new FormData(form).forEach(function (value, key) { data[key] = value; });
		form.classList.add('is-sending');
		button.disabled = true;
		button.textContent = 'Sending…';
		status.classList.remove('is-error');
		status.textContent = '';

		var controller = window.AbortController ? new AbortController() : null;
		var timer = setTimeout(function () { if (controller) { controller.abort(); } }, 10000);
		fetch(form.action, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
			body: JSON.stringify(data),
			signal: controller ? controller.signal : undefined
		}).then(function (r) { return r.json(); }).then(function (res) {
			clearTimeout(timer);
			if (!res || res.success !== true) { throw new Error(res && res.error); }
			if (window.umami && typeof window.umami.track === 'function') {
				window.umami.track('form-submit', { brand: 'orniva', package: data.package, source: data.source });
			}
			form.classList.remove('is-sending');
			form.classList.add('is-sent');
			status.textContent = 'Thank you! We read every message and usually reply within two business days.';
		}).catch(function () {
			clearTimeout(timer);
			fail('We couldn’t send your message. Please email <a href="mailto:orniva@razzobusiness.com">orniva@razzobusiness.com</a>.');
		});
	});
})();
